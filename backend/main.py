import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv()

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EcoPulseBackend")

# Verify GEMINI_API_KEY is present
if not os.environ.get("GEMINI_API_KEY"):
    logger.warning("GEMINI_API_KEY is missing from environment! Agent operations will fail.")

from agent import get_climate_agent
from mcp_server import get_climate_metrics, calculate_carbon_footprint, search_climate_policies
from firebase_db import save_search_event, save_carbon_event
from kafka_streamer import init_kafka_producer, stop_kafka_producer, send_kafka_event, event_generator

app = FastAPI(title="EcoPulse Climate Intelligence Agent API")

@app.on_event("startup")
async def startup_event():
    await init_kafka_producer()

@app.on_event("shutdown")
async def shutdown_event():
    await stop_kafka_producer()

# Add CORS Middleware to enable communication with the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "EcoPulse Backend is running!",
        "description": "This is the API server for the EcoPulse Climate AI Agent. Hit /api/chat or use the React frontend dashboard.",
        "endpoints": {
            "root": "/",
            "health": "/health",
            "chat": "/api/chat",
            "metrics": "/api/metrics",
            "calculate": "/api/calculate",
            "policies": "/api/policies"
        }
    }

@app.get("/health")
def health_check():
    """Lightweight keepalive endpoint — ping this every 5 minutes to prevent Render cold starts."""
    return {"status": "ok"}

# Initialize the ADK agent runner
try:
    agent_runner = get_climate_agent()
    logger.info("ADK Climate Agent initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing ADK Climate Agent: {e}")
    agent_runner = None

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"
    user_id: str = "default_user"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not agent_runner:
        raise HTTPException(status_code=500, detail="Agent is not initialized. Check server logs.")
    
    # Verify API key
    if not os.environ.get("GEMINI_API_KEY"):
         # Return a friendly system error message to the user if no API key
         def mock_generator():
              err_msg = "### Environment Setup Needed\n\nPlease add your **GEMINI_API_KEY** in `backend/.env` file. You can get one from [Google AI Studio](https://aistudio.google.com/)."
              yield f"data: {json.dumps({'type': 'text', 'content': err_msg})}\n\n"
              yield "data: [DONE]\n\n"
         return StreamingResponse(mock_generator(), media_type="text/event-stream")

    async def event_stream_generator():
        try:
            from google.genai import types
            
            session_id = request.session_id
            user_id = request.user_id

            structured_message = types.Content(
                role="user",
                parts=[types.Part.from_text(text=request.message)]
            )
            
            # Use asynchronous runner execution to run on the main event loop and reuse the MCP process
            events = agent_runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=structured_message
            )
            
            async for event in events:
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        # Extract text response
                        if hasattr(part, 'text') and part.text:
                            yield f"data: {json.dumps({'type': 'text', 'content': part.text})}\n\n"
                        # Extract tool call indications
                        elif hasattr(part, 'function_call') and part.function_call:
                            tool_name = part.function_call.name
                            yield f"data: {json.dumps({'type': 'tool', 'content': f'Running tool: {tool_name}'})}\n\n"
            
            # Send done signal
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Exception during agent run: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream_generator(), media_type="text/event-stream")

# Direct data endpoints for dashboard widgets (bypassing conversational wrapper if needed)
@app.get("/api/metrics")
async def metrics_endpoint(location: str = "Bengaluru"):
    try:
        res = get_climate_metrics(location)
        save_search_event(location, res)
        await send_kafka_event("search", {"location": location, "metrics": res})
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calculate")
async def calculate_endpoint(transport_km: float = 0, electricity_kwh: float = 0, meals: int = 0):
    try:
        res = calculate_carbon_footprint(transport_km, electricity_kwh, meals)
        inputs = {"transport_km": transport_km, "electricity_kwh": electricity_kwh, "meals": meals}
        save_carbon_event(inputs, res)
        await send_kafka_event("calculate", {"inputs": inputs, "result": res})
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/policies")
def policies_endpoint(country: str = "India"):
    try:
        return search_climate_policies(country)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream/feed")
async def stream_feed_endpoint():
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Run uvicorn on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)

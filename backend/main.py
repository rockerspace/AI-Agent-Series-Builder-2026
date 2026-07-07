import os
import json
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

class TTSRequest(BaseModel):
    text: str
    language_code: str = "hi-IN"
    model: str = "bulbul:v3"

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

@app.post("/api/upload-bill")
async def upload_bill_endpoint(
    file: UploadFile = File(...),
    session_id: str = "default_session",
    user_id: str = "default_user"
):
    if not agent_runner:
        raise HTTPException(status_code=500, detail="Agent is not initialized. Check server logs.")
    
    try:
        content = await file.read()
        bill_text = content.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    prompt_message = f"Please analyze this utility bill document text, extract the electricity/gas usage, and autonomously calculate the carbon footprint using your tool. Here is the parsed bill text:\n\n{bill_text}"

    # Verify API key
    if not os.environ.get("GEMINI_API_KEY"):
         def mock_generator():
              err_msg = "### Environment Setup Needed\n\nPlease add your **GEMINI_API_KEY** in `backend/.env` file."
              yield f"data: {json.dumps({'type': 'text', 'content': err_msg})}\n\n"
              yield "data: [DONE]\n\n"
         return StreamingResponse(mock_generator(), media_type="text/event-stream")

    async def event_stream_generator():
        try:
            from google.genai import types
            
            structured_message = types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt_message)]
            )
            
            events = agent_runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=structured_message
            )
            
            async for event in events:
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            yield f"data: {json.dumps({'type': 'text', 'content': part.text})}\n\n"
                        elif hasattr(part, 'function_call') and part.function_call:
                            tool_name = part.function_call.name
                            yield f"data: {json.dumps({'type': 'tool', 'content': f'Running tool: {tool_name}'})}\n\n"
            
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

@app.get("/api/marketplace/solar")
def marketplace_solar_endpoint(location: str = "Mumbai", monthly_kwh: float = 250.0):
    try:
        from mcp_server import get_solar_marketplace_quotes
        return get_solar_marketplace_quotes(location, monthly_kwh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class IoTControlRequest(BaseModel):
    device_id: str = "nest-thermostat-1"
    target_temp: float

@app.get("/api/iot/status")
def iot_status_endpoint(device_id: str = "nest-thermostat-1"):
    try:
        from mcp_server import get_smart_device_status
        return get_smart_device_status(device_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/iot/control")
async def iot_control_endpoint(request: IoTControlRequest):
    try:
        from mcp_server import adjust_smart_thermostat
        res = adjust_smart_thermostat(request.device_id, request.target_temp)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        await send_kafka_event("iot_control", {
            "device_id": request.device_id,
            "target_temp": request.target_temp,
            "power_draw_kw": res["device"]["power_draw_kw"],
            "mode": res["device"]["mode"]
        })
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TriggerWarningRequest(BaseModel):
    location: str = "Mumbai"
    language_code: str = "hi-IN"
    mock_aqi: int = 165

@app.post("/api/warnings/trigger")
async def trigger_warning_endpoint(request: TriggerWarningRequest):
    try:
        metrics = get_climate_metrics(request.location)
    except Exception:
        metrics = {"temperature": "N/A", "air_quality_index": request.mock_aqi, "weather_summary": "High Pollution"}
        
    metrics['air_quality_index'] = request.mock_aqi
    
    prompt = (
        f"You are the Urban Ecologist. Draft a critical climate warning alert message in the language code '{request.language_code}' "
        f"for the city of {request.location} because the Air Quality Index (AQI) has reached {request.mock_aqi}. "
        f"Keep the message under 2 sentences, urgent, and direct. Do not use any markdown formatting."
    )
    
    warning_text = f"Climate Alert: High Air Pollution detected in {request.location}. Current AQI is {request.mock_aqi}."
    
    if os.environ.get("GEMINI_API_KEY"):
        try:
            from google.genai import Client
            client = Client()
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response.text:
                warning_text = response.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate warning text: {e}")
            
    warning_payload = {
        "location": request.location,
        "aqi": request.mock_aqi,
        "warning_text": warning_text
    }
    
    from kafka_streamer import send_kafka_event
    await send_kafka_event("warning", warning_payload)
    return {"status": "triggered", "payload": warning_payload}

@app.get("/api/stream/feed")
async def stream_feed_endpoint():
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ── Sarvam AI — Text to Speech ──
@app.post("/api/voice/tts")
async def text_to_speech_endpoint(request: TTSRequest):
    sarvam_key = os.environ.get("SARVAM_API_KEY", "")
    if not sarvam_key:
        return {
            "status": "demo",
            "message": "Add SARVAM_API_KEY to .env for real audio synthesis",
            "audio_base64": None
        }

    import httpx
    headers = {
        "api-subscription-key": sarvam_key,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": [request.text],
        "target_language_code": request.language_code,
        "model": request.model,
        "enable_preprocessing": True
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers=headers,
            json=payload,
            timeout=30
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Sarvam AI TTS service error")
        data = resp.json()
        return {
            "status": "success",
            "audio_base64": data.get("audios", [None])[0]
        }

# ── Sarvam AI — Speech to Text ──
@app.post("/api/voice/stt")
async def speech_to_text_endpoint(
    audio: UploadFile = File(...),
    language_code: str = "hi-IN",
    model: str = "saaras:v3"
):
    sarvam_key = os.environ.get("SARVAM_API_KEY", "")
    if not sarvam_key:
        return {
            "status": "demo",
            "message": "Add SARVAM_API_KEY to .env for real speech recognition",
            "transcript": "Hello EcoPulse, how can I reduce my carbon footprint?"
        }

    import httpx
    audio_content = await audio.read()
    headers = {"api-subscription-key": sarvam_key}
    files = {"file": (audio.filename or "recording.wav", audio_content, audio.content_type or "audio/wav")}
    data = {"language_code": language_code, "model": model, "mode": "transcribe"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Sarvam AI STT service error")
        data_resp = resp.json()
        return {
            "status": "success",
            "transcript": data_resp.get("transcript", "")
        }

if __name__ == "__main__":
    import uvicorn
    # Run uvicorn on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)

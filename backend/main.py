import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    language_code: str = Field("hi-IN", pattern="^(hi-IN|ta-IN|te-IN|bn-IN|kn-IN|ml-IN|en-US)$")
    model: str = Field("bulbul:v3", pattern="^(bulbul:v3|saaras:v3)$")

from config import settings

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EcoPulseBackend")

# Verify GEMINI_API_KEY is present
if not settings.gemini_api_key:
    logger.warning("GEMINI_API_KEY is missing from config settings! Agent operations will fail.")
else:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key

if settings.sarvam_api_key:
    os.environ["SARVAM_API_KEY"] = settings.sarvam_api_key

# Disable GCE metadata server check to force AI Studio API Key authentication on Cloud Run
os.environ["NO_GCE_CHECK"] = "true"
os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)

from agent import get_climate_agent
from exceptions import (
    AgentNotInitializedException,
    EcoPulseException,
    FileProcessingException,
    GeocodingServiceException,
    LocationNotFoundException,
    register_exception_handlers,
)
from firebase_db import save_carbon_event, save_search_event
from kafka_streamer import (
    event_generator,
    init_kafka_producer,
    send_kafka_event,
    stop_kafka_producer,
)
from mcp_server import (
    calculate_carbon_footprint,
    get_climate_metrics,
    search_climate_policies,
)

# ─── Service state (populated during lifespan startup) ───────────────────────
_agent_runner = None
_startup_time: float = 0.0
_kafka_mode: str = "unknown"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan — replaces deprecated @app.on_event handlers."""
    global _agent_runner, _startup_time, _kafka_mode
    # ── STARTUP ──────────────────────────────────────────────────────────────
    _startup_time = time.time()
    try:
        await init_kafka_producer()
        _kafka_mode = "live"
    except Exception as exc:
        logger.warning("Kafka producer failed to start: %s — running in mock mode.", exc)
        _kafka_mode = "mock"

    try:
        _agent_runner = get_climate_agent()
        logger.info("ADK Climate Agent initialized successfully.")
    except Exception as exc:
        logger.error("Error initializing ADK Climate Agent: %s", exc)
        _agent_runner = None

    yield  # application is now running

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    await stop_kafka_producer()
    logger.info("EcoPulse backend shut down cleanly.")


app = FastAPI(
    title="EcoPulse Climate Intelligence Agent API",
    version="2.0.0",
    description="Agentic climate intelligence platform powered by Google ADK & MCP",
    lifespan=lifespan,
)
register_exception_handlers(app)

# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def read_root():
    return {
        "status": "EcoPulse Backend is running!",
        "description": "EcoPulse Climate AI Agent API. Use /api/chat or the React dashboard.",
        "endpoints": {
            "root": "/",
            "health": "/health",
            "chat": "/api/chat",
            "metrics": "/api/metrics",
            "calculate": "/api/calculate",
            "policies": "/api/policies",
        },
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health probe used by Cloud Run, Docker, and CI pipelines."""
    uptime_seconds = round(time.time() - _startup_time, 1) if _startup_time else 0
    healthy = _agent_runner is not None
    payload = {
        "status": "ok" if healthy else "degraded",
        "agent_ready": healthy,
        "kafka_mode": _kafka_mode,
        "uptime_seconds": uptime_seconds,
        "version": "2.0.0",
        "environment": os.getenv("ENV", "development"),
    }
    status_code = 200 if healthy else 503
    return JSONResponse(content=payload, status_code=status_code)


# ── Expose agent runner to route handlers ─────────────────────────────────────
def get_agent_runner():
    """Return the module-level agent runner (set during lifespan startup)."""
    return _agent_runner


# Backwards-compatible alias used in legacy route handlers
agent_runner = None  # will be lazily replaced by get_agent_runner() calls

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    session_id: str = Field("default_session", min_length=1, max_length=100, pattern="^[a-zA-Z0-9_\\-]+$")
    user_id: str = Field("default_user", min_length=1, max_length=100, pattern="^[a-zA-Z0-9_\\-]+$")

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        sanitized = re.sub(r'<[^>]*>', '', v)
        if not sanitized.strip():
            raise ValueError("Message cannot be empty or solely whitespace.")
        return sanitized

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    agent_runner = get_agent_runner()
    if not agent_runner:
        raise AgentNotInitializedException()
    
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
    agent_runner = get_agent_runner()
    if not agent_runner:
        raise AgentNotInitializedException()
    
    try:
        content = await file.read()
        bill_text = content.decode("utf-8", errors="ignore")
    except Exception as e:
        raise FileProcessingException(str(e))

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
async def metrics_endpoint(
    location: str = Query(
        "Bengaluru",
        min_length=2,
        max_length=100,
        pattern="^[a-zA-Z\\s,\\-\\.]+$"
    )
):
    try:
        res = get_climate_metrics(location)
        save_search_event(location, res)
        await send_kafka_event("search", {"location": location, "metrics": res})
        return res
    except ValueError as e:
        logger.warning(f"City not found: {e!s}")
        raise LocationNotFoundException(location)
    except ConnectionError as e:
        logger.error(f"Geocoding API network error: {e!s}")
        raise GeocodingServiceException(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in metrics: {e!s}")
        raise EcoPulseException(str(e))

@app.get("/api/calculate")
async def calculate_endpoint(
    transport_km: float = Query(0.0, ge=0.0, le=100000.0),
    electricity_kwh: float = Query(0.0, ge=0.0, le=100000.0),
    meals: int = Query(0, ge=0, le=10000)
):
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

from fastapi.responses import FileResponse


class SubsidyFormRequest(BaseModel):
    location: str
    monthly_kwh: float
    applicant_name: str = "Narendra Venkatesan"

class BlockchainRegisterRequest(BaseModel):
    user_id: str = "default_user"
    impact_type: str
    metric_value: float

@app.post("/api/policy/generate-pdf")
def generate_pdf_endpoint(request: SubsidyFormRequest):
    try:
        from mcp_server import generate_subsidy_form
        res = generate_subsidy_form(request.location, request.monthly_kwh, request.applicant_name)
        if "error" in res:
            raise HTTPException(status_code=500, detail=res["error"])
        return FileResponse(
            path=res["pdf_path"],
            filename="eco_subsidy_form.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/register")
async def register_blockchain_endpoint(request: BlockchainRegisterRequest):
    try:
        from mcp_server import register_green_impact_onchain
        res = register_green_impact_onchain(request.user_id, request.impact_type, request.metric_value)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        await send_kafka_event("blockchain_impact", {
            "user_id": request.user_id,
            "impact_type": request.impact_type,
            "metric_value": request.metric_value,
            "tx_hash": res["transaction_hash"],
            "blockchain": res["blockchain"]
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

# ── Enterprise OS — Real-Time Telemetry & Scope 1-3 Compliance ──

class EnterpriseScopeAuditRequest(BaseModel):
    company_name: str = Field("EcoPulse Enterprise Inc.", min_length=1, max_length=100)
    location: str = Field("Bengaluru", min_length=1, max_length=100)
    scope1_direct_fuel_liters: float = Field(..., ge=0)
    scope2_electricity_kwh: float = Field(..., ge=0)
    scope3_logistics_ton_km: float = Field(..., ge=0)

class EnterpriseDemandResponseRequest(BaseModel):
    facility_id: str = Field("FACILITY-BLR-01", min_length=1, max_length=50)
    mode: str = Field("AUTO", pattern="^(AUTO|ECO_MAX|NORMAL)$")

@app.get("/api/enterprise/telemetry", tags=["Enterprise"])
def get_enterprise_telemetry_endpoint(location: str = "Bengaluru"):
    from mcp_server import (
        get_grid_carbon_intensity_telemetry,
        get_live_iot_sensor_telemetry,
        get_satellite_emission_plume_telemetry,
    )
    iot = get_live_iot_sensor_telemetry(location)
    satellite = get_satellite_emission_plume_telemetry(f"{location} Industrial District")
    grid = get_grid_carbon_intensity_telemetry("IN-KA")
    return {
        "status": "success",
        "location": location,
        "iot_sensor_telemetry": iot,
        "satellite_plume_telemetry": satellite,
        "grid_carbon_telemetry": grid
    }

@app.post("/api/enterprise/scope-audit", tags=["Enterprise"])
def enterprise_scope_audit_endpoint(req: EnterpriseScopeAuditRequest):
    from mcp_server import calculate_enterprise_scope_emissions
    audit = calculate_enterprise_scope_emissions(
        req.scope1_direct_fuel_liters,
        req.scope2_electricity_kwh,
        req.scope3_logistics_ton_km
    )
    audit["company_name"] = req.company_name
    audit["location"] = req.location
    return audit

@app.post("/api/enterprise/generate-csrd-pdf", tags=["Enterprise"])
def generate_csrd_pdf_endpoint(req: EnterpriseScopeAuditRequest):
    from mcp_server import generate_enterprise_csrd_report
    res = generate_enterprise_csrd_report(
        req.company_name,
        req.location,
        req.scope1_direct_fuel_liters,
        req.scope2_electricity_kwh,
        req.scope3_logistics_ton_km
    )
    if "pdf_path" in res and os.path.exists(res["pdf_path"]):
        return StreamingResponse(
            open(res["pdf_path"], "rb"),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={os.path.basename(res['pdf_path'])}"}
        )
    raise HTTPException(status_code=500, detail="Failed to generate CSRD compliance PDF")

@app.post("/api/enterprise/demand-response", tags=["Enterprise"])
def enterprise_demand_response_endpoint(req: EnterpriseDemandResponseRequest):
    from mcp_server import dispatch_grid_demand_response
    res = dispatch_grid_demand_response(req.facility_id, req.mode)
    return res

if __name__ == "__main__":
    import uvicorn
    # Run uvicorn on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)


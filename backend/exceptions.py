from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class EcoPulseException(Exception):
    """Base exception class for all EcoPulse application errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class AgentNotInitializedException(EcoPulseException):
    """Raised when the Gemini ADK Agent is not properly initialized."""
    def __init__(self, message: str = "The EcoPulse AI Agent is not initialized. Please verify backend API credentials."):
        super().__init__(message, status_code=500, error_code="AGENT_NOT_READY")

class LocationNotFoundException(EcoPulseException):
    """Raised when a geocoding location lookup fails to find matching coordinates."""
    def __init__(self, location: str):
        super().__init__(
            message=f"Location '{location}' not found in global databases.",
            status_code=404,
            error_code="LOCATION_NOT_FOUND"
        )

class GeocodingServiceException(EcoPulseException):
    """Raised when geocoding external services (Open-Meteo, OSM) are unreachable."""
    def __init__(self, details: str):
        super().__init__(
            message=f"Geocoding service connection failed: {details}",
            status_code=503,
            error_code="GEOCODING_SERVICE_UNAVAILABLE"
        )

class FileProcessingException(EcoPulseException):
    """Raised when a utility bill document uploaded is unparseable or corrupted."""
    def __init__(self, details: str):
        super().__init__(
            message=f"Failed to process utility bill: {details}",
            status_code=400,
            error_code="INVALID_FILE_FORMAT"
        )

class ExternalServiceException(EcoPulseException):
    """Raised when external voice translation or TTS/STT APIs (e.g. Sarvam AI) fail."""
    def __init__(self, service_name: str, status_code: int = 502):
        super().__init__(
            message=f"External service '{service_name}' returned a failure state.",
            status_code=status_code,
            error_code="EXTERNAL_SERVICE_FAILURE"
        )

class InvalidDeviceActionException(EcoPulseException):
    """Raised when an invalid command is sent to Nest IoT thermostats."""
    def __init__(self, details: str):
        super().__init__(
            message=f"Invalid smart device command: {details}",
            status_code=400,
            error_code="DEVICE_CONTROL_FAILED"
        )

def register_exception_handlers(app: FastAPI):
    """Registers global exception handlers to capture EcoPulse custom exceptions."""
    @app.exception_handler(EcoPulseException)
    async def ecopulse_exception_handler(request: Request, exc: EcoPulseException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "status": exc.status_code
                }
            }
        )

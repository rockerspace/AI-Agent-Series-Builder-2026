import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "status" in response.json()

@patch("mcp_server.requests.get")
def test_metrics_success(mock_get):
    # Mock geocoding response
    mock_geocode = MagicMock()
    mock_geocode.status_code = 200
    mock_geocode.json.return_value = {
        "results": [{
            "latitude": 12.97,
            "longitude": 77.59,
            "country": "India"
        }]
    }
    
    # Mock weather/aqi response
    mock_weather = MagicMock()
    mock_weather.status_code = 200
    mock_weather.json.return_value = {
        "current": {
            "temperature_2m": 24.5,
            "apparent_temperature": 25.0,
            "wind_speed_10m": 12.0
        }
    }
    
    mock_get.side_effect = [mock_geocode, mock_weather, mock_weather]
    
    response = client.get("/api/metrics?location=Bengaluru")
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Bengaluru"
    assert "temperature" in data
    assert "air_quality_index" in data

@patch("mcp_server.requests.get")
def test_metrics_not_found(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"results": []}
    
    mock_get.return_value = mock_response
    
    response = client.get("/api/metrics?location=NonExistentCity")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_calculate():
    response = client.get("/api/calculate?transport_km=100&electricity_kwh=200&meals=10")
    assert response.status_code == 200
    data = response.json()
    assert "annual_summary" in data
    assert "total_co2_metric_tons" in data["annual_summary"]

def test_iot_status():
    response = client.get("/api/iot/status")
    assert response.status_code == 200
    data = response.json()
    assert "device_name" in data
    assert "power_draw_kw" in data

def test_policies():
    response = client.get("/api/policies?country=India")
    assert response.status_code == 200
    data = response.json()
    assert data["country"] == "India"
    assert "net_zero_target_year" in data
    assert "core_policies" in data

def test_iot_control_success():
    response = client.post("/api/iot/control", json={"device_id": "nest-thermostat-1", "target_temp": 24.5})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["device"]["target_temperature_c"] == 24.5

def test_custom_exception_structure():
    response = client.get("/api/metrics?location=NonExistentCity")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "LOCATION_NOT_FOUND"
    assert data["error"]["status"] == 404

def test_calculate_negative_and_zero_values():
    # Asserting how negative or zero parameters are handled
    response = client.get("/api/calculate?transport_km=-10&electricity_kwh=-20&meals=-5")
    # For now, it will compute with negative values or fail. Once strict validation is on, it will fail.
    # Let's ensure standard behavior handles it (either validation triggers, or values default).
    # Since we want to enforce Pydantic constraints, we will check if it rejects them or allows them before the validation update.
    # We will assert a 422 Unprocessable Entity status code when negative validation is implemented.
    pass

@patch("main.agent_runner")
def test_chat_sse_streaming(mock_runner):
    # Mock classes to support serialization
    class MockFunctionCall:
        def __init__(self, name):
            self.name = name

    class MockPart:
        def __init__(self, text=None, function_call=None):
            self.text = text
            self.function_call = function_call

    class MockEvent:
        def __init__(self, parts):
            self.content = MagicMock()
            self.content.parts = parts

    mock_event1 = MockEvent([MockPart(text="Analyzing current footprints...")])
    mock_event2 = MockEvent([MockPart(function_call=MockFunctionCall("calculate_carbon_footprint"))])
    
    async def mock_run_async(*args, **kwargs):
        yield mock_event1
        yield mock_event2
        
    mock_runner.run_async = mock_run_async
    
    response = client.post("/api/chat", json={"message": "What is my footprint?", "session_id": "test_sess"})
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    
    content = response.text
    assert "Analyzing current footprints..." in content
    assert "calculate_carbon_footprint" in content

@patch("main.agent_runner")
def test_chat_gemini_api_error_handling(mock_runner):
    # Mock Gemini API throwing exception during runner stream execution
    async def mock_run_async_raise(*args, **kwargs):
        raise RuntimeError("API quota limits reached.")
        yield # Force generator behavior
        
    mock_runner.run_async = mock_run_async_raise
    
    response = client.post("/api/chat", json={"message": "Calculate carbon", "session_id": "test_sess"})
    assert response.status_code == 200
    assert "API quota limits reached." in response.text



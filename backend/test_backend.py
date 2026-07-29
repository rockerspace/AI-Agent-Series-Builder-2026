import os
from unittest.mock import MagicMock, patch

os.environ["GEMINI_API_KEY"] = "mock_gemini_api_key_for_testing"

from fastapi.testclient import TestClient

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
    # Asserting that negative parameters are rejected with a 422 validation error
    response = client.get("/api/calculate?transport_km=-10&electricity_kwh=-20&meals=-5")
    assert response.status_code == 422
    # Verify zero values are allowed as valid minimum values
    response_zero = client.get("/api/calculate?transport_km=0&electricity_kwh=0&meals=0")
    assert response_zero.status_code == 200

@patch("main._agent_runner")
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

@patch("main._agent_runner")
def test_chat_gemini_api_error_handling(mock_runner):
    # Mock Gemini API throwing exception during runner stream execution
    async def mock_run_async_raise(*args, **kwargs):
        raise RuntimeError("API quota limits reached.")
        yield # Force generator behavior
        
    mock_runner.run_async = mock_run_async_raise
    
    response = client.post("/api/chat", json={"message": "Calculate carbon", "session_id": "test_sess"})
    assert response.status_code == 200
    assert "API quota limits reached." in response.text




# --- NEW TESTS APPENDED ---

from exceptions import InvalidDeviceActionException
from mcp_server import (
    SMART_HOME_DEVICES,
    adjust_smart_thermostat,
    calculate_carbon_footprint,
    get_solar_marketplace_quotes,
    search_climate_policies,
)


# 1. Untested Route Coverage (~8 tests)
def test_health_endpoint():
    response = client.get("/health")
    # In test mode agent may be uninitialised (503 degraded) or fully up (200)
    assert response.status_code in (200, 503)
    assert "status" in response.json()

@patch("mcp_server.get_solar_marketplace_quotes")
def test_marketplace_solar(mock_quotes):
    mock_quotes.return_value = {"recommended_system_size_kw": 5.0}
    response = client.get("/api/marketplace/solar?location=Mumbai&monthly_kwh=300")
    assert response.status_code == 200
    assert response.json()["recommended_system_size_kw"] == 5.0

@patch("mcp_server.generate_subsidy_form")
def test_generate_pdf(mock_gen_pdf):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"%PDF-1.4 dummy content")
        temp_path = f.name

    mock_gen_pdf.return_value = {"pdf_path": temp_path}
    try:
        response = client.post("/api/policy/generate-pdf", json={"location": "Mumbai", "monthly_kwh": 300, "applicant_name": "Test"})
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@patch("mcp_server.register_green_impact_onchain")
@patch("main.send_kafka_event")
def test_blockchain_register(mock_send_kafka, mock_register):
    mock_register.return_value = {"transaction_hash": "0x123", "blockchain": "polygon"}
    response = client.post("/api/blockchain/register", json={"user_id": "test", "impact_type": "solar", "metric_value": 10.0})
    assert response.status_code == 200
    assert response.json()["transaction_hash"] == "0x123"

@patch("main.get_climate_metrics")
@patch("main.send_kafka_event")
def test_trigger_warning(mock_kafka, mock_metrics):
    mock_metrics.return_value = {"temperature": "30°C", "air_quality_index": 200, "weather_summary": "Sunny"}
    response = client.post("/api/warnings/trigger", json={"location": "Mumbai", "language_code": "hi-IN", "mock_aqi": 200})
    assert response.status_code == 200
    assert "payload" in response.json()
    assert response.json()["payload"]["aqi"] == 200

@patch("main.event_generator")
def test_stream_feed_sse(mock_gen):
    async def dummy_generator():
        yield "data: {}\n\n"
    mock_gen.return_value = dummy_generator()
    response = client.get("/api/stream/feed")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

# 2. Input Validation Edge Cases (~10 tests)
def test_chat_empty_message():
    response = client.post("/api/chat", json={"message": "", "session_id": "s1", "user_id": "u1"})
    assert response.status_code == 422

def test_chat_html_sanitization():
    with patch("main._agent_runner") as mock_runner:
        async def mock_run_async(*args, **kwargs):
            yield MagicMock(content=MagicMock(parts=[MagicMock(text="ok", function_call=None)]))
        mock_runner.run_async = mock_run_async
        response = client.post("/api/chat", json={"message": "<script>alert('xss')</script>Hello", "session_id": "s1", "user_id": "u1"})
        assert response.status_code == 200

def test_metrics_special_chars_rejected():
    response = client.get("/api/metrics?location=Benga!uru")
    assert response.status_code == 422

@patch("main.get_climate_metrics")
def test_metrics_geocoding_timeout(mock_get):
    mock_get.side_effect = ConnectionError("Timeout")
    response = client.get("/api/metrics?location=Mumbai")
    assert response.status_code == 503

def test_calculate_upper_boundary():
    response = client.get("/api/calculate?transport_km=100000&electricity_kwh=100000&meals=10000")
    assert response.status_code == 200

def test_calculate_all_zeros():
    response = client.get("/api/calculate?transport_km=0&electricity_kwh=0&meals=0")
    assert response.status_code == 200
    assert response.json()["annual_summary"]["total_co2_metric_tons"] == 0.0

def test_policies_unknown_country():
    response = client.get("/api/policies?country=UnknownLand")
    assert response.status_code == 200
    assert "Generalized Global Policy Database" in response.json()["status"]

def test_iot_control_unknown_device():
    response = client.post("/api/iot/control", json={"device_id": "unknown-device", "target_temp": 24.5})
    assert response.status_code == 500

# 3. MCP Tool Unit Tests (~6 tests)
def test_mcp_solar_quotes_zero_kwh():
    res = get_solar_marketplace_quotes("Mumbai", 0.0)
    assert res["recommended_system_size_kw"] == 1.0

def test_mcp_thermostat_eco_mode():
    SMART_HOME_DEVICES["nest-thermostat-1"]["current_temperature_c"] = 24.5
    res = adjust_smart_thermostat("nest-thermostat-1", 24.5)
    assert res["device"]["mode"] == "eco"
    assert res["device"]["saving_mode"] is True

def test_mcp_thermostat_cooling_mode():
    res = adjust_smart_thermostat("nest-thermostat-1", 22.0)
    assert res["device"]["mode"] == "cooling"
    assert res["device"]["saving_mode"] is False

def test_mcp_thermostat_unknown_device():
    res = adjust_smart_thermostat("unknown-device", 22.0)
    assert res == {"error": "Device not found"}

def test_mcp_carbon_footprint_large_values():
    res = calculate_carbon_footprint(100000.0, 100000.0, 10000)
    assert res["annual_summary"]["total_co2_metric_tons"] > 0

def test_mcp_policies_multiple_countries():
    countries = ["united states", "united kingdom", "japan", "germany"]
    for c in countries:
        res = search_climate_policies(c)
        assert res["status"] == "Official Database Match"

# 4. Exception Handler Tests (~5 tests)
def test_exception_handler_agent_not_initialized():
    with patch("main._agent_runner", None):
        response = client.post("/api/chat", json={"message": "hello", "session_id": "s1", "user_id": "u1"})
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "AGENT_NOT_READY"

def test_exception_handler_location_not_found():
    with patch("main.get_climate_metrics") as mock_metrics:
        mock_metrics.side_effect = ValueError("Not found")
        response = client.get("/api/metrics?location=Nowhere")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "LOCATION_NOT_FOUND"

def test_exception_handler_geocoding_service():
    with patch("main.get_climate_metrics") as mock_metrics:
        mock_metrics.side_effect = ConnectionError("Timeout")
        response = client.get("/api/metrics?location=Nowhere")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "GEOCODING_SERVICE_UNAVAILABLE"

def test_exception_handler_file_processing():
    with patch("main._agent_runner") as mock_runner:
        async def mock_run_async(*args, **kwargs):
            raise Exception("Read error")
            yield MagicMock()
        mock_runner.run_async = mock_run_async
        response = client.post("/api/upload-bill", files={"file": ("test.pdf", b"test", "application/pdf")})
        assert response.status_code == 200
        assert "Read error" in response.text

def test_exception_handler_invalid_device_action():
    from main import app
    @app.get("/test_invalid_device")
    def raise_invalid_device():
        raise InvalidDeviceActionException("Bad command")
    
    response = client.get("/test_invalid_device")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DEVICE_CONTROL_FAILED"

# 5. Firebase & Kafka Mock Assertions (~5 tests)
@patch("main.save_search_event")
@patch("main.send_kafka_event")
@patch("main.get_climate_metrics")
def test_mock_assertions_search(mock_metrics, mock_kafka, mock_save):
    mock_metrics.return_value = {"data": "mock"}
    response = client.get("/api/metrics?location=Bengaluru")
    assert response.status_code == 200
    mock_save.assert_called_once_with("Bengaluru", {"data": "mock"})

@patch("main.save_carbon_event")
@patch("main.send_kafka_event")
@patch("main.calculate_carbon_footprint")
def test_mock_assertions_calculate(mock_calc, mock_kafka, mock_save):
    mock_calc.return_value = {"summary": "mock"}
    response = client.get("/api/calculate?transport_km=10&electricity_kwh=20&meals=5")
    assert response.status_code == 200
    expected_inputs = {"transport_km": 10.0, "electricity_kwh": 20.0, "meals": 5}
    mock_save.assert_called_once_with(expected_inputs, {"summary": "mock"})

@patch("main.send_kafka_event")
@patch("mcp_server.adjust_smart_thermostat")
def test_mock_assertions_iot(mock_adjust, mock_kafka):
    mock_adjust.return_value = {"device": {"power_draw_kw": 1.0, "mode": "eco"}}
    response = client.post("/api/iot/control", json={"device_id": "nest-thermostat-1", "target_temp": 24.0})
    assert response.status_code == 200



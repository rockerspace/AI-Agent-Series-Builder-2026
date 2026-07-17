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

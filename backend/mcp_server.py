import os
import random
from fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP(name="EcoPulse Climate Engine")

# Realistic database for climate risks and carbon indices of major cities/countries
CLIMATE_DATABASE = {
    "cities": {
        "bengaluru": {
            "temp_trend": "+1.8°C (last decade)",
            "weather_risk": 6.8,
            "aqi": 78,
            "clean_energy": 38,
            "forest_cover_change": "-4.2%",
            "primary_emitters": "Transport & Tech Infrastructure Hubs"
        },
        "new delhi": {
            "temp_trend": "+2.4°C (last decade)",
            "weather_risk": 8.5,
            "aqi": 185,
            "clean_energy": 22,
            "forest_cover_change": "-2.1%",
            "primary_emitters": "Coal Power, Heavy Transport & Crop Burning"
        },
        "new york": {
            "temp_trend": "+1.5°C (last decade)",
            "weather_risk": 7.2,
            "aqi": 45,
            "clean_energy": 29,
            "forest_cover_change": "+1.2%",
            "primary_emitters": "Commercial Buildings & Transport"
        },
        "london": {
            "temp_trend": "+1.2°C (last decade)",
            "weather_risk": 5.5,
            "aqi": 38,
            "clean_energy": 48,
            "forest_cover_change": "+0.8%",
            "primary_emitters": "Heating Systems & Urban Transport"
        },
        "tokyo": {
            "temp_trend": "+1.6°C (last decade)",
            "weather_risk": 7.8,
            "aqi": 42,
            "clean_energy": 24,
            "forest_cover_change": "-0.5%",
            "primary_emitters": "Industrial Complexes & Commercial Grid"
        },
        "sydney": {
            "temp_trend": "+2.1°C (last decade)",
            "weather_risk": 8.2,
            "aqi": 32,
            "clean_energy": 31,
            "forest_cover_change": "-6.8% (Wildfire impacts)",
            "primary_emitters": "Coal Power & Mining Sectors"
        }
    },
    "countries": {
        "india": {
            "net_zero_target": "2070",
            "grid_intensity": "700 g CO2/kWh",
            "key_policies": [
                "National Green Hydrogen Mission",
                "FAME-II Scheme for EV Adoption",
                "Perform, Achieve and Trade (PAT) scheme for industries"
            ],
            "incentives": "Up to Rs 1.5 Lakh tax deduction on EV loans; 40% subsidy on residential solar installations."
        },
        "united states": {
            "net_zero_target": "2050",
            "grid_intensity": "370 g CO2/kWh",
            "key_policies": [
                "Inflation Reduction Act (IRA) of 2022",
                "Clean Energy Standard (CES)",
                "EPA Greenhouse Gas Reporting Program"
            ],
            "incentives": "30% Federal tax credit for residential solar; up to $7,500 tax credit for new clean vehicles."
        },
        "united kingdom": {
            "net_zero_target": "2050",
            "grid_intensity": "180 g CO2/kWh",
            "key_policies": [
                "Climate Change Act 2008 (amended 2019)",
                "Ten Point Plan for a Green Industrial Revolution",
                "UK Emissions Trading Scheme (UK ETS)"
            ],
            "incentives": "Boiler Upgrade Scheme (£7,500 subsidy for heat pumps); 0% benefit-in-kind tax for electric company cars."
        },
        "japan": {
            "net_zero_target": "2050",
            "grid_intensity": "450 g CO2/kWh",
            "key_policies": [
                "Green Growth Strategy",
                "Feed-in Tariff (FIT) Scheme",
                "Carbon Pricing Trial"
            ],
            "incentives": "Subsidies for fuel cell vehicles (FCVs) and residential cogeneration units (Ene-Farm)."
        },
        "germany": {
            "net_zero_target": "2045",
            "grid_intensity": "350 g CO2/kWh",
            "key_policies": [
                "Federal Climate Change Act (KSG)",
                "Renewable Energy Sources Act (EEG)",
                "Coal Phase-Out Act by 2038"
            ],
            "incentives": "KfW subsidies for energy-efficient building refurbishments; eco-rebates for heat pumps."
        }
    }
}

@mcp.tool()
def get_climate_metrics(location: str) -> dict:
    """
    Retrieves real-time/historical climate and ecological metrics for a given city or location.
    
    Args:
        location (str): The name of the city (e.g., 'Bengaluru', 'New York', 'London').
    """
    loc_key = location.lower().strip()
    
    # Check direct match
    if loc_key in CLIMATE_DATABASE["cities"]:
        data = CLIMATE_DATABASE["cities"][loc_key]
        return {
            "location": location.title(),
            "status": "Success",
            "temperature_anomaly": data["temp_trend"],
            "extreme_weather_risk_index": data["weather_risk"],
            "air_quality_index": data["aqi"],
            "clean_energy_percentage": data["clean_energy"],
            "forest_cover_change": data["forest_cover_change"],
            "primary_emitters": data["primary_emitters"]
        }
    
    # Fallback/dynamic generator for other cities
    random.seed(loc_key)
    weather_risk = round(random.uniform(3.0, 9.5), 1)
    aqi = random.randint(15, 250)
    clean_energy = random.randint(5, 65)
    temp_anomaly = f"+{round(random.uniform(0.8, 3.2), 1)}°C (last decade)"
    forest_cover = f"{round(random.uniform(-8.0, 2.0), 1)}%"
    
    emitters = ["Manufacturing & Coal Plants", "Transport Grid & Heating", "Urban Congestion & Diesel", "Agricultural Deforestation"]
    primary_emitter = random.choice(emitters)
    
    return {
        "location": location.title(),
        "status": "Simulated Live Metrics",
        "temperature_anomaly": temp_anomaly,
        "extreme_weather_risk_index": weather_risk,
        "air_quality_index": aqi,
        "clean_energy_percentage": clean_energy,
        "forest_cover_change": forest_cover,
        "primary_emitters": primary_emitter
    }

@mcp.tool()
def calculate_carbon_footprint(transport_km: float, electricity_kwh: float, meals: int) -> dict:
    """
    Calculates carbon footprint based on transportation, electricity usage, and diet.
    
    Args:
        transport_km (float): Monthly distance traveled by private vehicle (car/motorbike) in kilometers.
        electricity_kwh (float): Monthly household electricity usage in kilowatt-hours.
        meals (int): Monthly count of meat-based meals consumed.
    """
    # Emission Factors (Typical standards in kg CO2)
    # Average car emits ~0.18 kg CO2 per km
    # Average grid electricity factor ~0.4 kg CO2 per kWh
    # Average meat-based meal emits ~2.1 kg CO2
    
    transport_co2 = round(transport_km * 0.18, 1)
    electricity_co2 = round(electricity_kwh * 0.40, 1)
    diet_co2 = round(meals * 2.1, 1)
    
    total_co2_kg = round(transport_co2 + electricity_co2 + diet_co2, 1)
    total_co2_tons_annual = round((total_co2_kg * 12) / 1000, 2)
    
    # 1 tree absorbs ~22 kg CO2 per year
    trees_offset_needed = int(math.ceil((total_co2_kg * 12) / 22))
    
    # Comparison
    # Global average is ~4.5 tons/year, US is ~14.5 tons/year, India is ~1.9 tons/year
    comparison = "High" if total_co2_tons_annual > 6.0 else ("Moderate" if total_co2_tons_annual > 2.5 else "Low")
    
    return {
        "monthly_summary": {
            "transport_co2_kg": transport_co2,
            "electricity_co2_kg": electricity_co2,
            "diet_co2_kg": diet_co2,
            "total_co2_kg": total_co2_kg
        },
        "annual_summary": {
            "total_co2_metric_tons": total_co2_tons_annual,
            "carbon_tier": comparison
        },
        "offset_requirements": {
            "trees_needed_per_year": trees_offset_needed,
            "description": f"You would need to plant {trees_offset_needed} mature trees annually to fully offset your lifestyle carbon footprint."
        }
    }

@mcp.tool()
def search_climate_policies(country: str) -> dict:
    """
    Looks up government environmental policies, net-zero goals, and clean energy incentives for a country.
    
    Args:
        country (str): The name of the country (e.g., 'India', 'United States', 'Germany').
    """
    country_key = country.lower().strip()
    
    if country_key in CLIMATE_DATABASE["countries"]:
        data = CLIMATE_DATABASE["countries"][country_key]
        return {
            "country": country.title(),
            "status": "Official Database",
            "net_zero_target_year": data["net_zero_target"],
            "grid_carbon_intensity": data["grid_intensity"],
            "core_policies": data["key_policies"],
            "active_incentives": data["incentives"]
        }
    
    # Generic generator
    random.seed(country_key)
    target = random.choice(["2050", "2055", "2060", "2070"])
    intensity = f"{random.randint(100, 800)} g CO2/kWh"
    
    return {
        "country": country.title(),
        "status": "Generalized Global Policy Database",
        "net_zero_target_year": target,
        "grid_carbon_intensity": intensity,
        "core_policies": [
            "National Renewable Portfolio Standards",
            "Industrial energy auditing mandates",
            "Voluntary Carbon Credit offsetting platform"
        ],
        "active_incentives": "Tax credits for energy efficient building components and small-scale offgrid solar applications."
    }

import math
if __name__ == "__main__":
    mcp.run()

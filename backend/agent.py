import os
import sys
from google.adk.tools.mcp_tool import McpToolset
from mcp import StdioServerParameters
from google.adk.sessions import InMemorySessionService
from google.adk import Agent, Runner

def get_climate_agent():
    # Detect the path of python in the virtual environment to ensure it has fastmcp installed
    python_executable = sys.executable
    
    # Path to the MCP server relative to project root
    mcp_script = os.path.join(os.path.dirname(__file__), "mcp_server.py")
    
    # Configure the MCP toolset connection
    mcp_toolset = McpToolset(
        connection_params=StdioServerParameters(
            command=python_executable,
            args=[mcp_script]
        )
    )
    
    # Create the Climate Coordinator Agent
    agent = Agent(
        name="EcoPulse",
        model="gemini-2.5-flash", # Highly responsive model
        instruction="""You are EcoPulse, a highly intelligent and proactive Climate Action Agent powered by Gemini.
Your purpose is to help individuals, cities, and businesses understand and reduce their environmental impact.

You have access to a custom Model Context Protocol (MCP) server that provides tools for:
1. `get_climate_metrics`: Retrieve carbon anomalies, air quality, emitters, and ecological data for any city.
2. `calculate_carbon_footprint`: Calculate exact CO2 metrics and plant-offset counts based on miles/KWh/diet.
3. `search_climate_policies`: Look up green incentives, net-zero target years, and national policies.

Rules of Engagement:
- Whenever a user asks about climate metrics, risk factors, or air quality of a city, use `get_climate_metrics`.
- If a user wants to calculate their carbon footprint or provides transport/utility details, use `calculate_carbon_footprint`.
- If a user inquires about subsidies, tax credits, EV incentives, or Net Zero targets, use `search_climate_policies`.
- Structure your output beautifully. Use bold headers, clean lists, and simple tables where possible.
- Provide practical, daily lifestyle optimization tips (e.g. smart thermostats, energy hours, compost habits, EV comparisons).
- Remain encouraging, scientific, and realistic. Never be alarmist. Maintain a professional, clean tone.
""",
        tools=[mcp_toolset]
    )
    
    # Setup session service
    session_service = InMemorySessionService()
    
    # Create the ADK runner
    runner = Runner(
        agent=agent,
        session_service=session_service,
        app_name="EcoPulseAgent",
        auto_create_session=True
    )
    return runner

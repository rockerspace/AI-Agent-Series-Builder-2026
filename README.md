# EcoPulse: AI Climate Action Agent

🌐 **Live Demo**: https://ai-agent-series-builder-2026-nac4-f5jmwu0b9.vercel.app
🔗 **Backend API**: https://ai-agent-series-builder-2026-1.onrender.com
🎬 **Video Demo**: https://www.loom.com/share/662d8c6e7a6d48e2b2e49974005afd10

EcoPulse is an agentic Climate Intelligence and Action platform built as a submission for the **AI Agent Builder Series 2026** hosted by AI House & Google for Developers. 

It leverages the **Google AI Stack**, featuring the **Google Agent Development Kit (ADK 2.0)** for multi-turn agent orchestration and the **Model Context Protocol (MCP)** for clean, decoupled tool integration.

---

## 🚀 Key Features

* **Aura AI Agent Chat (Multi-Persona)**: Converse with a Gemini 2.5 Flash agent that dynamically coordinate between three specialized personas:
  1. **Carbon Auditor**: Analyzes emissions datasets and offset metrics.
  2. **Policy Advisor**: Tracks net-zero targets and national solar/EV incentives.
  3. **Urban Ecologist**: Evaluates local heat risk indices and air pollution profiles.
* **Live Environmental Telemetry**: Queries live APIs on-the-fly to pull real weather, climate risk anomalies, and air quality indices (US AQI, PM2.5, PM10) for any city globally via Open-Meteo geocoding.
* **Carbon Tracker Dashboard**: Input transport, utility, and dietary metrics using interactive sliders to compute your metric tons of CO2 footprint and see tree-planting offset recommendations alongside real-world equivalents (smartphone charges, economy flights).
* **Climate Pulse Geographical Profiler**: Look up localized environmental metrics (Decadal warming indices, Air Quality Indexes, renewable energy grid mixes) and country-specific Net-Zero policy targets.
* **Social Engagement**: Single-click copy badge to share Eco-Scores (A+ through F) directly to LinkedIn.
* **Streaming Tool Feedback**: The UI renders status chips dynamically to show when the ADK Agent is invoking MCP tools (e.g. `[Running tool: calculate_carbon_footprint]`).

---

## 🛠 Architecture Overview

The application utilizes a clean separation of concerns: a React/Vite client dashboard, a FastAPI backend running the Google ADK runner, and a custom Stdio-based Model Context Protocol (MCP) tool server.

```mermaid
graph TD
    User([User Browser]) -->|React Chat & Sliders UI| Frontend[React Vite Frontend]
    Frontend -->|SSE / REST API| FastAPI[FastAPI Backend]
    
    subgraph "Google AI Stack"
        FastAPI -->|Orchestrates| ADK[Google ADK Runner]
        ADK -->|Gemini 2.5 Flash| Gemini[Google AI Studio]
        ADK -->|Discovers & Calls Tools| MCP[Model Context Protocol Server]
    end
    
    subgraph "Climate Tools (Live Stdio)"
        MCP -->|Live City Climate & AQI| get_climate_metrics[get_climate_metrics]
        MCP -->|Carbon Math & Analogies| calculate_carbon_footprint[calculate_carbon_footprint]
        MCP -->|Net Zero Goals & EV Subsidies| search_climate_policies[search_climate_policies]
    end
    
    subgraph "External Telemetry APIs"
        get_climate_metrics -->|Geo/Weather API| OpenMeteo[Open-Meteo Geocoding & Climate API]
        get_climate_metrics -->|AQI API| OpenAQ[Open-Meteo Air Quality telemetry]
    end
```

---
## 📦 Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Framer Motion (for premium micro-animations), Lucide Icons, and Firebase Client SDK.
* **Backend**: FastAPI (Python), Uvicorn, Python-dotenv, Firebase Admin SDK, and `aiokafka`.
* **Agentic Orchestration**: Google Agent Development Kit (ADK) 2.0 (running on the main loop via `run_async`).
* **Tool Standards**: Model Context Protocol (MCP) implemented using `FastMCP` (communicates over stdio).
* **LLM Foundation**: Gemini 2.5 Flash via Google AI Studio.
* **Telemetry Data & Streams**: Open-Meteo Weather & Air Quality API, Dockerized Apache Kafka.

---

## 💻 Installation & Local Run

### Prerequisites
* Python 3.10+
* Node.js 18+
* Docker & Docker Compose (optional for real-time Kafka message streaming)
* A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. (Optional) Run Kafka Event Broker
Spin up the Kafka instance in KRaft mode:
```bash
docker compose up -d
```
*Note: If Docker is not available, the backend server will run in standalone mock mode.*

### 2. Backend Setup
Navigate to the backend directory and configure the environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory and add your API key and configurations:
```env
GEMINI_API_KEY=AIzaSy...
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Optional Firebase Service account configuration
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your-credentials.json
```

Start the FastAPI server:
```bash
python main.py
```
*The API will start running at `http://127.0.0.1:8000`.*

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and run the developer server:
```bash
cd frontend
npm install
npm run dev
```
*The UI dashboard will start serving at `http://localhost:5173`.*

---

## 📄 File Directory Structure
```text
AI-Agent-Series-Builder-2026/
├── backend/
│   ├── .env                  # Environment keys
│   ├── requirements.txt      # Python packages (google-adk, fastmcp)
│   ├── mcp_server.py         # MCP Climate tools definition
│   ├── agent.py              # ADK Agent and Runner configuration
│   └── main.py               # FastAPI endpoints & async generators
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx   # Glassmorphic side navigation
│   │   │   ├── Chat.tsx      # Agentic chat panel with streaming SSE
│   │   │   ├── Dashboard.tsx # Carbon calculator graph panel
│   │   │   └── Pulse.tsx     # Climate profiling search
│   │   ├── App.tsx           # Layout coordinating tabs
│   │   ├── index.css         # Curated HSL dark/emerald design system
│   │   └── main.tsx          # Bootstrapper
│   ├── index.html            # Entry HTML loading google fonts
│   ├── package.json          # Node settings
│   └── tsconfig.json         # TS settings
└── README.md                 # Project Documentation
```

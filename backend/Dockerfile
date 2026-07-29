##############################################
# Stage 1: Build — install all dependencies  #
##############################################
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools only in this stage
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

##############################################
# Stage 2: Runtime — lean production image   #
##############################################
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source (exclude test files, venv, cache)
COPY agent.py config.py exceptions.py firebase_db.py \
     kafka_streamer.py main.py mcp_server.py requirements.txt ./

# Run as a non-root user for security
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

# Cloud Run listens on PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

# Health check — Cloud Run probes /health on startup
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info"]

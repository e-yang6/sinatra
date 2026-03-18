#!/bin/bash
# Startup script for Render deployment
# This ensures PORT is properly set

PORT=${PORT:-8000}
echo "Starting Sinatra backend on port $PORT"
uvicorn main:app --host 0.0.0.0 --port $PORT

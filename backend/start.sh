#!/bin/bash
# Quick start script for Linux/Mac

echo "Starting Sinatra Backend..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if requirements are installed
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

# Check for SoundFont
if [ -n "$SOUNDFONT_PATH" ]; then
    echo "Using SoundFont: $SOUNDFONT_PATH"
else
    echo "WARNING: SOUNDFONT_PATH not set. Will try default locations."
    echo "Set it with: export SOUNDFONT_PATH=/path/to/your/soundfont.sf2"
fi

echo ""
echo "Starting server on http://localhost:8000"
echo "Press CTRL+C to stop"
echo ""

uvicorn main:app --reload --port 8000

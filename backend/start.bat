@echo off
REM Quick start script for Windows
echo Starting Sinatra Backend...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if requirements are installed
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check for SoundFont
if defined SOUNDFONT_PATH (
    echo Using SoundFont: %SOUNDFONT_PATH%
) else (
    echo WARNING: SOUNDFONT_PATH not set. Will try default locations.
    echo Set it with: set SOUNDFONT_PATH=C:\path\to\your\soundfont.sf2
)

echo.
echo Starting server on http://localhost:8000
echo Press CTRL+C to stop
echo.

uvicorn main:app --reload --port 8000

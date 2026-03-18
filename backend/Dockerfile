# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    fluidsynth \
    libfluidsynth-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download SoundFont (FluidSynth needs a .sf2 file to synthesize audio)
# Using fluid-soundfont Debian package which includes FluidR3_GM.sf2
RUN apt-get update && apt-get install -y fluid-soundfont-gm && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Basic Pitch (special handling)
RUN pip install basic-pitch==0.4.0 --no-deps

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Cloud Run uses PORT env var, but we'll default to 8000)
ENV PORT=8000
EXPOSE 8000

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

FROM python:3.12-slim

# Install ffmpeg for yt-dlp video processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create a non-root user with UID 1000 to match the host user
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Change ownership of /app
RUN chown -R appuser:appuser /app

# Ensure the app can access the frontend if mounted via volume in docker-compose
# and can write to /downloads
USER appuser

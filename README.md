# YHTV - Your Home TV

YHTV is a self-hosted, lightweight YouTube channel synchronizer and offline media player. It automatically downloads videos from your favorite YouTube channels, extracts their metadata (descriptions, comments, etc.), and provides a beautiful, modern web interface to watch them offline.

## Features
- **Auto-Synchronization:** Automatically download the latest videos from subscribed channels using `yt-dlp`.
- **Offline Viewing:** Watch videos entirely offline with a custom HTML5 player.
- **Rich Metadata:** Preserves YouTube descriptions, channel avatars, banners, and video comments.
- **YouTube-Style Keyboard Controls:** Fully supports native YouTube keyboard shortcuts (`J`, `K`, `L`, `F`, `M`, Arrow Keys).
- **Modern UI:** Built with pure HTML/CSS/JS, featuring a dynamic dark theme, glassmorphism effects, and fully responsive design.
- **Background Queue:** Asynchronous task processing using Celery and Redis to handle heavy downloads without blocking the UI.

## Architecture
- **Frontend:** Nginx serving static HTML/CSS/JS.
- **Backend:** FastAPI (Python) handling API routes and database interactions.
- **Worker:** Celery worker running `yt-dlp` for downloading videos and metadata.
- **Database:** PostgreSQL (or SQLite) for storing channel and video records.
- **Broker:** Redis for Celery task queuing.

## Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/KovachUa/YHTV.git
   cd YHTV
   ```
2. Build and start the containers:
   ```bash
   docker compose build
   docker compose up -d
   ```
3. Open your browser and navigate to `http://localhost:8080`.

## Usage
- Click **"Add Channel"** and paste a YouTube channel URL. The system will immediately fetch channel metadata and add it to your subscriptions.
- The background worker will automatically start downloading the latest videos from the channel.
- Click on any video card to open the player. The player supports YouTube standard hotkeys.
- Use the **"Refresh Metadata"** button to fetch the latest comments and descriptions for a video.


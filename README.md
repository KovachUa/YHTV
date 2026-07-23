# YHTV - Your Home TV 📺

[🇬🇧 English](#english) | [🇺🇦 Українська](#українська)

---

<a name="english"></a>
## 🇬🇧 English

YHTV is a self-hosted, full-stack YouTube synchronizer and offline media player. It uses `yt-dlp` to automatically download videos from your favorite channels, storing video files locally and metadata in a PostgreSQL database. It features a robust FastAPI backend, Celery workers for background downloading, a custom web frontend served by Nginx, and even a Chrome extension for one-click downloading!

### ✨ Features
- **Auto-Synchronization:** Automated and background downloading using `yt-dlp`.
- **REST API:** High-performance backend built with FastAPI, Uvicorn, and SQLAlchemy.
- **Asynchronous Workers:** Task queuing and background jobs handled by Celery and Redis.
- **Browser Extension:** Includes `YHTV Downloader` (Chrome extension) to easily send any YouTube video directly to your server with one click.
- **Offline Web Player:** Watch your videos entirely offline using the custom Nginx-served HTML5 frontend.
- **Database Storage:** Reliable metadata storage using PostgreSQL.

### 🏗 Architecture
The application runs as a multi-container Docker Compose stack:
- **Frontend:** Nginx serving the static web UI (`index.html`, CSS, JS) on port `8080`.
- **Backend:** FastAPI handling API routes (`/api/*`), running via Uvicorn.
- **Worker:** Celery worker container running `yt-dlp` to handle heavy download tasks asynchronously.
- **Redis:** In-memory message broker for Celery task queuing.
- **Database:** PostgreSQL 16 storing channel records, video metadata, and statuses.

### 🚀 Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/KovachUa/YHTV.git
   cd YHTV
   ```
2. Build and start the Docker Compose stack:
   ```bash
   docker compose up -d --build
   ```
3. Open your browser and navigate to `http://localhost:8080`.

### 🧩 Chrome Extension (YHTV Downloader)
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `yhtv-extension` folder inside this repository.
4. Click the extension icon, configure your server URL (e.g., `http://localhost:8000`), and use it to send videos straight to your YHTV server!

---

<a name="українська"></a>
## 🇺🇦 Українська

YHTV — це повноцінний синхронізатор YouTube-каналів та офлайн-медіаплеєр для самостійного хостингу. Він використовує `yt-dlp` для автоматичного завантаження відео з ваших улюблених каналів, зберігає файли локально, а метадані — у базі PostgreSQL. Проєкт має потужний бекенд на FastAPI, воркери Celery для фонового завантаження, власний вебфронтенд (Nginx) і навіть Chrome-розширення для завантаження в один клік!

### ✨ Особливості
- **Автоматична синхронізація:** Фонове завантаження відео за допомогою `yt-dlp`.
- **REST API:** Високопродуктивний бекенд, написаний на FastAPI, Uvicorn та SQLAlchemy.
- **Асинхронні воркери:** Черга завдань та фонова обробка через Celery та Redis.
- **Розширення для браузера:** Включає `YHTV Downloader` — Chrome-розширення, що дозволяє відправляти будь-яке відео на ваш сервер в один клік.
- **Офлайн вебплеєр:** Переглядайте відео без доступу до інтернету завдяки власному HTML5 плеєру, що роздається через Nginx.
- **Зберігання даних:** Надійне зберігання метаданих у базі PostgreSQL.

### 🏗 Архітектура
Додаток працює як набір Docker-контейнерів:
- **Frontend:** Nginx для роздачі статики (UI) на порту `8080`.
- **Backend:** FastAPI для обробки API запитів, запущений через Uvicorn.
- **Worker:** Celery-воркер, який виконує важкі завдання завантаження (`yt-dlp`).
- **Redis:** Брокер повідомлень для черги завдань Celery.
- **Database:** PostgreSQL 16 для зберігання записів про канали, відео та їхні статуси.

### 🚀 Швидкий старт
1. Клонуйте репозиторій:
   ```bash
   git clone https://github.com/KovachUa/YHTV.git
   cd YHTV
   ```
2. Зберіть та запустіть контейнери:
   ```bash
   docker compose up -d --build
   ```
3. Відкрийте браузер і перейдіть за адресою `http://localhost:8080`.

### 🧩 Chrome-розширення (YHTV Downloader)
1. Відкрийте Chrome і перейдіть за адресою `chrome://extensions/`.
2. Увімкніть **Режим розробника** (Developer mode) у правому верхньому куті.
3. Натисніть **Завантажити розпаковане** (Load unpacked) і виберіть папку `yhtv-extension` з цього репозиторію.
4. Натисніть на іконку розширення, вкажіть URL вашого сервера (наприклад, `http://localhost:8000`) і відправляйте відео прямо на ваш YHTV сервер!

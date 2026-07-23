# 🔍 Аналіз проєкту YHTV — Знайдені помилки та проблеми

> [!NOTE]
> Проаналізовано всі компоненти: **бекенд** (Python/FastAPI), **фронтенд** (HTML/Nginx), **Chrome-розширення** та **Docker-конфігурацію**.

---

## 📊 Загальна статистика

| Компонент | 🔴 Критичні | 🟡 Середні | 🟢 Низькі |
|-----------|:-----------:|:----------:|:---------:|
| Backend | 5 | 9 | 5 |
| Frontend | 2 | 5 | 5 |
| Extension | 1 | 4 | 4 |
| **Всього** | **8** | **18** | **14** |

---

## 🔴 КРИТИЧНІ ПОМИЛКИ

### 1. Відсутній `ffmpeg` у Docker-образі
**Файл:** [Dockerfile](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/Dockerfile)

`yt-dlp` потребує `ffmpeg` для злиття відео та аудіо потоків. Без нього формат-селектор у [tasks.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/tasks.py) або завалиться, або скачає відео без звуку.

```diff
 FROM python:3.11-slim
 WORKDIR /app
+RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
 COPY requirements.txt .
```

---

### 2. Розширення файлу жорстко закодоване як `.mp4`
**Файл:** [tasks.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/tasks.py) (~рядок 140)

```python
video.file_path = f"{channel_id}/{video_id}.mp4"  # ❌ Завжди .mp4
```

`yt-dlp` може скачати `.webm` або `.mkv`, якщо MP4 недоступний. Потрібно визначати розширення динамічно через `glob` або читання метаданих.

---

### 3. `IntegrityError` при дублікаті каналу не обробляється
**Файл:** [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) (~рядок 128)

При повторному додаванні каналу з тим самим `channel_id` — сервер відповість **HTTP 500** замість зрозумілого **409 Conflict**.

```diff
+from sqlalchemy.exc import IntegrityError
+
 @app.post("/api/channels")
 async def add_channel(request: Request, db: Session = Depends(get_db)):
     # ...
+    existing = db.query(Channel).filter(Channel.channel_id == channel_id).first()
+    if existing:
+        raise HTTPException(409, "Channel already exists")
     new_channel = Channel(...)
```

---

### 4. XSS-вразливість через `innerHTML`
**Файл:** [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) (множинні місця)

API-дані (назви каналів, відео) вставляються через `innerHTML` без екранування:
```javascript
card.innerHTML = `<h3>${ch.title}</h3>`;  // ❌ XSS якщо title містить <script>
```

Потрібно використовувати `textContent` або екранувати HTML.

---

### 5. Жодна авторизація на жодному ендпоінті
**Файл:** [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py)

Всі API-ендпоінти публічно доступні. Будь-хто може додавати/видаляти канали, запускати завантаження та отримувати доступ до всіх даних.

---

### 6. Версії залежностей не зафіксовані
**Файл:** [requirements.txt](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/requirements.txt)

```
fastapi          # ❌ Без версії
uvicorn          # ❌ Без версії
```

Нові релізи можуть зламати додаток. Потрібно: `fastapi==0.115.0`, `celery==5.4.0` тощо.

---

### 7. Відсутні `host_permissions` у розширенні
**Файл:** [manifest.json](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/manifest.json)

У Manifest V3 `fetch` з popup до зовнішнього сервера потребує `host_permissions`. Без цього запити з розширення до сервера **будуть блоковані**.

```diff
 "permissions": ["activeTab", "storage"],
+"host_permissions": ["<all_urls>"],
```

---

### 8. Відсутня обробка помилок у множинних `fetch`-викликах
**Файл:** [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html)

Багато `fetch()` не мають `try/catch`. При мережевій помилці — необроблений виняток, UI зависає без повідомлення.

---

## 🟡 СЕРЕДНІ ПОМИЛКИ

### Backend

| # | Файл | Проблема |
|---|------|----------|
| 1 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | `subprocess.run` блокує async event loop (рядок ~155). Потрібно `asyncio.create_subprocess_exec` |
| 2 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | Немає перевірки на дублікат синхронізації — можна запустити 10 паралельних завантажень одного каналу |
| 3 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | `stream_video` не перевіряє чи файл існує на диску — буде 500 замість 404 |
| 4 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | CORS `allow_origins=["*"]` — надто широкий доступ |
| 5 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | Немає Pydantic-схем — немає автовалідації запитів |
| 6 | [tasks.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/tasks.py) | Помилки завантаження не логуються і не зберігаються в БД |
| 7 | [tasks.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/tasks.py) | Немає retry при тимчасових помилках (мережа, rate-limit) |
| 8 | [tasks.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/tasks.py) | DB-сесія тримається відкритою на весь час завантаження (години) |
| 9 | [models.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/models.py) | `upload_date` — String замість Date; `status` — вільний String замість Enum |

### Frontend

| # | Файл | Проблема |
|---|------|----------|
| 1 | [nginx.conf](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/nginx.conf) | `autoindex on` — показує повний список файлів у `/downloads/` |
| 2 | [nginx.conf](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/nginx.conf) | Відсутні security headers (`X-Frame-Options`, CSP тощо) |
| 3 | [nginx-public.conf](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/nginx-public.conf) | CORS `Access-Control-Allow-Origin *` — надто відкритий |
| 4 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Race condition при швидкому переключенні між каналами |
| 5 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Тип відео жорстко `video/mp4` — може не відтворити `.webm`/`.mkv` |

### Celery

| # | Файл | Проблема |
|---|------|----------|
| 1 | [celery_app.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/celery_app.py) | Немає `result_expires` — результати таск накопичуються в Redis, витік пам'яті |
| 2 | [database.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/database.py) | `DATABASE_URL` дублюється в `database.py` і `main.py` |

### Extension

| # | Файл | Проблема |
|---|------|----------|
| 1 | [popup.js](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/popup.js) | Немає null-check на `tab` — може бути `TypeError` |
| 2 | [popup.js](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/popup.js) | Перевірка YouTube URL надто ліберальна — пропускає `youtube.com/watch_later` |
| 3 | [popup.js](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/popup.js) | Немає timeout для `fetch` (AbortController) |
| 4 | [popup.js](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/popup.js) | Trailing slash в URL сервера → подвійний слеш `/api/download` |

---

## 🟢 НИЗЬКОПРІОРИТЕТНІ ПРОБЛЕМИ

| # | Файл | Проблема |
|---|------|----------|
| 1 | [models.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/models.py) | `datetime.utcnow` deprecated з Python 3.12 |
| 2 | [fix_db.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/fix_db.py) | `== None` замість `.is_(None)` |
| 3 | [Dockerfile](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/Dockerfile) | Контейнер працює від root; копіює `.db` та `__pycache__` |
| 4 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Монолітний файл 43KB — CSS/JS слід винести окремо |
| 5 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Немає адаптивного дизайну (`@media` queries) |
| 6 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Немає індикаторів завантаження та пагінації |
| 7 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | `formatDuration` не робить `Math.floor` для секунд |
| 8 | [index.html](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/index.html) | Відсутній `lang` атрибут на `<html>` |
| 9 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | Монолітний файл 603 рядки — потрібно розбити на модулі |
| 10 | [main.py](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/backend/main.py) | Відсутнє логування |
| 11 | [manifest.json](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/manifest.json) | Відсутні іконки розширення |
| 12 | [popup.js](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/yhtv-extension/popup.js) | Немає валідації URL сервера |
| 13 | [nginx-public.conf](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/nginx-public.conf) | Захардкоджена приватна IP-адреса |
| 14 | [Dockerfile (frontend)](file:///home/kovach/DOC/IOT/ГотовіГіт/YHTV/frontend/Dockerfile) | `nginx-public.conf` не використовується |

---

## 🎯 Рекомендований порядок виправлень

> [!IMPORTANT]
> Найкритичніші проблеми, які можуть зламати роботу додатку:

1. **Додати `ffmpeg` у Dockerfile** — без нього `yt-dlp` не працює коректно
2. **Виправити хардкод `.mp4`** у `tasks.py` — інакше шляхи до файлів не збігатимуться з реальними
3. **Обробити `IntegrityError`** при дублікаті каналу — HTTP 500 плутає користувачів
4. **Додати `host_permissions`** у розширення — без цього `fetch` до сервера блокується
5. **Екранувати HTML** у фронтенді — XSS-вразливість
6. **Зафіксувати версії** у `requirements.txt`
7. **Додати `try/catch`** до `fetch`-викликів у фронтенді
8. **Налаштувати `result_expires`** у Celery — запобігти витоку пам'яті Redis

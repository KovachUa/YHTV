const translations = {
    // Navigation
    "All Videos": "Всі відео",
    "Channels": "Канали",
    "Queue": "Черга",
    "Config": "Налаштування",
    
    // Headers
    "Download Configuration": "Налаштування завантаження",
    "Download Queue": "Черга завантажень",
    "Add New Video or Channel": "Додати нове відео або канал",
    "Confirm Deletion": "Підтвердження видалення",
    
    // Buttons & Toggles
    "Save Settings": "Зберегти налаштування",
    "Pause All": "Призупинити всі",
    "Resume All": "Продовжити всі",
    "Clear Completed": "Очистити завершені",
    "Clear All": "Очистити все",
    "Download": "Завантажити",
    "Cancel": "Скасувати",
    "Delete": "Видалити",
    "Subscribe": "Підписатися",
    "Unsubscribe": "Відписатися",
    "Back to Channels": "Назад до каналів",
    "Show subscribed only:": "Тільки підписки:",
    "Newest first": "Спершу нові",
    "Oldest first": "Спершу старі",
    "Longest": "Найдовші",
    "Retry": "Повторити",

    // Config Sections
    "Network & Rate Limits": "Мережа та швидкість",
    "Max Download Rate": "Макс. швидкість завантаження",
    "Min Rate (restart if below)": "Мін. швидкість (перезапуск, якщо нижче)",
    "HTTP Chunk Size": "Розмір HTTP-фрагмента",
    
    "Retries & Fragments": "Повторні спроби та фрагменти",
    "Global Retries": "Глобальні спроби",
    "File Access Retries": "Спроби доступу до файлу",
    "Fragment Retries": "Спроби для фрагмента",
    "Retry Sleep (seconds)": "Затримка між спробами (сек)",
    "Concurrent Fragments": "Одночасні фрагменти",
    
    "Buffer & Storage": "Буфер та зберігання",
    "Buffer Size": "Розмір буфера",
    "Auto-resize Buffer": "Авто-зміна розміру буфера",
    "Keep Fragments after Merge": "Зберігати фрагменти після об'єднання",
    "Set expected filesize in xattr": "Записувати розмір у xattr",
    
    "Playlists & Formats": "Плейлисти та формати",
    "Format Selection": "Вибір формату",
    "Process Playlist Lazily": "Поступова обробка плейлиста",
    "Randomize Playlist Order": "Випадковий порядок плейлиста",
    "Use mpegts for HLS": "Використовувати mpegts для HLS",
    "Skip Unavailable Fragments": "Пропускати недоступні фрагменти",
    
    "Advanced Downloads": "Розширені завантаження",
    "Download Archive File": "Файл архіву (Archive File)",
    "Download Sections (Requires FFmpeg)": "Завантаження частин (вимагає FFmpeg)",
    "External Downloader": "Зовнішній завантажувач",
    "External Downloader Args": "Аргументи зовн. завантажувача",
    "No Download (Metadata only)": "Без завантаження (лише метадані)",
    "Ignore Errors (continue on failure)": "Ігнорувати помилки (продовжувати)",

    // Sidebar Tabs
    "Network & Connection": "Мережа та з'єднання",
    "Download & Retries": "Завантаження та повтори",
    "Post-Processing": "Постобробка",
    "File System & Output": "Файлова система та вивід",
    "Advanced": "Розширені",

    "Video Selection": "Вибір відео",
    "Playlist Start": "Початок плейлиста",
    "Playlist End": "Кінець плейлиста",
    "Match Filter": "Фільтр збігів (Match Filter)",
    "Date After (YYYYMMDD)": "Дата після (YYYYMMDD)",
    "Min Filesize": "Мін. розмір файлу",
    "Max Filesize": "Макс. розмір файлу",

    "Post-Processing (Audio & Metadata)": "Постобробка (Аудіо та Метадані)",
    "Extract Audio": "Вилучити аудіо",
    "Audio Format": "Формат аудіо",
    "Audio Quality (0-9)": "Якість аудіо (0-9)",
    "Embed Metadata": "Вбудувати метадані",
    "Embed Thumbnail": "Вбудувати обкладинку",
    "Embed Chapters": "Вбудувати розділи",

    "Subtitles": "Субтитри",
    "Write Subtitles": "Завантажувати субтитри",
    "Write Auto Subtitles": "Завантажувати авто-субтитри",
    "Subtitle Languages": "Мови субтитрів",
    "Subtitle Format": "Формат субтитрів",
    "Embed Subtitles": "Вбудувати субтитри",

    "Output & File System": "Вивід та Файлова система",
    "Output Template": "Шаблон імені файлу",
    "Restrict Filenames (ASCII)": "Обмежити імена файлів (ASCII)",
    "Windows Filenames": "Windows-сумісні імена",
    "Do Not Copy File Modification Time": "Не копіювати час зміни файлу",

    "Authentication": "Авторизація",
    "Cookies from Browser": "Cookies з браузера",
    "Username": "Ім'я користувача (Логін)",
    "Password": "Пароль",

    "Proxy & Geo-Restriction": "Проксі та Геообмеження",
    "HTTP/HTTPS/SOCKS Proxy": "HTTP/HTTPS/SOCKS Проксі",
    "Bypass geographic restriction": "Обійти географічні обмеження",
    "Bypass Country (ISO 3166-1)": "Країна для обходу (ISO 3166-1)",

    "SponsorBlock": "СпонсорБлок (SponsorBlock)",
    "Remove Sponsor Categories": "Видалити спонсорські категорії",
    "Mark Sponsor Categories (Chapters)": "Позначити категорії (як розділи)",

    // Misc
    "Are you sure you want to delete this item? This action cannot be undone.": "Ви впевнені, що хочете видалити цей елемент? Цю дію неможливо скасувати.",
    "URL": "Посилання (URL)",
    "Downloading...": "Завантаження...",
    "Waiting in queue...": "Очікування в черзі...",
    "Paused by user": "Призупинено користувачем",
    "Completed - ": "Завершено - ",
    "Error:": "Помилка:",
    "Subscribers:": "Підписники:",
    "Last refreshed:": "Останнє оновлення:"
};

// Reverse dictionary for EN -> UK translation
const reverseTranslations = {};
for (const key in translations) {
    reverseTranslations[translations[key]] = key;
}

document.addEventListener('DOMContentLoaded', () => {
    const langToggle = document.getElementById('lang-toggle');
    if (!langToggle) return;

    let currentLang = localStorage.getItem('yhtvLang') || 'en';
    
    const updateButtonText = () => {
        langToggle.textContent = currentLang === 'en' ? 'UK' : 'EN';
    };

    const applyTranslations = () => {
        const dict = currentLang === 'uk' ? translations : reverseTranslations;
        
        // Translate text nodes
        const walkDom = (node) => {
            if (node.nodeType === 3) { // Text node
                let text = node.nodeValue.trim();
                
                // Helper for text matching with some specific prefixes like "Queue " or "Completed - "
                const matchAndReplace = (targetText) => {
                    if (dict[targetText]) {
                        node.nodeValue = node.nodeValue.replace(targetText, dict[targetText]);
                        return true;
                    }
                    return false;
                };

                // Exact match first
                if (matchAndReplace(text)) return;
                
                // Check if queue badge exists inside text
                if (text.startsWith("Queue ") || text.startsWith("Черга ")) {
                     if (currentLang === 'uk') node.nodeValue = node.nodeValue.replace("Queue ", "Черга ");
                     else node.nodeValue = node.nodeValue.replace("Черга ", "Queue ");
                }
            } else if (node.nodeType === 1) { // Element node
                // Exclude script and style tags
                if (node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
                    // Translate placeholders
                    if (node.placeholder && dict[node.placeholder]) {
                        node.placeholder = dict[node.placeholder];
                    }
                    
                    // Specific button edge cases (Queue badge is inside, so textContent isn't exact match)
                    if (node.childNodes) {
                        node.childNodes.forEach(walkDom);
                    }
                }
            }
        };

        walkDom(document.body);
        
        // Translate specific elements with innerHTML that might be missed
        const btnSubscribe = document.querySelectorAll('.btn-subscribe');
        btnSubscribe.forEach(btn => {
            if (btn.textContent.trim() === 'Subscribe' || btn.textContent.trim() === 'Підписатися') {
                btn.textContent = currentLang === 'uk' ? 'Підписатися' : 'Subscribe';
            }
        });

        const btnUnsubscribe = document.querySelectorAll('.btn-unsubscribe');
        btnUnsubscribe.forEach(btn => {
            if (btn.textContent.trim() === 'Unsubscribe' || btn.textContent.trim() === 'Відписатися') {
                btn.textContent = currentLang === 'uk' ? 'Відписатися' : 'Unsubscribe';
            }
        });
        
        const optionSelects = document.querySelectorAll('option');
        optionSelects.forEach(opt => {
            const text = opt.textContent.trim();
            if (dict[text]) {
                opt.textContent = dict[text];
            }
        });
    };

    // Initial apply
    updateButtonText();
    if (currentLang === 'uk') {
        applyTranslations();
    }

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'uk' : 'en';
        localStorage.setItem('yhtvLang', currentLang);
        updateButtonText();
        // Since applying translations toggles between dicts, we just call it.
        applyTranslations();
    });
});

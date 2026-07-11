#!/bin/bash

# Перевірка на запуск з sudo
if [ "$EUID" -ne 0 ]
  then echo "Будь ласка, запустіть цей скрипт через sudo: sudo bash migrate_docker.sh"
  exit
fi

echo "[1/4] Зупиняємо поточні контейнери..."
cd /home/kovach/DOC/IOT/ГотовіГіт/YHTV
docker compose down

echo "[2/4] Оновлюємо конфігурацію Docker (вказуємо диск 188)..."
echo '{ "data-root": "/media/kovach/acf0bea6-ee62-4695-b198-ffdebbf50b188/docker" }' > /etc/docker/daemon.json

echo "[3/4] Перезапускаємо службу Docker..."
systemctl restart docker

echo "[4/4] Видаляємо стару хибну папку (звільняємо пам'ять на системному диску)..."
rm -rf /media/kovach/acf0bea6-ee62-4695-b198-ffdebbf50b187/docker

echo "[*] Запускаємо проект на новому диску..."
docker compose up -d --build

echo "[+] Готово! Docker успішно перенесено, а проект працює."

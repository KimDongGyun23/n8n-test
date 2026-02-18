#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Ollama 시작..."
if pgrep -x "ollama" > /dev/null; then
  echo "    Ollama가 이미 실행 중입니다."
else
  ollama serve &
  sleep 2
  echo "    Ollama 시작 완료."
fi

echo "==> 기존 컨테이너 정리..."
docker compose down

echo "==> Docker Compose 시작..."
docker compose up -d

echo "==> 완료!"
echo "    n8n:    http://localhost:5678"
echo "    Ollama: http://localhost:11434"

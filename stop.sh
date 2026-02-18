#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Docker Compose 종료..."
docker compose down

echo "==> Ollama 종료..."
if pgrep -x "ollama" > /dev/null; then
  pkill -x "ollama"
  echo "    Ollama 종료 완료"
else
  echo "    Ollama가 실행 중이 아닙니다."
fi

echo "==> 모든 서비스 종료 완료!"

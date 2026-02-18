#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> 기존 컨테이너 정리..."
docker compose down

echo "==> Docker Compose 시작..."
docker compose up -d

echo "==> 완료! n8n: http://localhost:5678"

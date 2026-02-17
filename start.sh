#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> 기존 컨테이너 정리..."
docker compose down

echo "==> Docker Compose 시작..."
docker compose up -d

echo "==> Cloudflare 터널 URL 대기 중..."
TUNNEL_URL=""
RETRY=0
while [ $RETRY -lt 30 ]; do
  TUNNEL_URL=$(docker compose logs cloudflared 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: 30초 내에 터널 URL을 찾지 못했습니다."
  exit 1
fi

echo "==> 터널 URL: $TUNNEL_URL"

# .env 파일의 WEBHOOK_URL 업데이트
if grep -q '^WEBHOOK_URL=' .env; then
  sed -i '' "s|^WEBHOOK_URL=.*|WEBHOOK_URL=${TUNNEL_URL}|" .env
else
  echo "WEBHOOK_URL=${TUNNEL_URL}" >> .env
fi

echo "==> .env 업데이트 완료"

# n8n 컨테이너 재시작 (새 WEBHOOK_URL 반영)
echo "==> n8n 컨테이너 재시작..."
docker compose up -d n8n

echo "==> 완료! WEBHOOK_URL=${TUNNEL_URL}"

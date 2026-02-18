import { parseStackTrace, collectCauseChain, captureCallSite } from "./error-parser.js";

const isDev = import.meta.env.DEV;
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const RECENT_ERROR_TTL = 5000; // 5초

// 5초 내 중복 에러 차단
const recentErrors = new Map();

/**
 * 중복 에러 체크 및 기록
 */
function isDuplicate(errorKey) {
  const now = Date.now();
  if (recentErrors.has(errorKey)) {
    const timestamp = recentErrors.get(errorKey);
    if (now - timestamp < RECENT_ERROR_TTL) return true;
  }
  recentErrors.set(errorKey, now);

  // 메모리 관리를 위해 5초 뒤 해당 키만 삭제
  setTimeout(() => recentErrors.delete(errorKey), RECENT_ERROR_TTL);
  return false;
}

/**
 * 표준화된 에러 페이로드 생성
 */
function createPayload(error, callSiteStack) {
  return {
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack || "",
      traces: parseStackTrace(error.stack),
      causes: collectCauseChain(error),
    },
    callSite: {
      stack: callSiteStack,
      traces: parseStackTrace(callSiteStack),
    },
    meta: {
      url: window.location.href,
      userAgent: navigator.userAgent.slice(0, 500),
      timestamp: new Date().toISOString(),
      environment: isDev ? "development" : "production",
    },
  };
}

export const logger = {
  error(error, extra = {}) {
    // 중복 체크
    const errorKey = `${error.message}-${error.stack?.slice(0, 100)}`;
    if (isDuplicate(errorKey)) return;

    // 에러 호출 지점 스택 캡처
    const callSiteStack = captureCallSite();
    const payload = { ...createPayload(error, callSiteStack), extra };

    // 개발환경: console 출력
    if (isDev) console.error(payload);

    // 모든 환경: n8n 전송
    if (!N8N_WEBHOOK_URL) {
      if (isDev) console.warn("[logger] VITE_N8N_WEBHOOK_URL 설정 필요");
      return;
    }

    // n8n 전송 (실패해도 앱에는 영향 없음)
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((err) => {
      if (isDev) console.warn("[logger] Webhook 전송 실패", err.message);
    });
  },
};

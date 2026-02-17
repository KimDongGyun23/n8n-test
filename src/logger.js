import { captureException } from "@sentry/react";

// 임시 환경 플래그 (실제 프로젝트에서는 import.meta.env.DEV 사용)
const isDev = false;
// const isDev = import.meta.env.DEV;

/**
 * 로거 유틸리티
 * - 개발 환경: console.error로 상세 로그 출력
 * - 프로덕션: Sentry에 예외와 컨텍스트 전송
 */
export const logger = {
  error(error, context = {}) {
    if (isDev) {
      console.error("[CONTEXT]", error, context);
      return;
    }

    captureException(error, context);
  },
};

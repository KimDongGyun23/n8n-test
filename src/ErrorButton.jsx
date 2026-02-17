import { captureException } from "@sentry/react";
import { useCallback } from "react";

export const ErrorButton = () => {
  const handleClick = useCallback(() => {
    try {
      // 또 다른 테스트 에러
      throw new TypeError("두 번째 강제 에러");
    } catch (error) {
      captureException(error, {
        fingerprint: ["simulated-typeerror"],
        tags: { source: "n8n-demo" },
        extra: { note: "두 번째 버튼으로 발생한 테스트 에러" },
      });
      alert("두 번째 강제 에러가 Sentry에 전송되었습니다!");
    }
  }, []);

  return <button onClick={handleClick}>에러 발생시키기</button>;
};
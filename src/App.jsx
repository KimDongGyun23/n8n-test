import { captureException } from "@sentry/react";
import { ErrorButton } from "./ErrorButton";
import { useCallback } from "react";
import "./App.css";

function App() {
  const handleClick = useCallback(() => {
    // 간단한 Sentry 테스트용 에러
    captureException(new Error("강제 에러 발생"), {
      fingerprint: ["simulated-error"],
      tags: { source: "n8n-demo" },
      extra: { note: "버튼으로 강제 발생한 테스트 에러" },
    });
    alert("강제 에러가 Sentry에 전송되었습니다!");
  }, []);

  return (
    <div className="app">
      <h1>Sentry 테스트</h1>
      <button onClick={handleClick}>에러 발생시키기</button>
      <ErrorButton />
    </div>
  );
}
export default App;
```javascript
import { captureException } from "@sentry/react";
import { useState, useCallback } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [_, setItems] = useState([]);
  const [errorHistory, setErrorHistory] = useState([]);

  // 정상 카운터
  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  // 에러 1: Callback 함수 없음
  const triggerCallbackError = useCallback(() => {
    try {
      const callback = undefined;
      callback(); // Sentry #1
    } catch (error) {
      captureException(error);
      setErrorHistory((prev) => [...prev, "callback-error"]);
    }
  }, []);

  // 에러 2: Null 객체 접근
  const triggerNullError = useCallback(() => {
    try {
      const data = null;
      if (data !== null) {
        setItems(data.items);
      }
    } catch (error) {
      captureException(error);
      setErrorHistory((prev) => [...prev, "null-error"]);
    }
  }, []);

  // 에러 3: 배열 아닌 값에 map()
  const triggerMapError = useCallback(() => {
    try {
      const invalid = "string";
      if (Array.isArray(invalid)) {
        invalid.map((item) => item.name);
      }
    } catch (error) {
      captureException(error);
      setErrorHistory((prev) => [...prev, "map-error"]);
    }
  }, []);

  return (
    <div>
      <h1 className="header">Sentry 에러 테스트</h1>

      <main className="main">
        {/* 정상 카운터 */}
        <section className="counter-section">
          <h2>정상 동작</h2>
          <div className="counter-display">{count}</div>
          <button className="btn btn-success" onClick={increment}>카운트 +1</button>
        </section>

        {/* 에러 히스토리 */}
        <section className="history-section">
          <h2>에러 기록 ({errorHistory.length})</h2>
          <div className="history-list">
            {errorHistory.length === 0 ? (
              <div className="empty-state">에러 버튼 클릭!</div>
            ) : (
              errorHistory.map((error, i) => (
                <div key={i} className="history-item error">
                  • {error.replace("-", " ")}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 에러 버튼들 */}
        <section className="error-buttons">
          <h2>에러 재현</h2>

          <div className="error-grid">
            <button className="btn btn-danger" onClick={triggerCallbackError}>Callback 오류<small>undefined 함수</small></button>

            <button className="btn btn-warning" onClick={triggerNullError}>Null 참조<small>data.items</small></button>

            <button className="btn btn-danger" onClick={triggerMapError}>Map 오류<small>string.map()</small></button>
          </div>
        </section>
      </main>
    </div>
  );
}
export default App;
```
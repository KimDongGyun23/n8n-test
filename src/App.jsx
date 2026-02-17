import { captureException } from "@sentry/react";
import { useCallback, useEffect, useState } from "react";

function App() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * fetchPost: JSONPlaceholder API에서 포스트 데이터를 가져오는 함수
   * - postId: 가져올 포스트의 ID (기본값 999, 존재하지 않는 ID로 에러 유발)
   * - 로딩 상태 관리, 에러 처리, Sentry 예외 캡처 포함
   */
  const fetchPost = useCallback(async (postId = 999) => {
    setLoading(true);
    setError(null);
    try {
      // API 호출 및 응답 검증
      const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: 해당 포스트를 찾을 수 없음`);

      const data = await response.json();

      // userId 필드 검증
      if (!data.userId) {
        const apiError = new Error("API 응답에 userId 필드가 없음");
        apiError.name = "ValidationError";
        captureException(apiError, {
          tags: { source: "api-validation", endpoint: `/posts/${postId}` },
          extra: { receivedData: data, expected: "userId present" },
        });
        setError("userId 필드가 없습니다.");
        return;
      }

      setPost(data);
    } catch (err) {
      captureException(err, {
        fingerprint: ["api-fetch-error"],
        tags: { source: "jsonplaceholder" },
        extra: { postId, attemptedUrl: `posts/${postId}` },
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return (
    <div className="app">
      <h1>JSONPlaceholder + Sentry 테스트</h1>
      <button onClick={() => fetchPost(1)}>정상 post#1 불러오기</button>
      <button onClick={() => fetchPost(999)}>에러 post#999 (없음)</button>

      {loading && <p>로딩 중...</p>}
      {error && <p style={{ color: "red" }}>에러: {error}</p>}
      {post && (
        <div>
          <h3>{post.title}</h3>
          <p>User ID: {post.userId}</p>
        </div>
      )}
    </div>
  );
}

export default App;

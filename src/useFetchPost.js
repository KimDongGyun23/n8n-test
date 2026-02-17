import { captureException } from "@sentry/react";
import { useCallback, useState } from "react";
export function useFetchPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * fetchPost: JSONPlaceholder API에서 포스트 데이터를 가져오는 함수
   * - postId: 가져올 포스트의 ID (기본값 1, API에서 유효한 ID)
   * - 로딩 상태 관리, 에러 처리, Sentry 예외 캡처 포함
   */
  const fetchPost = useCallback(async (postId = 1) => {
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

  return { post, loading, error, fetchPost };
}
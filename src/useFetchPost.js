import { useCallback, useState } from "react";
import { logger } from "./logger";

export function useFetchPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * fetchPost: JSONPlaceholder API에서 포스트 데이터를 가져오는 함수
   * - postId: 가져올 포스트의 ID (기본값 1, 유효한 ID로 설정)
   * - 로딩 상태 관리, 에러 처리, Sentry 예외 캡처 포함
   */
  const fetchPost = useCallback(async (postId = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`);

      // HTTP 오류 처리: post를 찾을 수 없는 상황을 가정
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 해당 포스트를 찾을 수 없음`, {
          name: "FetchError",
          logContext: {
            tags: { source: "api-fetch", endpoint: `/posts/${postId}` },
            extra: { status: response.status, statusText: response.statusText },
          },
        });
      }

      const data = await response.json();

      // API 응답 검증: userId 필드 존재 여부 확인
      if (!data.userId) {
        const validationError = new Error("API 응답에 userId 필드가 없음", {
          name: "ValidationError",
          logContext: {
            tags: { source: "api-validation", endpoint: `/posts/${postId}` },
            extra: { receivedData: data, expected: "userId present" },
          }
        });
        throw validationError;
      }

      setPost(data);
    } catch (err) {
      logger.error(err, err.logContext || {});
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { post, loading, error, fetchPost };
}
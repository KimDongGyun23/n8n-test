import { useCallback, useState } from "react";
export function useFetchPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(async (postId) => {
    if (!postId || postId <= 0) {
      throw new Error("Invalid postId", { name: "ValidationError" });
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 해당 포스트를 찾을 수 없음`, { name: "FetchError", logContext: { tags: { source: "api-fetch", endpoint: `/posts/${postId}` }, extra: { status: response.status, statusText: response.statusText } } });
      }
      const data = await response.json();
      if (!data.userId) {
        const validationError = new Error("API 응답에 userId 필드가 없음", { name: "ValidationError", logContext: { tags: { source: "api-validation", endpoint: `/posts/${postId}` }, extra: { receivedData: data, expected: "userId present" } } });
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
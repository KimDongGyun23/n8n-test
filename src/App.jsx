import { useEffect } from "react";
import { useFetchPost } from "./useFetchPost";

function App() {
  const { post, loading, error, fetchPost } = useFetchPost();

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return (
    <div className="app">
      <h1>JSONPlaceholder + n8n 테스트</h1>
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

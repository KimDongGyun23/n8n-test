import { captureException } from "@sentry/react";
import { useState, useCallback, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [roomId] = useState("room-12345-abcde"); // 실제 프로젝트에서 URL param처럼
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorHistory, setErrorHistory] = useState([]);
  const errorCountRef = useRef(0);
  const socketRef = useRef(null);
  const roleRef = useRef("audience"); // 실제 zustand 역할 대체

  // 가상 socket 상태 (실제 Socket.IO 상태 대체)
  const [isConnected, setIsConnected] = useState(false);
  const [activeDialog, setActiveDialog] = useState(null);

  // 실제 작업 중 발생할 법한 복잡한 이벤트 핸들러
  const setupHandlers = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    socket.on = socket.on || ((event) => console.log(`Mock on: ${event}`));
    socket.on("room:update", (data) => {
      try {
        const participants = data?.participants?.map((p) => p.userId); // ❌ data.participants undefined
        setRoomData((prev) => ({ ...prev, participants }));
      } catch (error) {
        captureException(error);
        setErrorHistory((prev) => [...prev, "room-update-parse"]);
      }
    });

    if (roleRef.current === "presenter") {
      socket.on("poll:response", (responses) => {
        try {
          const stats = responses
            .map((r) => r.choiceIndex ?? 0)
            .reduce((acc, idx) => {
              acc[idx] = (acc[idx] || 0) + 1;
              return acc;
            }, {});
          console.log("Poll stats:", stats);
        } catch (error) {
          captureException(error);
          setErrorHistory((prev) => [...prev, "poll-response-reduce"]);
        }
      });
    } else {
      socket.on("interaction:remote-control", (command) => {
        try {
          const { streamId } = command;
          if (streamId) {
            const tracks = []; // 빈 배열 시뮬 (WebRTC getVideoTracks())
            tracks[0].enabled = command.enabled; // ❌ tracks[0] undefined
          }
        } catch (error) {
          captureException(error);
          setErrorHistory((prev) => [...prev, "remote-control-stream"]);
        }
      });
    }
  }, [isConnected]);

  const cleanupHandlers = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.removeAllListeners = socket.removeAllListeners || (() => console.log("Mock cleanup"));
      socket.removeAllListeners();
    }
  }, []);

  useEffect(() => {
    socketRef.current = { on: () => {}, removeAllListeners: () => {} }; // mock socket
    setupHandlers();
    return cleanupHandlers;
  }, [setupHandlers, cleanupHandlers]);

  const loadRoomData = useCallback(async () => {
    if (!roomId.match(/^[a-z0-9-]{10,}$/)) {
      throw new Error("Invalid room ID");
    }
    setLoading(true);
    try {
      // mock API (실제 fetchRoomData 대체)
      const response = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.3) reject(new Error("Network timeout"));
          else
            resolve({
              data: { id: roomId, participants: [], polls: [{ id: "1", question: "테스트 폴" }] },
            });
        }, 1000);
      });
      setRoomData(response.data);
    } catch (error) {
      captureException(error);
      setErrorHistory((prev) => [...prev, "api-fetch"]);
      errorCountRef.current += 1;
      if (errorCountRef.current > 3) {
        setActiveDialog("retry-limit");
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // 다이얼로그 useEffect
  useEffect(() => {
    if (activeDialog === "poll-results" && roomData?.polls?.length) {
      const currentPolls = roomData.polls.filter((p) => p.active); // roomData stale 가능
      console.log("Active polls:", currentPolls);
    }
  }, [activeDialog, roomData?.polls]);

  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  if (loading) {
    return <div className="loading">방 로딩 중...</div>;
  }

  return (
    <div className="room-dashboard">
      <header className="room-header">
        <h1>방 ID: {roomId}</h1>
        <div>
          참여자: {roomData?.participants?.length || 0}명 | 연결: {isConnected ? "O" : "X"}
        </div>
        <div>역할: {roleRef.current}</div>
      </header>

      <section className="error-section">
        <h2>에러 히스토리 ({errorHistory.length})</h2>
        <div className="error-list">
          {errorHistory.length === 0 ? (
            <div className="empty-state">에러 발생 대기 중...</div>
          ) : (
            errorHistory.map((err, i) => (
              <div key={i} className="error-item">
                •{" "}
                {err
                  .replace("-", " ")
                  .replace("room", "방")
                  .replace("poll", "폴")
                  .replace("api", "API")
                  .replace("control", "원격제어")}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="controls">
        <button className="btn-reload" onClick={loadRoomData}>
          방 데이터 새로고침 (30% 실패)
        </button>
        <button
          className="btn-simulate"
          onClick={() => {
            setActiveDialog("simulate-error");
            setIsConnected(false); // 연결 끊김 시뮬
          }}
        >
          연결 끊기 + 에러 트리거
        </button>
        <button
          className="btn-role"
          onClick={() =>
            (roleRef.current = roleRef.current === "presenter" ? "audience" : "presenter")
          }
        >
          역할 변경: {roleRef.current}
        </button>
      </section>

      {roomData?.polls && (
        <section className="polls">
          <h2>폴 목록 ({roomData.polls.length})</h2>
          <ul>
            {roomData.polls.map((poll) => (
              <li key={poll.id}>{poll.question}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default App;

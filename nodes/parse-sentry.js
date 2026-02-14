/**
 * Sentry에서 전달된 에러 이벤트 데이터를 파싱하여 n8n 워크플로우에서 사용할 수 있는 형식으로 변환하는 Function 노드
 *
 * - Sentry 이벤트 구조에 따라 에러 메시지, 파일명, 라인 번호, 스택 트레이스 등을 추출
 * - event_id가 없는 경우 현재 타임스탬프를 기반으로 고유한 ID 생성
 * - 최종적으로 다음 노드로 전달할 JSON 객체 배열 반환
 */
const body = $input.first().json.body;

let errorMessage = "";
let filename = "";
let lineno = 0;
let stacktrace = "";
let eventId = "";

/**
 * Sentry 이벤트 데이터에서 에러 메시지, 파일명, 라인 번호, 스택 트레이스 등을 추출
 *
 * - event 객체가 존재하는 경우 우선적으로 해당 객체에서 정보 추출
 * - event 객체 내 exception이 존재하는 경우 type과 value를 조합하여 에러 메시지 생성
 * - 스택 트레이스는 frames 배열을 순회하여 각 프레임의 함수명, 파일명, 라인/컬럼 번호를 조합하여 생성
 * - event 객체가 없는 경우 body에서 직접 정보 추출 시도
 */
if (body.event) {
  const event = body.event;
  eventId = event.event_id || "";
  errorMessage = event.title || event.message || "";

  // event 객체 내 exception이 존재하는 경우 type과 value를 조합하여 에러 메시지 생성
  const exceptionValues = event.exception && event.exception.values;
  if (exceptionValues) {
    const exc = exceptionValues[0];
    errorMessage = exc.type + ": " + exc.value;

    // 스택 트레이스는 frames 배열을 순회하여 각 프레임의 함수명, 파일명, 라인/컬럼 번호를 조합하여 생성
    const frames = exc.stacktrace && exc.stacktrace.frames;
    if (frames && frames.length > 0) {
      const lastFrame = frames[frames.length - 1];
      filename = lastFrame.filename || "";
      lineno = lastFrame.lineno || 0;
      stacktrace = frames
        .map((f) => `at ${f.function || "?"} (${f.filename}:${f.lineno}:${f.colno})`)
        .join("\n");
    }
  }
}

// event 객체가 없는 경우 body에서 직접 정보 추출 시도
if (!errorMessage && body.message) {
  errorMessage = body.message;
  filename = body.filename || "";
  lineno = body.lineno || 0;
  stacktrace = body.stacktrace || "";
  eventId = body.event_id || "";
}

// event_id가 없는 경우 현재 타임스탬프를 기반으로 고유한 ID 생성
if (!eventId) eventId = "evt-" + Date.now();

return [{ json: { event_id: eventId, message: errorMessage, filename, lineno, stacktrace } }];

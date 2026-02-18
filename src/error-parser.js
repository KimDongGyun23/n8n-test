// 스택 트레이스 프레임 수 확장
Error.stackTraceLimit = 50;

/**
 * URL 형태의 파일 경로에서 순수 파일 경로만 추출
 */
function normalizeFilePath(rawFile) {
  try {
    const url = new URL(rawFile);
    return url.pathname.replace(/^\//, "");
  } catch {
    return rawFile.replace(/[?#].*$/, "");
  }
}

/**
 * 정규화된 프레임 객체 생성
 */
function createFrameObject(fn, file, line, col) {
  return {
    function: fn || "(anonymous)",
    file: normalizeFilePath(file),
    line: Number(line),
    column: Number(col),
  };
}

/**
 * Chrome 스택 트레이스 라인 파싱
 * - "at functionName (file:line:col)" 또는 "at file:line:col" 형식 지원
 * - 매칭 실패 시 null 반환
 * - Chrome 익명 함수는 function을 "(anonymous)"로 표기
 */
function parseChromeStack(line) {
  // 일반적인 형식: at function (file:line:col)
  const chrome = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
  if (chrome) return createFrameObject(chrome[1], chrome[2], chrome[3], chrome[4]);

  // 익명/다이렉트 형식: at file:line:col
  const chromeAnon = line.match(/at\s+(.+):(\d+):(\d+)/);
  if (chromeAnon)
    return createFrameObject("(anonymous)", chromeAnon[1], chromeAnon[2], chromeAnon[3]);

  return null;
}

/**
 * Firefox/Safari 스택 트레이스 라인 파싱
 * - "functionName@file:line:col" 형식 지원
 * - 함수명이 없는 경우 빈 문자열로 캡처되어 createFrameObject에서 처리됨
 */
function parseFirefoxStack(line) {
  // 형식: function@file:line:col (함수명 없을 시 @file:line:col)
  const firefox = line.match(/^(.*)@(.+):(\d+):(\d+)$/);
  if (firefox) return createFrameObject(firefox[1], firefox[2], firefox[3], firefox[4]);
  return null;
}

/**
 * 호출 지점 스택 캡처 (환경별 정규화)
 */
export function captureCallSite() {
  const holder = {};
  if (Error.captureStackTrace) {
    // V8 (Chrome, Node, Edge)
    Error.captureStackTrace(holder, captureCallSite);
    return holder.stack;
  }

  // Non-V8 (Safari, Firefox)
  const stack = new Error().stack;
  if (!stack) return "";

  // 최상단 Error 메시지와 captureCallSite 프레임을 제거하기 위해 세 번째 줄부터 반환
  return stack.split("\n").slice(2).join("\n");
}

/**
 * 스택 트레이스 전체 파싱
 * - Chrome, Firefox, Safari 형식 지원
 * - 매칭되는 라인만 배열로 반환
 */
export function parseStackTrace(stack) {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((line) => parseChromeStack(line) || parseFirefoxStack(line))
    .filter(Boolean);
}

/**
 * error.cause 체인 재귀 수집
 */
export function collectCauseChain(error) {
  const causes = [];
  let current = error.cause;

  while (current) {
    causes.push({
      message: current.message,
      name: current.name,
      stack: current.stack || "",
      traces: parseStackTrace(current.stack),
    });
    current = current.cause;
  }
  return causes;
}

/**
 * Sentry Webhook에서 에러 정보를 추출하는 스크립트
 *
 * n8n 워크플로우의 Code 노드에서 사용
 * 입력: Sentry Webhook의 JSON 페이로드
 * 출력: 에러 핵심 정보가 담긴 JSON 객체
 *
 * 주요 정보:
 * - issueId: Sentry 이슈 ID
 * - title: 이슈 제목
 * - level: 에러 심각도
 * - priority: Sentry에서 설정한 우선순위
 * - message: 에러 메시지
 * - errorType: 에러 유형 (예: TypeError)
 * - filename: 에러가 발생한 파일명
 * - functionName: 에러가 발생한 함수명
 */
const item = $input.first();
console.log("Received input:", JSON.stringify(item, null, 2));
// return [{ json: { body: $input.first().json.body } }];

if (!item || !item.json) {
  throw new Error("Invalid input: missing json");
}

// Sentry Webhook 기본 구조에 맞춰 파싱
const root = item.json;
const body = root.body ?? {};
const data = body.data ?? {};
const { id, title, level, metadata, priority, culprit } = data?.issue || {};

// 괄호 안 내용만 추출: ?(src/ErrorButton) -> src/ErrorButton
const innerMatch = culprit.match(/\(([^()]+)\)/);
const inner = innerMatch ? innerMatch[1] : culprit;

// 파일 경로 형태로 변경 (src/... 또는 /src/...)
const isSafePath = /^\/?src[\/\\][\w./-]+$/.test(inner);
let filePath = isSafePath ? inner.replace(/\\/g, "/") : null;

/**
 * 확장자 자동 추가: 대문자로 시작하면 .jsx, 아니면 .js
 * 유료 버전의 한계로 인해, 컴포넌트는 대문자로 시작하는 경우가 많으므로 이를 기준으로 확장자 결정
 * 예: src/ErrorButton → src/ErrorButton.jsx, src/utils/helper → src/utils/helper.js
 */
if (filePath) {
  // 마지막 세그먼트 추출
  const segments = filePath.split("/");
  const last = segments[segments.length - 1] || "";
  const firstChar = last.charAt(0);

  // 마지막 이름이 대문자로 시작하면 컴포넌트로 보고 .jsx, 아니면 .js
  if (firstChar >= "A" && firstChar <= "Z") filePath = `${filePath}.jsx`;
  else filePath = `${filePath}.js`;
}

const errorInfo = {
  issueId: id,
  title,
  level,
  priority,
  message: metadata?.value || "",
  errorType: metadata?.type || "error",
  path: filePath,
  functionName: metadata?.function || "",
};

// 다음 노드로 전달
return [{ json: errorInfo }];

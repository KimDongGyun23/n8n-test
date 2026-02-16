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
const filePath = isSafePath ? inner.replace(/\\/g, "/") : null;

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

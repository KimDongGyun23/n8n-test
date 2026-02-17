/**
 * Sentry 에러 정보 + GitHub 소스 코드를 조합하여
 * Ollama 분석 요청 프롬프트를 생성하는 n8n Code 노드
 *
 * 입력:
 * - "Extract Sentry Error" 노드: errorInfo (issueId, title, message, errorType, path, functionName, level, priority)
 * - 이전 노드 (GitHub API, Accept: v3+json): { content, encoding, sha, path, ... }
 *
 * 출력:
 *   - errorInfo 필드 + source_code, file_sha, ollama_body
 */
const githubFile = $input.first().json;
const errorInfo = $("Extract Sentry Error").first().json;

// GitHub Contents API (v3+json) 응답에서 소스 코드 & SHA 추출
let sourceCode = "// 소스 코드를 가져올 수 없음";
let fileSha = githubFile.sha ?? "unknown";

if (githubFile.encoding === "base64" && typeof githubFile.content === "string") {
  try {
    sourceCode = Buffer.from(githubFile.content, "base64").toString("utf-8");
  } catch {
    sourceCode = "// base64 디코딩 실패";
  }
} else if (typeof githubFile.content === "string") {
  sourceCode = githubFile.content;
}

// Ollama 프롬프트 생성
const prompt = `당신은 시니어 프론트엔드 개발자입니다. 아래 에러를 분석하고 수정 코드를 JSON으로 응답하세요.

## 에러 정보
- 제목: ${errorInfo.title}
- 에러 타입: ${errorInfo.errorType}
- 메시지: ${errorInfo.message}
- 파일: ${errorInfo.path}
- 함수: ${errorInfo.functionName || "알 수 없음"}
- 심각도: ${errorInfo.level} / 우선순위: ${errorInfo.priority}

## 원본 소스 코드 (${errorInfo.path})
\`\`\`
${sourceCode}
\`\`\`

## 요구사항
1. 에러 원인을 정확히 분석하세요.
2. fix_code에는 import부터 export까지 **전체 파일** 수정본을 포함하세요.
3. 수정이 필요한 부분만 변경하고, 나머지는 원본과 동일하게 유지하세요.
4. PR 본문은 동료 개발자가 이해하기 쉽게 작성하세요.

## 응답 형식 (JSON만 출력)
{
  "summary": "에러 원인 한줄 요약",
  "problemAnalysis": "에러의 근본 원인과 발생 배경",
  "fixStrategy": "수정 전략 2-3문장",
  "fixContent": "구체적으로 어떤 부분을 어떻게 고쳤는지",
  "fixCode": "import부터 export까지 전체 수정된 파일 코드",
  "testSteps": ["테스트 단계1", "단계2", "단계3"],
  "commitMsg": "fix: 구체적인 수정 내용 (50자 이내)",
  "prTitle": "Auto-fix: 에러명과 수정 내용",
  "riskLevel": "LOW | MEDIUM | HIGH"
}

JSON만 출력하세요. 코드블록이나 다른 텍스트 없이 순수 JSON만 반환하세요.`;

const ollamaBody = {
  model: "deepseek-coder-v2:16b",
  prompt,
  stream: false,
  format: "json",
  options: {
    temperature: 0.1,
    top_p: 0.9,
  },
};

return [
  {
    json: {
      ...errorInfo,
      sourceCode,
      fileSha,
      ollamaBody,
    },
  },
];

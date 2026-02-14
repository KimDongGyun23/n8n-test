/**
 * GitHub API에서 받은 파일 정보와 Sentry 에러 정보를 바탕으로
 * Ollama에 보낼 프롬프트와 요청 본문을 준비하는 n8n Function 노드
 *
 * - GitHub API 응답에서 파일 내용을 디코딩하여 원본 소스 코드 추출
 * - Sentry 에러 정보와 원본 소스 코드를 포함한 프롬프트 생성
 * - Ollama API 요청에 사용할 JSON body 생성
 */
const githubResponse = $input.first().json;

// 이전 노드에서 Sentry 에러 정보 가져오기
const prevData = $("Parse Sentry Payload").first().json;

// GitHub API에서 받은 파일 내용을 Base64에서 UTF-8로 디코딩하여 원본 소스 코드 추출
const sourceCode = Buffer.from(githubResponse.content, "base64").toString("utf-8");

const prompt = `당신은 시니어 프론트엔드 개발자입니다. 아래 에러를 분석하고 수정 코드를 JSON으로 응답하세요.

## 에러 정보
- 메시지: ${prevData.message}
- 파일: ${prevData.filename}
- 라인: ${prevData.lineno}
- 스택트레이스:
${prevData.stacktrace}

## 원본 소스 코드
\`\`\`
${sourceCode}
\`\`\`

## 분석 및 수정 요구사항
- 에러 원인 3가지 추측 (가능성 순, 각 1문장)
- 수정 전략 (왜 이 방법이 최선인가)
- fix_code: import부터 export까지 **전체 파일** 수정본
- PR 본문: 동료 개발자가 이해하기 쉬운 상세 설명 + 배경 + 테스트 방법

## 중요 규칙
- fix_code에는 반드시 파일의 전체 코드를 포함 (import ~ export)
- 수정이 필요한 부분만 변경하고, 나머지는 원본과 동일하게 유지
- 원인 3가지는 구체적
- 테스트 단계는 재현 + 검증 포함
- 절대로 함수 하나만 반환하지 마세요. 전체 파일을 반환

## 응답 형식 (JSON만 출력, 모든 값은 실제 분석 내용으로 채우세요)
{
  "summary": "{에러 원인을 한줄로 요약}",
  "possible_causes": [
    "{가장 가능성 높은 원인}",
    "{두 번째 가능성}",
    "{세 번째 가능성}"
  ],
  "fix_strategy": "{왜 이 수정 방법을 선택했는지 2-3문장}",
  "fix_code": "{import부터 export까지 전체 수정된 파일 코드}",
  "commit_msg": "{fix: 구체적인 수정 내용, 50자 이내}",
  "pr_title": "{Auto-fix: 구체적인 에러명과 수정 내용}",
  "pr_body": "{### 문제 분석\\n구체적 원인 설명\\n\\n### 수정 내용\\n무엇을 어떻게 고쳤는지\\n\\n### 테스트 방법\\n1. 구체적 재현 단계\\n2. 수정 확인 방법\\n\\n### 관련 에러 예방법\\n관련 에러 예방법}",
  "test_steps": ["{구체적 테스트 단계1}", "{단계2}", "{단계3}"],
  "risk_level": "LOW 또는 MEDIUM 또는 HIGH"
}

JSON만 출력하세요. 다른 텍스트 없이 JSON만.`;

const ollamaBody = JSON.stringify({
  model: "deepseek-coder-v2:16b",
  prompt: prompt,
  stream: false,
  format: "json",
  temperature: 0.1,
  top_p: 0.9,
});

return [
  {
    json: {
      ...prevData,
      source_code: sourceCode,
      file_sha: githubResponse.sha,
      ollama_body: ollamaBody,
    },
  },
];

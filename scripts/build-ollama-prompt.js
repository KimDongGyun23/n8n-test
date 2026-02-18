const data = $input.first().json;
const files = data.files ?? [];
const primaryFile = files[0];

const AI_TEMPRATURE = 0.1;
const AI_TOP_P = 0.9;
const AI_NUM_CTX = 8192; // 모델 컨텍스트 길이 확장

// 원인 체인 정보 가공
const causesSection =
  (data.error?.causes ?? []).length > 0
    ? data.error.causes.map((c, i) => `${i + 1}. **${c.name}**: ${c.message}`).join("\n")
    : "없음";

// AI 분석을 위한 코드 섹션 구성
const codeContextSection = files
  .map((f) => {
    return `### File: ${f.file}\n\`\`\`javascript\n${f.codeSnippet}\n\`\`\``;
  })
  .join("\n\n");

const prompt = `당신은 시니어 프론트엔드 개발자이자 디버깅 전문가입니다. 
제공된 에러 맥락과 소스 코드를 교차 분석하여 근본 원인을 찾고, 노션(Notion) 리포트용 JSON 응답을 생성하세요.

## 1. 에러 맥락
- 에러명: ${data.title}
- 메시지: ${data.error.message}
- 발생 위치: ${data.error.primaryLocation}
- 호출 흐름: ${data.error.stackSummary}
- 환경: ${data.context.os} / ${data.context.browser} (${data.context.env})

## 2. 원인 체인 (error.cause)
${causesSection}

## 3. 관련 소스 코드 (에러 지점 주변부)
${codeContextSection}

## 4. 상세 분석 및 응답 요구사항 (중요)
- **problemAnalysis**: 단순 현상이 아닌 '왜' 발생했는지 분석하세요. 핵심 키워드에 **볼드**를 사용하세요.
- **fixStrategy**: 어떤 방향으로 고칠지 1~2문장으로 요약하세요.
- **fixContent**: 구체적인 변경 사항을 **반드시 한 줄에 하나씩 글머리 기호('-')를 사용하여 리스트 형태로** 작성하세요. 각 줄 사이에는 줄바꿈을 포함하세요.
- **fixCode**: 수정이 필요한 부분만 **작업 단위(함수 또는 블록)**별로 작성하세요. 전체 파일을 작성하지 마세요. 반드시 변경 전/후의 맥락을 알 수 있는 주석을 포함하세요. 줄 번호는 반드시 포함하지 마세요.
- **riskLevel**: LOW, MEDIUM, HIGH 중 하나를 선택하세요.
- **testSteps**: 검증을 위해 필요한 단계를 배열 형태로 작성하세요.

## 5. 응답 형식 (JSON만 출력, 코드 블록 기호 \`\`\`json 금지)
{
  "summary": "한 줄 요약",
  "problemAnalysis": "근본 원인 상세 분석",
  "fixStrategy": "해결을 위한 접근 방식",
  "fixContent": "- 변경 사항 1\\n- 변경 사항 2\\n- 변경 사항 3",
  "fixFilePath": "${primaryFile?.file || "src/..."}",
  "fixCode": "// [수정된 함수/블록명]\\nfunction example() {\\n  // ... 기존 코드\\n  // FIXED: 에러 방지를 위해 null 체크 추가\\n  if (data) { \\n    // ... 수정된 로직\\n  }\\n}",
  "testSteps": ["테스트 단계 1", "단계 2"],
  "riskLevel": "LOW | MEDIUM | HIGH",
}`;

const ollamaBody = {
  model: "deepseek-coder-v2:16b",
  prompt,
  stream: false,
  format: "json",
  options: {
    temperature: AI_TEMPRATURE,
    top_p: AI_TOP_P,
    num_ctx: AI_NUM_CTX,
  },
};

return [
  {
    json: {
      ...data,
      ollamaBody,
    },
  },
];

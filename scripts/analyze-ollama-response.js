/**
 * Ollama API 응답을 파싱하여 분석 결과를 구조화하는 n8n Code 노드
 *
 * 입력:
 *   - 이전 노드 (HTTP Request → Ollama): { response, model, done, ... }
 *   - "Build Ollama Prompt" 노드: errorInfo + sourceCode, fileSha, ollamaBody
 *
 * 출력:
 *   - 에러 정보 + Ollama 분석 결과 (PR 생성에 필요한 모든 필드)
 */
const ollamaRaw = $input.first().json;
const promptData = $("Build Ollama Prompt").first().json;

// Ollama 응답 파싱
const REQUIRED_FIELDS = ["summary", "fixCode", "commitMsg", "prTitle", "riskLevel"];

let analysis;

try {
  // 응답이 문자열인지 객체인지 확인 후 파싱
  const raw = typeof ollamaRaw === "string" ? ollamaRaw : ollamaRaw.response;
  // JSON 파싱 시도 (Ollama가 JSON이 아닌 텍스트를 반환할 수도 있으므로)
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

  // 필수 필드 검증
  const missing = REQUIRED_FIELDS.filter((field) => !parsed[field]);
  if (missing.length > 0) throw new Error(`필수 필드 누락: ${missing.join(", ")}`);

  analysis = {
    summary: parsed.summary,
    problemAnalysis: parsed.problemAnalysis ?? "",
    fixStrategy: parsed.fixStrategy ?? "",
    fixContent: parsed.fixContent ?? "",
    fixCode: parsed.fixCode,
    testSteps: Array.isArray(parsed.testSteps) ? parsed.testSteps : [],
    commitMsg: parsed.commitMsg,
    prTitle: parsed.prTitle,
    riskLevel: parsed.riskLevel,
  };
} catch (err) {
  analysis = {
    summary: "Ollama 응답 파싱 실패",
    problemAnalysis: err.message,
    fixStrategy: "",
    fixContent: "",
    fixCode: "",
    testSteps: [],
    commitMsg: "",
    prTitle: "",
    riskLevel: "HIGH",
    _parseError: true,
    _rawResponse: String(ollamaRaw.response ?? "").slice(0, 2000),
  };
}

return [
  {
    json: {
      // 에러 메타 정보
      ...promptData,

      // Ollama 분석 결과
      ...analysis,
    },
  },
];

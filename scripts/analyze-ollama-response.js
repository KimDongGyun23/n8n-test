/**
 * Ollama API 응답을 파싱하여 분석 결과를 구조화하는 노드
 */
const ollamaRaw = $input.first().json;

// 명시적으로 이전 노드 이름을 지정하여 데이터 유실 방지
const promptData = $("Build Ollama Prompt").first().json;
const REQUIRED_FIELDS = ["summary", "fixCode", "riskLevel"];

let analysis;

try {
  // Ollama 노드 버전에 따라 'response' 또는 'message.content'에 담길 수 있음
  const raw = ollamaRaw.response || (ollamaRaw.message && ollamaRaw.message.content) || ollamaRaw;

  // JSON 파싱
  let parsed;
  if (typeof raw === "string") parsed = JSON.parse(raw.trim());
  else parsed = raw;

  // 필수 필드 검증
  const missing = REQUIRED_FIELDS.filter((field) => !parsed[field]);
  if (missing.length > 0) throw new Error(`필수 필드 누락: ${missing.join(", ")}`);

  // 데이터 정규화
  analysis = {
    summary: parsed.summary,
    problemAnalysis: parsed.problemAnalysis ?? "",
    fixStrategy: parsed.fixStrategy ?? "",
    fixContent: parsed.fixContent ?? "",
    fixCode: parsed.fixCode,
    fixFilePath:
      parsed.fixFilePath ?? promptData.error?.primaryLocation?.split(":")[0] ?? "unknown",
    testSteps: Array.isArray(parsed.testSteps) ? parsed.testSteps : [],
    riskLevel: parsed.riskLevel,
  };
} catch (err) {
  // 실패 시 폴백 데이터
  analysis = {
    summary: "Ollama 분석 응답 파싱 실패",
    problemAnalysis: `에러 요인: ${err.message}\n\nAI 원본 응답을 확인하세요.`,
    fixStrategy: "N/A",
    fixContent: "N/A",
    fixCode: "// AI 응답 파싱 실패로 코드를 표시할 수 없습니다.",
    fixFilePath: "unknown",
    testSteps: [],
    riskLevel: "HIGH",
    _parseError: true,
    _rawResponse: String(ollamaRaw.response || JSON.stringify(ollamaRaw)).slice(0, 1000),
  };
}

return [
  {
    json: {
      ...promptData,
      ...analysis,
    },
  },
];

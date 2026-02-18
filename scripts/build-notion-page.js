/**
 * Ollama 분석 결과를 Notion 이슈 페이지 생성 형태로 가공
 *
 * - Notion API 2000자 제한 대응 (문자열 슬라이싱 및 분할 처리 준비)
 * - 에러 리포트 가독성을 위한 Callout 블록 도입
 * - 데이터베이스 속성명 정규화
 */
const data = $input.first().json;

// AI 응답 코드 정제 (```javascript ... ``` 기호 제거)
const cleanFixCode = data.fixCode
  ? data.fixCode.replace(/```[a-z]*\n?|```/gi, "").trim()
  : "수정 코드가 생성되지 않았습니다.";

// 관련 파일 목록 정리
const relatedFiles = (data.error?.srcFiles ?? [])
  .map((f) => `${f.file} (${f.fn ?? "unknown"})`)
  .join(", ");

// Notion Rich Text 헬퍼: **bold** 패턴을 인식하여 annotations 적용
function parseMarkdown(content) {
  if (!content) return [];

  // 볼드 패턴(**text**)을 기준으로 텍스트 분할
  const parts = content.split(/(\*\*.*?\*\*)/g);

  return parts
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        // 볼드 처리
        return {
          text: { content: part.slice(2, -2) },
          annotations: { bold: true },
        };
      }
      // 일반 텍스트
      return { text: { content: part } };
    })
    .filter((p) => p.text.content.length > 0);
}

/**
 * 줄바꿈과 글머리 기호를 인식하여 Notion 블록으로 변환
 */
function processSmartBlocks(content) {
  if (!content) return [blocks.markdownText("N/A")];

  // 줄바꿈으로 나누고 빈 줄 제거
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  return lines.map((line) => {
    const trimmed = line.trim();
    // '-', '•', '*' 로 시작하는 경우 불렛 블록으로 생성
    if (/^[-•*]\s+/.test(trimmed)) {
      const cleanText = trimmed.replace(/^[-•*]\s+/, "");
      return blocks.bullet(cleanText);
    }
    // 일반 텍스트인 경우 단락 블록 생성
    return blocks.markdownText(trimmed);
  });
}

// Notion 블록 생성 유틸리티
const blocks = {
  heading: (text, level = 2) => ({
    object: "block",
    type: `heading_${level}`,
    [`heading_${level}`]: { rich_text: [{ text: { content: text } }] },
  }),
  markdownText: (content) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: parseMarkdown(content).slice(0, 50) },
  }),
  todo: (content) => ({
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: parseMarkdown(content),
      checked: false,
    },
  }),
  callout: (content, icon = "💡") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: parseMarkdown(content),
      icon: { emoji: icon },
      color: "blue_background",
    },
  }),
  code: (content, language = "javascript") => ({
    object: "block",
    type: "code",
    code: {
      rich_text: [{ text: { content: content.slice(0, 2000) } }],
      language: language,
    },
  }),
  bullet: (content) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: parseMarkdown(content) },
  }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  emptyBlock: () => ({ object: "block", type: "paragraph", paragraph: { rich_text: [] } }),
};

// Notion 페이지 제목 및 속성 설정
const riskEmoji = data.riskLevel === "HIGH" ? "🔴" : data.riskLevel === "MEDIUM" ? "🟠" : "🟡";
const pageTitle = `${data.riskLevel}: ${data.error?.message || data.title}`.slice(0, 100);

// 테스트 단계를 개별 to_do 블록 배열로 변환
const testStepBlocks =
  Array.isArray(data.testSteps) && data.testSteps.length > 0
    ? data.testSteps.map((step) => blocks.todo(step))
    : [blocks.todo("수동 테스트 및 검증 수행")];

// 노션 페이지 생성용 JSON 구조
const notionBody = {
  parent: { database_id: "30bc8de20bcb80aeb2f5f99848653d4a" },
  icon: { emoji: riskEmoji },
  properties: {
    Name: {
      title: [{ text: { content: pageTitle } }],
    },
    Status: {
      select: { name: "Open" },
    },
    "Risk Level": {
      select: { name: data.riskLevel || "MEDIUM" },
    },
    Environment: {
      select: { name: data.context?.env || "unknown" },
    },
    "File Path": {
      rich_text: [{ text: { content: data.fixFilePath || "unknown" } }],
    },
    "URL Path": {
      select: { name: data.context?.path || "/" },
    },
    "Error Type": {
      select: { name: data.error?.name || "Error" },
    },
    Timestamp: {
      date: { start: data.timestamp || new Date().toISOString() },
    },
  },
  children: [
    blocks.heading("💡 AI 원인 분석", 2),
    blocks.divider(),
    blocks.callout(data.problemAnalysis || "분석 내용 없음", "🔍"),

    blocks.emptyBlock(),

    blocks.heading("🛠️ 수정 전략 및 내용", 2),
    blocks.divider(),
    blocks.markdownText(`**수정 전략:**`),
    blocks.markdownText(`${data.fixStrategy || "N/A"}`),

    blocks.emptyBlock(),

    blocks.markdownText(`**상세 변경 내용:**`),
    ...processSmartBlocks(data.fixContent),

    blocks.emptyBlock(),

    blocks.heading(`📝 수정 코드 (${data.fixFilePath})`, 2),
    blocks.divider(),
    blocks.code(cleanFixCode, "javascript"),

    blocks.emptyBlock(),

    blocks.heading("🚨 에러 상세 로그", 2),
    blocks.divider(),
    blocks.markdownText(`**에러명:** ${data.error?.name || "Error"}`),
    blocks.markdownText(`**발생 위치:** ${data.error?.primaryLocation}`),
    blocks.markdownText(`**호출 경로:** ${data.error?.stackSummary}`),
    blocks.markdownText(`**관련 파일:** ${relatedFiles}`),

    blocks.emptyBlock(),

    blocks.heading("🔍 원본 스택 트레이스", 3),
    blocks.code(data.error?.stack || "원본 스택 정보 없음", "plain text"),

    blocks.emptyBlock(),

    blocks.heading("🔗 콜사이트 스택 (신고 지점)", 3),
    blocks.code(data.callSiteStack || "콜사이트 정보 없음", "plain text"),

    blocks.emptyBlock(),

    blocks.heading("✅ 테스트 체크리스트", 2),
    blocks.divider(),
    ...testStepBlocks,
  ],
};

return [{ json: { notionBody } }];

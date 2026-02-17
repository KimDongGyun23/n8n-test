/**
 * Ollama 분석 결과를 GitHub Draft PR 생성에 필요한 형태로 가공하는 n8n Code 노드
 *
 * 입력:
 *   - 이전 노드 (Analyze with Ollama): errorInfo + Ollama 분석 결과
 *
 * 출력:
 *   - branchName: 자동 생성된 브랜치명
 *   - base64Content: fixCode를 base64 인코딩
 *   - prBody: 마크다운 PR 본문
 *   - commitMsg, prTitle, fileSha, path 등 패스스루
 */
const data = $input.first().json;

// Ollama 파싱 실패 시 중단
if (data._parseError) {
  throw new Error(`Ollama 분석 실패: ${data.problemAnalysis}`);
}

if (!data.fixCode || !data.commitMsg || !data.prTitle) {
  throw new Error("PR 생성에 필요한 필드 누락 (fixCode, commitMsg, prTitle)");
}

// 브랜치명 생성
const timeStamp = Date.now();
const branchName = `auto-fix/sentry-${data.issueId}-${timeStamp}`;

// fixCode에서 마크다운 코드펜스 제거
const cleanCode = data.fixCode.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");

// fixCode를 base64 인코딩 (GitHub Contents API 요구사항)
const base64Content = Buffer.from(cleanCode, "utf-8").toString("base64");

// PR 본문 마크다운 생성
const testStepsStr = Array.isArray(data.testSteps)
  ? data.testSteps.map((step) => `- [ ] ${step}`).join("\n")
  : "- [ ] 수동 테스트 필요";

const prBody = `## Sentry Issue #${data.issueId}

> ${data.title}

### 요약
${data.summary}

### 위험도
**${data.riskLevel}**

---

### 원인 분석
${data.problemAnalysis}

### 수정 전략
${data.fixStrategy}

---

### 수정 파일
\`${data.path}\`

### 변경 내용
${data.fixContent}

### 테스트 체크리스트
${testStepsStr}

---
*이 PR은 Sentry Error PR Bot에 의해 자동 생성되었습니다.*`;

return [
  {
    json: {
      branchName,
      base64Content,
      prBody,
      commitMsg: data.commitMsg,
      prTitle: data.prTitle,
      fileSha: data.fileSha,
      path: data.path,
      issueId: data.issueId,
    },
  },
];

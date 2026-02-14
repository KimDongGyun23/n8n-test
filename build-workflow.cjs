const fs = require("fs");
const path = require("path");

const NODES_DIR = path.join(__dirname, "nodes");
const WORKFLOW_FILE = path.join(__dirname, "workflow-sentry-autofix.json");

// 노드 ID와 해당 노드에서 사용할 JS 코드 파일명을 매핑
const NODE_CODE_MAP = {
  "parse-sentry": "parse-sentry.js",
  "decode-source": "decode-prepare-ollama.js",
  "parse-ollama": "parse-ollama-response.js",
};

// Ollama에 전달할 프롬프트 템플릿
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, "utf-8"));

/**
 * 각 노드에 해당하는 JS 코드를 읽어서 workflow 객체의 parameters.jsCode에 삽입
 */
for (const node of workflow.nodes) {
  // 현재 노드 ID에 해당하는 JS 코드 파일명 가져오기
  const jsFile = NODE_CODE_MAP[node.id];
  if (!jsFile) continue;

  // JS 코드 파일 경로에서 코드 읽기
  const filePath = path.join(NODES_DIR, jsFile);
  const code = fs.readFileSync(filePath, "utf-8");

  // JS 코드를 한 줄 문자열로 변환 (n8n jsCode 형식)
  node.parameters.jsCode = code;
}

// 변경된 workflow 객체를 JSON 파일로 저장
fs.writeFileSync(WORKFLOW_FILE, JSON.stringify(workflow, null, 2), "utf-8");
console.log("workflow-sentry-autofix.json 파일 업데이트 완료");

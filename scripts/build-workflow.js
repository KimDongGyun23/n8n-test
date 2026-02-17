/**
 * n8n 워크플로우 빌드 스크립트
 *
 * scripts/ 디렉토리의 외부 JS 파일을 워크플로우 JSON의 jsCode로 교체
 * 사용법: node build-workflow.js
 *
 * 동작 흐름:
 * 1. n8n-workflow.json 로드
 * 2. NODE_SCRIPT_MAP에서 노드이름 → 스크립트파일 매핑 확인
 * 3. 해당 scripts/xxx.js 내용으로 jsCode 교체
 * 4. 업데이트된 workflow.json 저장
 *
 * 이점:
 * - 노드이름 변경시 MAP 만 수정
 * - 빌드 로그로 매핑 상태 확인
 *
 * 사용 패턴:
 * 1. scripts/xxx.js 수정
 * 2. node build-workflow.js
 * 3. n8n 워크플로우 JSON 재임포트
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const WORKFLOW_PATH = resolve(ROOT, "n8n-workflow.json");
const SCRIPTS_DIR = resolve(ROOT, "scripts");

const workflow = JSON.parse(readFileSync(WORKFLOW_PATH, "utf-8"));

// 노드 이름과 스크립트 파일명 매핑
const NODE_SCRIPT_MAP = {
  "Extract Sentry Error": "extract-sentry-error.js",
  "Build Ollama Prompt": "build-ollama-prompt.js",
  "Analyze with Ollama": "analyze-ollama-response.js",
};

// 매핑 기반 교체
for (const node of workflow.nodes) {
  const nodeName = node.name;
  const scriptFileName = NODE_SCRIPT_MAP[nodeName];

  // jsCode 플레이스홀더가 없거나 매핑이 없으면 건너뜀
  if (!scriptFileName || !node.parameters) continue;
  const scriptFile = resolve(SCRIPTS_DIR, scriptFileName);

  try {
    // 스크립트 파일 내용으로 jsCode 교체
    const scriptContent = readFileSync(scriptFile, "utf-8").trimEnd();
    node.parameters.jsCode = scriptContent;
    console.log(`✅ ${nodeName}: ${scriptFileName}`);
  } catch {
    console.error(`❌ ${nodeName}: ${scriptFile} not found`);
  }
}

// 업데이트된 워크플로우 JSON 저장
writeFileSync(WORKFLOW_PATH, JSON.stringify(workflow, null, 2) + "\n");
console.log(`\nWorkflow updated: ${WORKFLOW_PATH}`);

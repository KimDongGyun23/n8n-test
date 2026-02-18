/**
 * srcFiles 배열을 순회하며 각 파일의 절대 경로를 계산하고, 존재 여부를 확인한 후,
 * 에러가 발생한 위치를 중심으로 앞뒤 20줄씩의 코드 스니펫을 생성하여 반환
 *
 * - AI가 이해하기 쉽도록 줄 번호와 함께 표시
 */
const fs = require("fs");
const path = require("path");

const data = $input.first().json;

// srcFiles는 extract-error.js에서 추출된 에러 발생 위치 정보 배열 (최대 3개)
const srcFiles = (data.error?.srcFiles ?? []).slice(0, 3);

/**
 * 각 srcFile에 대해 절대 경로 계산, 존재 여부 확인, 코드 스니펫 생성
 *
 * - 존재하지 않는 파일은 exists: false로 표시
 * - 코드 스니펫은 에러 발생 위치를 중심으로 앞뒤 20줄씩 포함 (총 40줄)
 */
const files = srcFiles.map((file) => {
  const relativePath = file.file;
  const absolutePath = path.resolve("/app", relativePath);

  let exists = false;
  let codeSnippet = "";
  let sourceCode = "";

  try {
    if (fs.existsSync(absolutePath)) {
      exists = true;
      sourceCode = fs.readFileSync(absolutePath, "utf-8");

      if (file.location) {
        // "22:15" -> 22 추출
        const targetLine = parseInt(file.location.split(":")[0]);
        const lines = sourceCode.split("\n");

        // 앞뒤 20줄 범위 설정 (파일 시작과 끝 범위 체크)
        const start = Math.max(0, targetLine - 21);
        const end = Math.min(lines.length, targetLine + 20);

        // 줄 번호를 추가하여 슬라이싱
        codeSnippet = lines
          .slice(start, end)
          .map((line, index) => {
            const currLineNum = start + index + 1;
            const marker = currLineNum === targetLine ? " > " : "   ";
            return `${marker}${currLineNum} | ${line}`;
          })
          .join("\n");
      }
    }
  } catch (err) {
    codeSnippet = `// 파일 읽기 실패: ${err.message}`;
  }

  return {
    ...file,
    absolutePath,
    exists,
    codeSnippet,
  };
});

return [
  {
    json: {
      ...data,
      files,
      primarySnippet: files[0]?.codeSnippet || "코드 스니펫을 생성할 수 없습니다.",
      primaryFile: files[0]?.file || "unknown",
    },
  },
];

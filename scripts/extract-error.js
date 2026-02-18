/**
 * 프론트엔드 logger 에러 페이로드 분석 및 정규화
 *
 * - 에러 및 호출 지점(CallSite) 통합 분석
 * - 'src/' 경로를 포함한 실제 소스 코드 위치 추출 (중복 제거)
 * - 메타데이터(UA, URL) 정리
 */
const item = $input.first();
const body = item.json.body || item.json;

const { error = {}, callSite = {}, meta = {} } = body;

// 모든 트레이스 합치기 (에러 발생 지점이 앞서도록 순서 유지)
const allTraces = [...(error.traces || []), ...(callSite.traces || [])].slice(0, 3);

const seen = new Set();
const srcFiles = [];

for (const trace of allTraces) {
  if (!trace.file) continue;

  // 'src/' 경로 포함 여부 확인 후 추출
  const match = trace.file.match(/(src\/.*)$/);
  if (!match) continue;

  // 중복 제거: 동일한 파일 경로는 한 번만 기록
  const filePath = match[1];
  if (seen.has(filePath)) continue;
  seen.add(filePath);

  srcFiles.push({
    file: filePath,
    fn: trace.function,
    location: `${trace.line}:${trace.column}`,
    full: `${filePath}:${trace.line}:${trace.column}`,
  });
}

/**
 * URL에서 경로 부분만 추출 (쿼리, 해시 제거)
 */
const getUrlPath = (urlStr) => {
  if (!urlStr) return "unknown";
  const match = urlStr.match(/https?:\/\/[^\/]+(\/[^?#]*)/);
  if (match && match[1]) return match[1];

  return urlStr.startsWith("/") ? urlStr.split(/[?#]/)[0] : "/";
};

/**
 * UserAgent에서 핵심 정보만 추출
 */
function parseUA(ua) {
  if (!ua) return { browser: "unknown", os: "unknown" };

  let browser = "Other";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Other";
  if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "iOS";

  return { browser, os };
}

const uaInfo = parseUA(meta.userAgent);
const primaryLocation = srcFiles[0]?.full || "unknown";
const stackSummary = srcFiles
  .map((f) => `${f.file.split("/").pop()}:${f.location.split(":")[0]}`)
  .join(" <- ");

return [
  {
    json: {
      title: `[${error.name || "Error"}] ${error.message}`,
      callSiteStack: callSite.stack,
      error: {
        ...error,
        srcFiles,
        primaryLocation,
        stackSummary,
      },
      context: {
        url: meta.url,
        path: getUrlPath(meta.url),
        browser: uaInfo.browser,
        os: uaInfo.os,
        userAgent: meta.userAgent,
        env: meta.environment,
      },
      timestamp: meta.timestamp || new Date().toISOString(),
    },
  },
];

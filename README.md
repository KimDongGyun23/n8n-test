# Error Auto-Fix Notion Bot

## 프로젝트 소개

프론트엔드에서 발생하는 에러를 실시간으로 수집하고, Ollama(DeepSeek-Coder-V2:16b)를 통해 원인 분석 및 수정 제안을 생성한 뒤, Notion 데이터베이스에 리포트 형태로 자동 기록하는 시스템입니다.

클라우드 AI API 없이 로컬 환경에서 모든 분석이 수행되며, n8n 워크플로우 엔진이 전체 파이프라인을 관리합니다.

<br />

---

<br />

## 기술 스택

| 구분           | 기술                                                     |
| -------------- | -------------------------------------------------------- |
| **프론트엔드** | React 19, Vite 7, JavaScript (ES Modules)                |
| **에러 수집**  | 커스텀 Logger (Chrome/Firefox/Safari 스택 트레이스 파싱) |
| **워크플로우** | n8n (Docker)                                             |
| **AI 분석**    | Ollama - DeepSeek-Coder-V2:16b                           |
| **리포트**     | Notion API                                               |
| **컨테이너**   | Docker & Docker Compose                                  |

<br />

---

<br />

## 시스템 아키텍처

```
Frontend Error (React App)
        |
  logger.error() 에러 캡처
  - 스택 트레이스 & 호출 지점
  - User-Agent, URL 메타데이터
  - Error cause 체인
        |
        v
[Webhook] POST -> n8n (localhost:5678)
        |
        v
[Extract Error Info] 에러 페이로드 파싱 및 정규화
        |
        v
[Read Source Files] 에러 발생 지점의 소스 코드 읽기 (±20줄)
        |
        v
[Build Ollama Prompt] AI 분석용 프롬프트 구성
        |
        v
[Ollama API] DeepSeek-Coder-V2 분석 수행
  - 근본 원인 분석
  - 수정 전략 및 코드 제안
  - 위험도 평가 (HIGH/MEDIUM/LOW)
  - 테스트 체크리스트
        |
        v
[Build Notion Page] 분석 결과를 Notion 페이지로 변환
        |
        v
[Notion API] 데이터베이스에 이슈 리포트 생성
```

<br />

---

<br />

## 프로젝트 구조

```
.
├── src/                          # React 프론트엔드
│   ├── main.jsx                  # 앱 진입점
│   ├── App.jsx                   # 메인 컴포넌트
│   ├── useFetchPost.js           # API 호출 훅 (에러 시나리오 테스트용)
│   ├── logger.js                 # 에러 로깅 시스템
│   ├── error-parser.js           # 브라우저 스택 트레이스 파서
│   └── index.css                 # 스타일시트
├── scripts/                      # n8n 워크플로우 노드 스크립트
│   ├── extract-error.js          # 에러 페이로드 파싱
│   ├── read-source-files.js      # 소스 코드 스니펫 추출
│   ├── build-ollama-prompt.js    # AI 프롬프트 생성
│   ├── analyze-ollama-response.js # AI 응답 파싱 및 검증
│   ├── build-notion-page.js      # Notion 페이지 구조 생성
│   └── build-workflow.js         # 스크립트를 n8n 워크플로우에 임베드
├── n8n-workflow.json             # n8n 자동화 워크플로우 정의
├── docker-compose.yml            # Docker 서비스 설정 (n8n)
├── start.sh                      # 전체 서비스 시작 스크립트
├── stop.sh                       # 전체 서비스 중지 스크립트
├── .env                          # 환경 변수 (웹훅 URL, Notion DB ID 등)
├── package.json                  # Node.js 의존성
└── vite.config.js                # Vite 빌드 설정
```

<br />

---

<br />

## 주요 기능

### 에러 수집 (Logger)

- Chrome, Firefox, Safari의 스택 트레이스를 통일된 형식으로 파싱
- 동일 에러는 5초 내 재전송 차단
- 에러 발생 위치뿐 아니라 `logger.error()`가 호출된 지점까지 기록
- `error.cause`를 재귀적으로 수집하여 원인 체인 전체를 전달

<br />

### n8n 워크플로우

- 에러 발생 지점 기준 ±20줄의 코드를 읽어 AI에게 전달
- temperature=0.1 (결정적 응답), context window=8192 토큰
- 요약, 문제 분석, 수정 전략, 수정 코드, 테스트 단계, 위험도를 JSON으로 출력
- 마크다운 -> Notion 블록 변환

<br />

### Notion 리포트

페이지 본문에는 AI 원인 분석, 수정 전략, 수정 코드, 에러 스택 트레이스, 테스트 체크리스트가 포함됩니다.

| 속성            | 설명                                     |
| --------------- | ---------------------------------------- |
| **Title**       | 위험도 이모지 + 에러 요약                |
| **Status**      | 분석 완료 상태                           |
| **Risk Level**  | HIGH / MEDIUM / LOW                      |
| **File Path**   | 에러 발생 파일 경로                      |
| **Error Type**  | 에러 타입 (TypeError, ReferenceError 등) |
| **Environment** | 브라우저, OS 정보                        |
| **Timestamp**   | 에러 발생 시각                           |

<br />

---

<br />

## 사전 요구사항

- **Docker & Docker Compose**: n8n 컨테이너 실행용
- **Ollama**: 로컬에 설치되어 있어야 하며, `deepseek-coder-v2:16b` 모델이 다운로드되어 있어야 합니다.
- **Notion Integration**: Notion API 인터그레이션이 생성되어 있고, 대상 데이터베이스에 연결 권한이 부여되어야 합니다.
- **Node.js**: 프론트엔드 개발 서버 및 빌드 스크립트 실행용

<br />

### Notion 데이터베이스 속성

데이터베이스에 다음 속성이 설정되어 있어야 합니다.

| 속성명      | 타입                       |
| ----------- | -------------------------- |
| Title       | Title                      |
| Status      | Select                     |
| Risk Level  | Select (HIGH, MEDIUM, LOW) |
| Environment | Rich Text                  |
| File Path   | Rich Text                  |
| URL Path    | Rich Text                  |
| Error Type  | Rich Text                  |
| Timestamp   | Date                       |

<br />

---

<br />

## 환경 변수

`.env` 파일에 다음 변수를 설정합니다.

```env
VITE_N8N_WEBHOOK_URL=<your-n8n-webhook-url>
NOTION_DATABASE_ID=<your-notion-database-id>
```

<br />

## 실행 방법

### 서비스 시작

Ollama와 n8n을 함께 시작합니다. Ollama가 실행 중이 아니면 자동으로 시작됩니다.

```bash
bash ./start.sh
```

시작 후 접속 주소:

- **n8n**: http://localhost:5678
- **Ollama**: http://localhost:11434

<br />

### 프론트엔드 개발 서버

```bash
npm install
npm run dev
```

<br />

### 서비스 중지

```bash
bash ./stop.sh
```

<br />

---

<br />

## 워크플로우 스크립트 수정

`scripts/` 디렉토리의 노드 스크립트를 수정한 후, 변경 사항을 n8n 워크플로우 파일에 반영해야 합니다. 이 명령은 각 스크립트 파일의 내용을 `n8n-workflow.json`의 해당 노드에 임베드합니다.

```bash
node scripts/build-workflow.js
```

<br />

### 노드-스크립트 매핑

| n8n 노드명          | 스크립트 파일                        |
| ------------------- | ------------------------------------ |
| Extract Error Info  | `scripts/extract-error.js`           |
| Read Source Files   | `scripts/read-source-files.js`       |
| Build Ollama Prompt | `scripts/build-ollama-prompt.js`     |
| Analyze with Ollama | `scripts/analyze-ollama-response.js` |
| Build Notion Page   | `scripts/build-notion-page.js`       |

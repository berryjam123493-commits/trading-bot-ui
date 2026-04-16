# Trading Bot Studio - 설치/실행 가이드

## 사전 준비: Node.js 설치

현재 시스템에 Node.js 가 없어요. 먼저 설치해야 합니다.

1. https://nodejs.org 접속 → **LTS** 버전 다운로드 (Windows Installer)
2. 설치 마법사에서 **"Add to PATH"** 옵션 체크
3. 설치 후 PowerShell 또는 CMD 를 새로 열어 `node --version` 확인

## 첫 실행 (최초 1회)

1. `frontend/start.bat` 더블클릭
2. 처음 실행 시 `npm install` 이 자동으로 돌아갑니다 (2~3분)
3. 완료되면 개발 서버가 뜨고 `http://localhost:5173` 이 브라우저에서 자동으로 열립니다

## 바탕화면 바로가기 만들기

`frontend/create-desktop-shortcut.bat` 더블클릭 → 바탕화면에 `Trading Bot Studio.lnk` 가 생깁니다.
이후부터는 바탕화면 바로가기 더블클릭으로 바로 실행됩니다.

## 종료

실행 중인 콘솔 창에서 `Ctrl+C` 두 번.

## 파일 구조

```
frontend/
├── src/
│   ├── App.tsx               # 메인 컴포넌트 + 전역 상태
│   ├── main.tsx              # React 엔트리
│   ├── types.ts              # 도메인 타입
│   ├── components/
│   │   ├── Header.tsx        # 상단바 (사용자/시각/언어/디바이스 토글)
│   │   ├── Sidebar.tsx       # 왼쪽 사이드바 (봇 목록 + 백테스팅 탭)
│   │   ├── DeviceFrame.tsx   # PC/모바일 프레임 래퍼
│   │   ├── BotDetail.tsx     # 봇 상세 (3 세부 탭 컨테이너)
│   │   ├── Dashboard.tsx     # 수익률 차트 + 매매 로그
│   │   ├── BotSettings.tsx   # 파라미터/모드/일시정지
│   │   ├── CodeTab.tsx       # Monaco 에디터 + 자동 디버그
│   │   └── Backtesting.tsx   # 백테스팅 탭 + Claude 챗
│   ├── i18n/
│   │   ├── translations.ts   # 한/영 문구
│   │   └── context.tsx       # I18nProvider + useI18n
│   ├── data/
│   │   └── mockBots.ts       # 예시 봇 2개 (목업 데이터)
│   └── utils/
│       └── parseParams.ts    # 코드에서 매수/매도 파라미터 감지
├── start.bat                 # 개발 서버 실행
└── create-desktop-shortcut.bat
```

## 앞으로 수정하기 (Claude Code)

Claude Code 로 이 폴더 안의 파일들을 계속 수정하면 됩니다. Vite 가 HMR(Hot Module Replacement) 을 지원해서, 파일 저장하면 브라우저가 자동으로 업데이트됩니다.

자주 수정할 곳:
- **문구 변경**: `src/i18n/translations.ts`
- **예시 봇 추가**: `src/data/mockBots.ts`
- **전체 색상 테마**: `tailwind.config.js` 의 `brand` 팔레트
- **백엔드 연동 (나중에)**: 현재는 프론트엔드만 있음. `localhost:8000` 같은 백엔드 붙일 때 `src/api/` 폴더 추가 예정

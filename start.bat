@echo off
REM Auto Trade Studio 실행 스크립트
REM - 최초 1회는 npm install 자동 실행
REM - 그 다음부터는 바로 dev 서버 시작 + 브라우저 오픈

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [Auto Trade Studio] 처음 실행입니다. 의존성 설치 중... 잠시만 기다려주세요.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install 실패. Node.js 가 설치되어 있는지 확인하세요.
        echo https://nodejs.org 에서 LTS 버전을 설치하세요.
        pause
        exit /b 1
    )
)

echo [Auto Trade Studio] 개발 서버 시작 중...
call npm run dev

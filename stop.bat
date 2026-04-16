@echo off
REM Trading Bot Studio 중지 스크립트
REM - 숨김 실행 중인 dev 서버(node.exe)를 종료한다.
REM - 5173 포트를 점유한 프로세스를 찾아서 종료.

setlocal enabledelayedexpansion

echo [Trading Bot Studio] dev 서버 종료 중...

REM 5173 포트 LISTEN 중인 PID 찾기
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo   - PID %%a 종료
    taskkill /F /PID %%a >nul 2>&1
    set "FOUND=1"
)

if "%FOUND%"=="0" (
    echo   실행 중인 서버가 없습니다.
) else (
    echo [완료] 종료했습니다.
)

REM 사용자가 메시지 읽을 시간 (stop.bat 는 바탕화면에서 더블클릭 용도)
timeout /t 2 /nobreak >nul

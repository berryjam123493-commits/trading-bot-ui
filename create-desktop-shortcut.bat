@echo off
REM 바탕화면에 "Trading Bot Studio" 바로가기를 만든다.
REM PowerShell 로 WScript.Shell COM 객체를 사용.

setlocal
set "SCRIPT_DIR=%~dp0"
set "SHORTCUT_NAME=Trading Bot Studio.lnk"
set "DESKTOP=%USERPROFILE%\Desktop"
set "TARGET=%SCRIPT_DIR%start.bat"
set "ICON=%SCRIPT_DIR%public\app-icon.ico"

echo 바탕화면 바로가기 생성 중...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$sc = $ws.CreateShortcut('%DESKTOP%\%SHORTCUT_NAME%');" ^
    "$sc.TargetPath = '%TARGET%';" ^
    "$sc.WorkingDirectory = '%SCRIPT_DIR%';" ^
    "$sc.WindowStyle = 7;" ^
    "$sc.Description = 'Trading Bot Studio - 자동매매 봇 스튜디오';" ^
    "$sc.IconLocation = '%ICON%';" ^
    "$sc.Save();"

if errorlevel 1 (
    echo [ERROR] 바로가기 생성 실패
    pause
    exit /b 1
)

echo.
echo [완료] 바탕화면에 "%SHORTCUT_NAME%" 생성됨
echo 이제 바탕화면에서 더블클릭해서 앱을 실행할 수 있습니다.
pause

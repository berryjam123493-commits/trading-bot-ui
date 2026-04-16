@echo off
REM 바탕화면에 "Trading Bot Studio" 바로가기를 만든다.
REM PowerShell 로 WScript.Shell COM 객체를 사용.

setlocal
set "SCRIPT_DIR=%~dp0"
set "SHORTCUT_NAME=Trading Bot Studio.lnk"
set "STOP_SHORTCUT_NAME=Trading Bot Studio (Stop).lnk"
set "DESKTOP=%USERPROFILE%\Desktop"
REM wscript.exe 로 VBS 를 실행하면 cmd 창/작업표시줄 아이콘이 뜨지 않는다.
set "WSCRIPT=%WINDIR%\System32\wscript.exe"
set "TARGET=%SCRIPT_DIR%start-hidden.vbs"
set "STOP_TARGET=%SCRIPT_DIR%stop.bat"
set "ICON=%SCRIPT_DIR%public\app-icon.ico"

echo 바탕화면 바로가기 생성 중...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$sc = $ws.CreateShortcut('%DESKTOP%\%SHORTCUT_NAME%');" ^
    "$sc.TargetPath = '%WSCRIPT%';" ^
    "$sc.Arguments = '\"%TARGET%\"';" ^
    "$sc.WorkingDirectory = '%SCRIPT_DIR%';" ^
    "$sc.Description = 'Trading Bot Studio - 자동매매 봇 스튜디오';" ^
    "$sc.IconLocation = '%ICON%';" ^
    "$sc.Save();" ^
    "$sc2 = $ws.CreateShortcut('%DESKTOP%\%STOP_SHORTCUT_NAME%');" ^
    "$sc2.TargetPath = '%STOP_TARGET%';" ^
    "$sc2.WorkingDirectory = '%SCRIPT_DIR%';" ^
    "$sc2.Description = 'Trading Bot Studio 종료';" ^
    "$sc2.IconLocation = '%ICON%';" ^
    "$sc2.Save();"

if errorlevel 1 (
    echo [ERROR] 바로가기 생성 실패
    pause
    exit /b 1
)

echo.
echo [완료] 바탕화면에 바로가기 2개 생성됨:
echo   - %SHORTCUT_NAME%           (실행 / 창 안뜸)
echo   - %STOP_SHORTCUT_NAME%       (종료)
echo.
echo 이제 바탕화면에서 더블클릭해서 앱을 실행할 수 있습니다.
echo 종료는 Stop 바로가기를 클릭하세요.
pause

' Auto Trade Studio - 숨김 실행 래퍼
' wscript.exe 로 실행되면 콘솔 창/작업표시줄 아이콘 없이 start.bat 를 구동한다.
' 중지는 stop.bat 를 실행하거나 작업 관리자에서 node.exe 종료.

Set fso = CreateObject("Scripting.FileSystemObject")
Set ws = CreateObject("Wscript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = scriptDir

' 0 = SW_HIDE (창 완전 숨김), False = 비동기 실행
ws.Run """" & scriptDir & "\start.bat""", 0, False

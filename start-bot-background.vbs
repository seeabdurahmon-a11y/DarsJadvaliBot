Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

pm2Bin = currentDir & "\node_modules\.bin\pm2.cmd"
If fso.FileExists(pm2Bin) Then
    cmdToRun = "cmd.exe /c """ & pm2Bin & """ start """ & currentDir & "\ecosystem.config.cjs"""
Else
    cmdToRun = "cmd.exe /c npx pm2 start """ & currentDir & "\ecosystem.config.cjs"""
End If

WshShell.Run cmdToRun, 0, False

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\madad-talim"
WshShell.Run "npx pm2 start ecosystem.config.cjs", 0, False

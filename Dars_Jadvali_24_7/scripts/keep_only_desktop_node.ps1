$programsNode = "C:\Users\Pro\AppData\Local\Programs\nodejs"
if (Test-Path $programsNode) {
    Remove-Item -Path $programsNode -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Programs papkasidagi nusxa o'chirildi: $programsNode"
}

$desktopNode = "C:\Users\Pro\Desktop\node-v24.21.0-win-x64"

# Set PATH to point to Desktop nodejs
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath) { $userPath = "" }
$pathList = $userPath -split ";" | Where-Object { $_ -and $_ -ne $programsNode -and $_ -ne $desktopNode }
$newPath = "$desktopNode;" + ($pathList -join ";")
[System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")

Write-Host "✅ Bosh sahifadagi (Desktop) Node.js qoldirildi: $desktopNode"
Write-Host "✅ Tizim PATH to'g'ridan-to'g'ri bosh sahifadagi Node.js ga ulandi."

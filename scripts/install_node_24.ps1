$source = "C:\Users\Pro\Desktop\node-v24.21.0-win-x64"
$dest = "C:\Users\Pro\AppData\Local\Programs\nodejs"

if (-not (Test-Path $source)) {
    Write-Host "Manba papka topilmadi: $source"
    exit 1
}

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

Write-Host "Fayllar ko'chirilmoqda..."
Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force

# Update User PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not $currentPath) { $currentPath = "" }
if ($currentPath -notlike "*$dest*") {
    $newPath = "$dest;" + $currentPath
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
}

Write-Host "✅ MUVAFFAQITYATLI KO'CHIRILDI: $dest"
$nodeVersion = & "$dest\node.exe" -v
$npmVersion = & "$dest\npm.cmd" -v
Write-Host "Yangi Node.js versiyasi: $nodeVersion"
Write-Host "Yangi npm versiyasi: $npmVersion"

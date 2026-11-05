$jdkPath = "C:\Users\Pro\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
if (Test-Path "$jdkPath\bin\java.exe") {
    [System.Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkPath, 'User')
    $currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not $currentPath) { $currentPath = "" }
    if ($currentPath -notlike "*$jdkPath\bin*") {
        $newPath = "$jdkPath\bin;" + $currentPath
        [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    }
    Write-Host "✅ JAVA_HOME va PATH muvaffaqiyatli o'rnatildi: $jdkPath"
} else {
    Write-Host "JDK topilmadi: $jdkPath"
}

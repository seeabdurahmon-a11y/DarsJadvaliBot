$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17) # ssfDRIVES

$phone = $null
foreach ($item in $thisPC.Items()) {
    if ($item.Name -like "*Galaxy*" -or $item.Name -like "*S9*" -or $item.Name -like "*Samsung*" -or $item.Name -like "*Phone*") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Host "Ulangan telefon topilmadi. Kompyuterga ulangan qurilmalar:"
    foreach ($item in $thisPC.Items()) {
        Write-Host " - $($item.Name)"
    }
    exit 1
}

Write-Host "Topilgan telefon: $($phone.Name)"
$phoneFolder = $phone.GetFolder

$storage = $null
foreach ($item in $phoneFolder.Items()) {
    if ($item.Name -like "*Phone*" -or $item.Name -like "*Internal*" -or $item.Name -like "*Xotira*" -or $item.Name -like "*Память*" -or $item.Name -like "*Память устройства*") {
        $storage = $item
        break
    }
}

if (-not $storage) {
    # If only one storage item, take first
    $storage = $phoneFolder.Items().Item(0)
}

if (-not $storage) {
    Write-Host "Telefon xotirasi topilmadi (Telefon ekranini qulfdan chiqaring va 'Fayllarni uzatish / MTP' rejimini tanlang)."
    exit 1
}

Write-Host "Telefon xotirasi: $($storage.Name)"
$storageFolder = $storage.GetFolder

$download = $null
foreach ($item in $storageFolder.Items()) {
    if ($item.Name -like "*Download*" -or $item.Name -like "*Yuklab*" -or $item.Name -like "*Загрузки*") {
        $download = $item
        break
    }
}

$targetFolder = if ($download) { $download.GetFolder } else { $storageFolder }
$targetName = if ($download) { "Download (Загрузки) papkasi" } else { "Telefon asosiy xotirasi" }

Write-Host "Fayl nusxalanmoqda: $targetName ga..."

$apkFile = "D:\madad-talim\maktab-dars-jadvali.apk"
if (-not (Test-Path $apkFile)) {
    Write-Host "APK fayl topilmadi: $apkFile"
    exit 1
}

# 16 = Respond with "Yes to All" for any dialog box that is displayed
$targetFolder.CopyHere($apkFile, 16)

# Wait a few seconds for MTP async transfer
Start-Sleep -Seconds 3

Write-Host "✅ MUVAFFAQITYATLI: Yangi APK fayl Galaxy S9 telefoningizning $targetName ga nusxalandi!"

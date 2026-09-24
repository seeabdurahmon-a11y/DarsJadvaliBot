$excelPath = "C:\Users\Pro\Downloads\Telegram Desktop\21.09 ADVAL.xlsx"
if (-not (Test-Path $excelPath)) {
  $excelPath = "C:\Users\Pro\Downloads\Telegram Desktop\dars jadvali 1-chorak.xlsx"
}
Write-Output "Extracting from: $excelPath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

$allData = @()

try {
  $wb = $excel.Workbooks.Open($excelPath, 0, $true)
  foreach ($ws in $wb.Worksheets) {
    Write-Output "Processing Sheet: $($ws.Name)"
    $usedRange = $ws.UsedRange
    $val2 = $usedRange.Value2
    
    $rowCount = $val2.GetLength(0)
    $colCount = $val2.GetLength(1)
    Write-Output "Array dimensions: $rowCount x $colCount"
    
    $sheetRows = @()
    for ($r = 1; $r -le $rowCount; $r++) {
      $rowVals = @()
      for ($c = 1; $c -le $colCount; $c++) {
        $val = $val2[$r, $c]
        if ($null -eq $val) { $val = "" }
        $rowVals += [string]$val
      }
      $sheetRows += ,$rowVals
    }
    
    $allData += [PSCustomObject]@{
      SheetName = $ws.Name
      RowCount = $rowCount
      ColCount = $colCount
      Rows = $sheetRows
    }
  }
  $wb.Close($false)
} catch {
  Write-Error $_.Exception.Message
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}

$projectDir = (Get-Item "$PSScriptRoot\..").FullName
$outputPath = Join-Path $projectDir "data\excel_dump.json"
$jsonStr = $allData | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outputPath, $jsonStr, [System.Text.Encoding]::UTF8)
Write-Output "Exported to $outputPath successfully!"

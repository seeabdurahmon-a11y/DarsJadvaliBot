$excelPath = "C:\Users\Pro\Downloads\Telegram Desktop\dars jadvali 1-chorak.xlsx"
if (-not (Test-Path $excelPath)) {
  $excelPath = "C:\Users\Pro\Downloads\Telegram Desktop\Dars jadvali 1-chorak .xlsx"
}
Write-Output "Opening Excel: $excelPath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open($excelPath)
  foreach ($ws in $wb.Worksheets) {
    Write-Output "========================================"
    Write-Output "SHEET: $($ws.Name)"
    Write-Output "========================================"
    $usedRange = $ws.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count
    Write-Output "Total Rows: $rowCount, Total Cols: $colCount"
    
    for ($r = 1; $r -le $rowCount; $r++) {
      $rowVals = @()
      for ($c = 1; $c -le $colCount; $c++) {
        $val = $ws.Cells.Item($r, $c).Text
        $rowVals += [string]$val
      }
      $line = ($rowVals -join "`t").Trim()
      if ($line -replace "[\t\s]", "" -ne "") {
        Write-Output "R$($r): $line"
      }
    }
  }
  $wb.Close($false)
} catch {
  Write-Error $_.Exception.Message
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

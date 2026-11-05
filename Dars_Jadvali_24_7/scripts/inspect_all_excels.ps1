$files = @(
  "C:\Users\Pro\Downloads\Telegram Desktop\19.10.26.xlsx"
)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Output "========================================"
    Write-Output "FILE: $f"
    try {
      $wb = $excel.Workbooks.Open($f, 0, $true)
      foreach ($ws in $wb.Worksheets) {
        $used = $ws.UsedRange
        $v = $used.Value2
        if ($null -ne $v) {
          $r = $v.GetLength(0)
          $c = $v.GetLength(1)
          Write-Output "  Sheet: $($ws.Name) ($r x $c)"
        }
      }
      $wb.Close($false)
    } catch {
      Write-Error $_.Exception.Message
    }
  }
}

$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

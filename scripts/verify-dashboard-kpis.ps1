param(
  [string]$BaseUrl = "http://127.0.0.1:3000/api"
)

$ErrorActionPreference = "Stop"

function Test-KpiEndpoint {
  param([string]$Endpoint, [string]$Label)
  $url = "$BaseUrl$Endpoint"
  try {
    $r = Invoke-RestMethod -Uri $url -TimeoutSec 15 -ErrorAction Stop
    Write-Host "  PASS 200 $Label $Endpoint" -ForegroundColor Green
    return $true
  } catch {
    $code = if ($_.Exception.Response.StatusCode) { $_.Exception.Response.StatusCode.value__ } else { "ERR" }
    Write-Host "  FAIL $code $Label $Endpoint - $_" -ForegroundColor Red
    return $false
  }
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Ambition Unisex Salon Dashboard KPI Verification" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

Write-Host "[Dashboard Analytics]" -ForegroundColor Yellow
$tests = @(
  @("/dashboard-analytics/overview", "Overview KPIs"),
  @("/dashboard-analytics/revenue", "Revenue Analytics"),
  @("/dashboard-analytics/operations", "Operations KPIs"),
  @("/dashboard-analytics/staff", "Staff Analytics"),
  @("/dashboard-analytics/client-activity", "Client Activity")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host "`n[Reports]" -ForegroundColor Yellow
$tests = @(
  @("/reports", "Report Dashboard"),
  @("/reports/revenue", "Report Revenue"),
  @("/reports/bookings", "Report Bookings"),
  @("/reports/clients", "Report Clients"),
  @("/reports/staff", "Report Staff"),
  @("/reports/inventory", "Report Inventory")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host "`n[Advanced Reports]" -ForegroundColor Yellow
$tests = @(
  @("/advanced-reports", "Basic Stats"),
  @("/advanced-reports/revenue", "Revenue Stats"),
  @("/advanced-reports/bookings", "Booking Stats"),
  @("/advanced-reports/clients", "Client Stats"),
  @("/advanced-reports/staff", "Staff Stats"),
  @("/advanced-reports/inventory", "Inventory Stats"),
  @("/advanced-reports/finance", "Finance Stats")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host "`n[AI Command Center]" -ForegroundColor Yellow
$tests = @(
  @("/ai-command-center/dashboard", "AI Dashboard"),
  @("/ai-command-center/capacity-forecast", "Capacity Forecast"),
  @("/ai-command-center/staff-performance", "Staff Performance"),
  @("/ai-command-center/recommendations", "Recommendations")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host "`n[Owner Command Center]" -ForegroundColor Yellow
$tests = @(
  @("/owner-command-center", "Owner Dashboard"),
  @("/owner-command-center/health", "Health Check")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host "`n[Financial / Operational]" -ForegroundColor Yellow
$tests = @(
  @("/payments", "Payments"),
  @("/invoices", "Invoices"),
  @("/inventory/low-stock", "Low Stock"),
  @("/marketing", "Marketing"),
  @("/tasks", "Tasks"),
  @("/attendance/summary", "Attendance Summary"),
  @("/commissions/summary", "Commission Summary")
)
foreach ($t in $tests) {
  if (Test-KpiEndpoint -Endpoint $t[0] -Label $t[1]) { $passed++ } else { $failed++ }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Results: $passed PASSED, $failed FAILED" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "===========================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }

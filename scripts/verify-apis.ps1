$base = "http://localhost:3000/api"
$pass = 0
$fail = 0

$endpoints = @(
  # Core (Steps 1-10)
  @{ Url = "$base/auth/login"; Method = "POST"; Body = '{"email":"admin@ambition.com","password":"password123"}' }
  # Steps 50-64 existing
  @{ Url = "$base/branches"; Method = "GET" }
  @{ Url = "$base/services"; Method = "GET" }
  @{ Url = "$base/staff"; Method = "GET" }
  @{ Url = "$base/customers"; Method = "GET" }
  @{ Url = "$base/appointments"; Method = "GET" }
  @{ Url = "$base/inventory"; Method = "GET" }
  @{ Url = "$base/attendance"; Method = "GET" }
  @{ Url = "$base/tasks"; Method = "GET" }
  @{ Url = "$base/commissions"; Method = "GET" }
  @{ Url = "$base/message-center"; Method = "GET" }
  @{ Url = "$base/notification-templates"; Method = "GET" }
  @{ Url = "$base/automations"; Method = "GET" }
  @{ Url = "$base/advanced-reports"; Method = "GET" }
  @{ Url = "$base/audit-logs"; Method = "GET" }
  @{ Url = "$base/data-export"; Method = "GET" }
  # Step 65 - Staff Workspace
  @{ Url = "$base/staff-workspace"; Method = "GET" }
  # Step 66 - Owner Command Center
  @{ Url = "$base/owner-command-center"; Method = "GET" }
  @{ Url = "$base/owner-command-center/health"; Method = "GET" }
  # Step 67 - CRM Intelligence
  @{ Url = "$base/crm-intelligence"; Method = "GET" }
  @{ Url = "$base/crm-intelligence/segments"; Method = "GET" }
  # Step 68 - Resources
  @{ Url = "$base/resources"; Method = "GET" }
  @{ Url = "$base/resources/availability"; Method = "GET" }
  # Step 69 - Reputation
  @{ Url = "$base/reputation"; Method = "GET" }
  @{ Url = "$base/reputation/reviews"; Method = "GET" }
  # Step 70 - Surveys & Feedback
  @{ Url = "$base/surveys"; Method = "GET" }
  @{ Url = "$base/feedback"; Method = "GET" }
  # Step 71 - Delivery Settings
  @{ Url = "$base/delivery-settings"; Method = "GET" }
  @{ Url = "$base/delivery-logs"; Method = "GET" }
  @{ Url = "$base/delivery-test"; Method = "POST"; Body = "{}" }
)

Write-Host "=== API Verification Script ===" -ForegroundColor Cyan
Write-Host "Server: $base"
Write-Host ""

foreach ($ep in $endpoints) {
  try {
    $params = @{ Uri = $ep.Url; Method = $ep.Method; UseBasicParsing = $true; TimeoutSec = 15 }
    if ($ep.Body) { $params.Headers = @{ "Content-Type" = "application/json" }; $params.Body = $ep.Body }
    $r = Invoke-WebRequest @params
    Write-Host "[PASS] $($r.StatusCode) $($ep.Method) $($ep.Url)" -ForegroundColor Green
    $pass++
  } catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "???" }
    Write-Host "[FAIL] $code $($ep.Method) $($ep.Url)" -ForegroundColor Red
    $fail++
  }
}

Write-Host ""
Write-Host "Results: $pass passed, $fail failed" -ForegroundColor Cyan
if ($fail -eq 0) { Write-Host "All APIs OK!" -ForegroundColor Green }

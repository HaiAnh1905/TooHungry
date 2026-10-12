$url = "https://localhost:44353/api/app/ingredient"
$totalTime = 0
$requests = 10

Write-Host "Running $requests requests to measure API response time (Goal: < 500ms)..."

# Warm-up request
try {
    Invoke-WebRequest -Uri $url -Method Get -SkipCertificateCheck -ErrorAction SilentlyContinue | Out-Null
} catch {}

for ($i = 1; $i -le $requests; $i++) {
    $time = Measure-Command {
        try {
            Invoke-WebRequest -Uri $url -Method Get -SkipCertificateCheck -ErrorAction SilentlyContinue | Out-Null
        } catch {
        }
    }
    $totalTime += $time.TotalMilliseconds
    Write-Host "Request $i took $($time.TotalMilliseconds) ms"
}

$avgTime = $totalTime / $requests
Write-Host "Average response time: $avgTime ms"
if ($avgTime -lt 500) {
    Write-Host "PASS: Performance goal achieved (< 500ms)!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Average response time is > 500ms" -ForegroundColor Red
}

Param(
  [string]$InputFile = "results/result.json",
  [string]$OutFile = "results/summary.md"
)

if (-not (Test-Path $InputFile)) {
  Write-Error "Input file not found: $InputFile"
  exit 2
}

$lines = Get-Content -Raw -Path $InputFile -ErrorAction Stop -Encoding UTF8

# Simple counts from k6 NDJSON export
 $totalHttpReqs = ([regex]::Matches($lines, '"metric":"http_reqs"')).Count
 $failedPoints = ([regex]::Matches($lines, '"metric":"http_req_failed"[\s\S]*?"value":1')).Count

 # Counts by expected tag (expected:"true" or expected:"false")
 $httpReqsExpectedTrue = ([regex]::Matches($lines, '"metric":"http_reqs"[\s\S]*?"tags":\{[^}]*"expected":"true"[^}]*\}')).Count
 $httpReqsExpectedFalse = ([regex]::Matches($lines, '"metric":"http_reqs"[\s\S]*?"tags":\{[^}]*"expected":"false"[^}]*\}')).Count

 $httpReqFailedExpectedTrue = ([regex]::Matches($lines, '"metric":"http_req_failed"[\s\S]*?"tags":\{[^}]*"expected":"true"[^}]*\}[\s\S]*?"value":1')).Count
 $httpReqFailedExpectedFalse = ([regex]::Matches($lines, '"metric":"http_req_failed"[\s\S]*?"tags":\{[^}]*"expected":"false"[^}]*\}[\s\S]*?"value":1')).Count

# Extract check metrics (lines with "metric":"checks") and the check name tag
$checkMatches = [regex]::Matches($lines, '"metric":"checks"[\s\S]*?"tags":\{([^}]*)\}')[0..([math]::Min(1000, ([regex]::Matches($lines, '"metric":"checks"')).Count - 1))]

$checks = @{}
foreach ($m in [regex]::Matches($lines, '"metric":"checks"[\s\S]*?"tags":\{([^}]*)\}')) {
  $tags = $m.Groups[1].Value
  # find check name
  $nameMatch = [regex]::Match($tags, '"check":"([^"]+)"')
  if ($nameMatch.Success) {
    $name = $nameMatch.Groups[1].Value
    if (-not $checks.ContainsKey($name)) { $checks[$name] = 0 }
    $checks[$name] = $checks[$name] + 1
  }
}

$out = @()
$out += "# k6 run summary"
$out += "Generated: $(Get-Date -Format o)"
$out += ""
$out += "- Total http_reqs metrics lines: $totalHttpReqs"
$out += "- http_req_failed (value=1) occurrences: $failedPoints"
$out += ""
$out += "## http_reqs by tag"
$out += ('- http_reqs { expected="true" } : ' + $httpReqsExpectedTrue)
$out += ('- http_reqs { expected="false" } : ' + $httpReqsExpectedFalse)
$out += ""
$out += "## http_req_failed by tag (value=1 counts)"
$out += ('- http_req_failed { expected="true" } : ' + $httpReqFailedExpectedTrue)
$out += ('- http_req_failed { expected="false" } : ' + $httpReqFailedExpectedFalse)

if ($httpReqsExpectedFalse -gt 0) {
  $ratio = $httpReqFailedExpectedFalse / $httpReqsExpectedFalse
  if ($ratio -gt 1) { $ratio = 1 }
  $adjustedRate = [math]::Round($ratio * 100, 2)
} else {
  $adjustedRate = 0
}
$out += ""
$out += "Adjusted http_req_failed (excluding expected=true requests): $adjustedRate%"
$out += ""
$out += 'Note: k6''s raw "http_req_failed" counts any HTTP status >=400 as a failed request. This summary computes an adjusted failure rate that excludes requests tagged with expected="true" (i.e. endpoints where 4xx are accepted for headless testing). Provide a proper access token to reduce expected 4xx responses and lower the raw http_req_failed number.'
$out += ""
$out += "## Checks (counts)"
foreach ($k in $checks.Keys) {
  $out += "- $k : $($checks[$k])"
}

$out += ""
$out += "Raw file: $InputFile"

# Ensure results dir exists
$dir = Split-Path $OutFile -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$out -join "`n" | Out-File -FilePath $OutFile -Encoding UTF8
Write-Host "Wrote summary to $OutFile"

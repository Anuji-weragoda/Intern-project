<#
Runs a quick smoke test using Docker grafana/k6 image.
Requires Docker Desktop on Windows.
#>
param(
  [string]$EnvFile = "k6-auth.env.sample",
  [string]$Script = "auth-k6.js",
  [string]$BaseUrl = "http://host.docker.internal:8081",
  [int]$VUs = 5,
  [string]$Duration = "30s"
)

$cwd = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $cwd

if (-not (Test-Path $Script)) { Write-Error "k6 script not found: $Script"; exit 2 }

Write-Host "Running grafana/k6 smoke: VUs=$VUs duration=$Duration base=$BaseUrl"

$envArgs = "--env BASE_URL=$BaseUrl --env SMOKE_VUS=$VUs --env SMOKE_DURATION=$Duration"
if (Test-Path $EnvFile) { $envArgs += " --env-file $EnvFile" } else { Write-Host "Env file $EnvFile not found — using other env args only" }

$dockerCmd = "docker run --rm -v ${PWD}:/scripts -w /scripts grafana/k6 run $envArgs $Script"
Write-Host $dockerCmd
Invoke-Expression $dockerCmd

Pop-Location

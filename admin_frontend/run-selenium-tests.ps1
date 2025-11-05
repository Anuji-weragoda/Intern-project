# Starts the Vite preview server and runs the visible Selenium scenarios one by one.
# Usage: powershell -ExecutionPolicy Bypass -File .\run-selenium-tests.ps1

$projectPath = 'c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\admin_frontend'
$previewPort = 5180
$baseUrl = "http://localhost:$previewPort"

function Wait-ForServer {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 60,
        [int]$SleepMilliseconds = 500
    )

    $stopWatch = [Diagnostics.Stopwatch]::StartNew()
    while ($stopWatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -TimeoutSec 4
            if ($response.StatusCode -lt 500) {
                Write-Host "✅ Server reachable at $Url" -ForegroundColor Green
                return $true
            }
        } catch {}
        Start-Sleep -Milliseconds $SleepMilliseconds
    }
    return $false
}

function Run-Test {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][hashtable]$Environment,
        [Parameter(Mandatory = $true)][string]$ScriptPath
    )

    Write-Host ""  # blank line for readability
    Write-Host "▶️  Running $Name ..." -ForegroundColor Cyan

    # Remember original values so we can restore them afterwards.
    $originalEnv = @{}
    foreach ($key in $Environment.Keys) {
        $existing = Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue
        $originalEnv[$key] = if ($existing) { $existing.Value } else { $null }
        Set-Item -Path "Env:$key" -Value $Environment[$key]
    }

    try {
        & node $ScriptPath
        if ($LASTEXITCODE -ne 0) {
            throw "Test $Name exited with code $LASTEXITCODE"
        }
        Write-Host "✅ $Name finished" -ForegroundColor Green
    } catch {
        Write-Host "❌ $Name failed: $_" -ForegroundColor Red
    } finally {
        foreach ($key in $Environment.Keys) {
            if ($null -ne $originalEnv[$key]) {
                Set-Item -Path "Env:$key" -Value $originalEnv[$key]
            } else {
                Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host "Starting Vite preview on $baseUrl ..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "node" -ArgumentList "node_modules/vite/bin/vite.js", "preview", "--port", "$previewPort", "--strictPort", "--host", "0.0.0.0" -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru

if (-not (Wait-ForServer -Url "$baseUrl/")) {
    Write-Host "❌ Failed to reach $baseUrl within timeout" -ForegroundColor Red
    if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force }
    exit 1
}

try {
    Run-Test -Name 'Login' -ScriptPath 'e2e/selenium_tests/loginTest.js' -Environment @{
        'LOGIN_EMAIL'        = 'anujinishaweragoda1234@gmail.com'
        'LOGIN_PASSWORD'     = 'iHuyntj9P4ZTYR2@@@@'
        'BASE_URL'           = $baseUrl
        'HEADLESS'           = 'false'
    'KEEP_BROWSER_OPEN'  = 'false'
    }

    Run-Test -Name 'Role assignment' -ScriptPath 'e2e/selenium_tests/userManagementTest.js' -Environment @{
        'LOGIN_EMAIL'        = 'anujinishaweragoda1234@gmail.com'
        'LOGIN_PASSWORD'     = 'iHuyntj9P4ZTYR2@@@@'
        'BASE_URL'           = $baseUrl
        'PAGE_URL'           = "$baseUrl/admin/users"
        'HEADLESS'           = 'false'
    'KEEP_BROWSER_OPEN'  = 'false'
    }

    Run-Test -Name 'Profile update' -ScriptPath 'e2e/selenium_tests/profileTest.js' -Environment @{
        'LOGIN_EMAIL'        = 'anujinishaweragoda1234@gmail.com'
        'LOGIN_PASSWORD'     = 'iHuyntj9P4ZTYR2@@@@'
        'BASE_URL'           = $baseUrl
        'HEADLESS'           = 'false'
    'KEEP_BROWSER_OPEN'  = 'false'
    }

    Run-Test -Name 'Sign out' -ScriptPath 'e2e/selenium_tests/signOutTest.js' -Environment @{
        'LOGIN_EMAIL'        = 'anujinishaweragoda1234@gmail.com'
        'LOGIN_PASSWORD'     = 'iHuyntj9P4ZTYR2@@@@'
        'BASE_URL'           = $baseUrl
        'HEADLESS'           = 'false'
    'KEEP_BROWSER_OPEN'  = 'false'
    }
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Host "Stopping preview server (PID $($serverProcess.Id))" -ForegroundColor Yellow
        Stop-Process -Id $serverProcess.Id -Force
    }
}

Write-Host "All requested Selenium flows executed." -ForegroundColor Green

#!/usr/bin/env powershell

# Run password reset test in the correct directory

$dir = "C:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\mobile_frontend\e2e\appium"
Set-Location -Path $dir

Write-Host "Current directory: $(Get-Location)"
Write-Host "Running password reset test..."

$env:MAILSLURP_API_KEY = "c86e3a916e92cd5ccd3135c3ad403fd326a5108364fb415503bf304a571c0fae"
$env:ANDROID_UDID = "emulator-5554"

& npx wdio run wdio.conf.js --spec specs\password_reset_mailslurp.e2e.js

Write-Host "Test completed."

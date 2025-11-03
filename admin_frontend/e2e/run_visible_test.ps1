param(
  [string]$testFile = "e2e\\selenium_tests\\loginTest.js",
  [string]$nodePath = "node"
)

# This script starts the Vite preview in a new window and then launches the
# specified Node-based Selenium test in another new window so the browser can
# open visibly and the parent terminal won't block or show 'Terminate batch job?'.

Write-Host "Starting preview server in new window..."
Start-Process -FilePath powershell -ArgumentList "-NoProfile -NoExit -Command `"npm run preview:e2e`"" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Launching Selenium test ($testFile) in separate window..."
# Launch the node test in a new powershell window so it runs independently
Start-Process -FilePath powershell -ArgumentList "-NoProfile -NoExit -Command `"$env:HEADLESS='false'; $env:LOGIN_EMAIL='$env:LOGIN_EMAIL'; $env:LOGIN_PASSWORD='$env:LOGIN_PASSWORD'; & $env:COMSPEC /c $env:COMSPEC /c `"node $testFile`"`"" -WindowStyle Normal

Write-Host "Preview and test launched. Two windows should be open: one for preview and one running the test."

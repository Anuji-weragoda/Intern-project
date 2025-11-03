# PowerShell script to start server and run Selenium test in visible browser

$projectPath = 'c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\admin_frontend'

# Set environment variables
$env:LOGIN_EMAIL = 'anujinishaweragoda1234@gmail.com'
$env:LOGIN_PASSWORD = 'iHuyntj9P4ZTYR2@@@@'
$env:BASE_URL = 'http://localhost:5180'
$env:HEADLESS = 'false'
$env:KEEP_BROWSER_OPEN = 'true'

Write-Host "🚀 Starting Vite preview server on port 5180..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "node_modules/vite/bin/vite.js", "preview", "--port", "5180", "--strictPort" -WorkingDirectory $projectPath -WindowStyle Normal

Write-Host "⏳ Waiting 5 seconds for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🌐 Opening Selenium test in visible browser..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList ".\e2e\selenium_tests\loginTest.js" -WorkingDirectory $projectPath -WindowStyle Normal -Wait

Write-Host "✅ Test completed!" -ForegroundColor Green

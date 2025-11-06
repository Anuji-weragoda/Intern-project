@echo off
REM Run password reset test with MailSlurp

cd /d "C:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\mobile_frontend\e2e\appium"

echo Running password reset test...
echo Email: 60316073-a4de-48ea-a638-08801b5c8354@mailslurp.biz
echo.

set MAILSLURP_API_KEY=c86e3a916e92cd5ccd3135c3ad403fd326a5108364fb415503bf304a571c0fae
set ANDROID_UDID=emulator-5554

npx wdio run wdio.conf.js --spec specs\password_reset_mailslurp.e2e.js

pause

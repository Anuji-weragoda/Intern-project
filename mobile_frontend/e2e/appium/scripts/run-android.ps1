Param(
  [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$ApkPath = "..\..\build\app\outputs\apk\debug\app-debug.apk"
)

$ErrorActionPreference = 'Stop'

function Fail($msg) {
  Write-Error $msg
  exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir '..') | Out-Null

$apk = Resolve-Path -LiteralPath $ApkPath -ErrorAction SilentlyContinue
if (-not $apk) {
  Fail "APK not found at: $ApkPath (from $(Get-Location))"
}

if (-not (Test-Path $SdkRoot)) {
  Fail "Android SDK root not found at: $SdkRoot"
}

$adb = Join-Path $SdkRoot 'platform-tools/adb.exe'
if (-not (Test-Path $adb)) {
  Fail "adb not found at: $adb. Install Android SDK Platform-Tools in Android Studio (SDK Manager)."
}

$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:PATH = "$SdkRoot\platform-tools;$SdkRoot\tools;$env:PATH"

& $adb devices | Out-Host
$device = (& $adb devices) | Where-Object { $_ -match "`tdevice$" } | ForEach-Object { ($_ -split "`t")[0] } | Select-Object -First 1
if (-not $device) {
  Fail 'No Android emulator/device in "device" state. Start an emulator from Android Studio and try again.'
}

Write-Host "Using device: $device" -ForegroundColor Cyan

Set-Location -LiteralPath (Join-Path $scriptDir '..') | Out-Null
$env:ANDROID_APP = (Resolve-Path -LiteralPath $ApkPath)
$env:CAPS = 'android'
$env:ANDROID_UDID = $device

npm test

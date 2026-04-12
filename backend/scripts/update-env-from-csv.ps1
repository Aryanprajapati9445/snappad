# Usage: .\scripts\update-env-from-csv.ps1 -CsvPath "C:\Users\Lenovo\Downloads\credentials.csv"
param(
  [Parameter(Mandatory=$true)]
  [string]$CsvPath
)

if (-not (Test-Path $CsvPath)) {
  Write-Error "File not found: $CsvPath"
  exit 1
}

$csv = Import-Csv -Path $CsvPath

# AWS CSV columns: "User name","Access key ID","Secret access key","Status","Created"
$keyId     = ($csv | Select-Object -First 1)."Access key ID"
$secret    = ($csv | Select-Object -First 1)."Secret access key"

if (-not $keyId -or -not $secret) {
  Write-Error "Could not find 'Access key ID' or 'Secret access key' in CSV. Check the file format."
  exit 1
}

Write-Host "Found Key ID : $($keyId.Substring(0,8))..." -ForegroundColor Cyan
Write-Host "Found Secret : $($secret.Substring(0,4))...(hidden)" -ForegroundColor Cyan

$envPath = Join-Path $PSScriptRoot "..\backend\.env"
$envPath = Resolve-Path $envPath

$content = Get-Content $envPath -Raw

$content = $content -replace "AWS_ACCESS_KEY_ID=.*", "AWS_ACCESS_KEY_ID=$keyId"
$content = $content -replace "AWS_SECRET_ACCESS_KEY=.*", "AWS_SECRET_ACCESS_KEY=$secret"

Set-Content -Path $envPath -Value $content -NoNewline

Write-Host "`n✅ Updated $envPath" -ForegroundColor Green
Write-Host "   AWS_ACCESS_KEY_ID=$keyId" -ForegroundColor Green
Write-Host "   AWS_SECRET_ACCESS_KEY=$($secret.Substring(0,4))...(hidden)" -ForegroundColor Green
Write-Host "`nRestart your backend (or nodemon will auto-restart)." -ForegroundColor Yellow

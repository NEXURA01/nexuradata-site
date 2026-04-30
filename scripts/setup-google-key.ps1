# Run this in the terminal where `gcloud` is available (Cloud Code / PowerShell Extension).
# Disables the org policy that blocks key creation, then generates the SA key into secrets/.

$ErrorActionPreference = "Stop"

$project = "nexuradata-seo-bot"
$saEmail = "nexuradata-seo@$project.iam.gserviceaccount.com"
$keyPath = Join-Path "secrets" "google-sa.json"
$policyTmp = Join-Path $env:TEMP "nexuradata-policy.yaml"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "FAILED - gcloud not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "==> Writing org policy override..." -ForegroundColor Cyan
$policyBody = @"
name: projects/$project/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
    - enforce: false
"@
# Use ASCII / no-BOM to avoid gcloud YAML parse issues on Windows PowerShell 5.1
[System.IO.File]::WriteAllText($policyTmp, $policyBody, [System.Text.UTF8Encoding]::new($false))

Write-Host "==> Applying policy..." -ForegroundColor Cyan
gcloud org-policies set-policy $policyTmp
if ($LASTEXITCODE -ne 0) {
    Remove-Item $policyTmp -Force -ErrorAction SilentlyContinue
    Write-Host "FAILED - could not apply org policy" -ForegroundColor Red
    exit $LASTEXITCODE
}
Remove-Item $policyTmp -Force -ErrorAction SilentlyContinue

Write-Host "==> Waiting up to 5 min for policy propagation..." -ForegroundColor Cyan
if (-not (Test-Path secrets)) { New-Item -ItemType Directory -Path secrets | Out-Null }

$created = $false
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 30
    Write-Host "    attempt $i/10..." -ForegroundColor DarkGray
    gcloud iam service-accounts keys create $keyPath `
        --iam-account=$saEmail `
        --project=$project 2>$null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $keyPath)) { $created = $true; break }
}

Write-Host ""
Write-Host "==> Result:" -ForegroundColor Green
<<<<<<< HEAD
if (Test-Path secrets\google-sa.json) {
  Write-Host "secrets\google-sa.json: OK ($((Get-Item secrets\google-sa.json).Length) bytes)" -ForegroundColor Green
} else {
  Write-Host "FAILED — file not created" -ForegroundColor Red
}
git status --short

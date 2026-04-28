# Run this in the terminal where `gcloud` is available (Cloud Code / PowerShell Extension).
# Disables the org policy that blocks key creation, then generates the SA key into secrets/.

$ErrorActionPreference = "Stop"

Write-Host "==> Writing org policy override..." -ForegroundColor Cyan
@"
name: projects/nexuradata-seo-bot/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
    - enforce: false
"@ | Out-File -Encoding utf8 policy.yaml

Write-Host "==> Applying policy..." -ForegroundColor Cyan
gcloud org-policies set-policy policy.yaml
Remove-Item policy.yaml -Force

Write-Host "==> Waiting 60s for propagation..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

Write-Host "==> Creating service account key..." -ForegroundColor Cyan
if (-not (Test-Path secrets)) { New-Item -ItemType Directory -Path secrets | Out-Null }
gcloud iam service-accounts keys create secrets\google-sa.json `
    --iam-account=nexuradata-seo@nexuradata-seo-bot.iam.gserviceaccount.com `
    --project=nexuradata-seo-bot

Write-Host ""
Write-Host "==> Result:" -ForegroundColor Green
if (Test-Path secrets\google-sa.json) {
    Write-Host "secrets\google-sa.json: OK ($((Get-Item secrets\google-sa.json).Length) bytes)" -ForegroundColor Green
}
else {
    Write-Host "FAILED — file not created" -ForegroundColor Red
}
git status --short

#!/usr/bin/env pwsh
# scripts/push-gmail-workspace.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Push Gmail signature + auto-reply (vacation responder) to olivier@nexuradata.ca
# Requires: gws CLI authenticated (run `gws auth login` first)
# Usage:    .\scripts\push-gmail-workspace.ps1
#           .\scripts\push-gmail-workspace.ps1 -DryRun
# ─────────────────────────────────────────────────────────────────────────────
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$gws = (Get-Command gws -ErrorAction Stop).Source

function Invoke-Gws {
    param([string[]]$GwsArgs, [string]$Label)
    Write-Host "  → $Label" -ForegroundColor Cyan
    if ($DryRun) { $GwsArgs = $GwsArgs + "--dry-run" }
    $result = & $gws @GwsArgs 2>&1
    Write-Host "  ✓ Done" -ForegroundColor Green
    return $result
}

# ──────────────────────────────────────────────────────────────────
# 1. SIGNATURE
# ──────────────────────────────────────────────────────────────────
Write-Host "`n[1/2] Setting Gmail signature..." -ForegroundColor White

$signatureHtml = @'
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Georgia,'Times New Roman',serif;color:#0d0d0b;font-size:13px;line-height:1.6;max-width:500px;">
  <tr>
    <td style="padding:0 0 18px 0;">
      <a href="https://nexuradata.ca" style="display:inline-block;border:0;text-decoration:none;">
        <img src="https://nexuradata.ca/assets/nexuradata-signature.png" alt="NEXURA DATA" width="200" style="display:block;width:200px;height:auto;border:0;">
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 0 0 0;border-top:1px solid #0d0d0b;">
      <span style="font-size:15px;font-weight:bold;letter-spacing:0.4px;display:block;">Olivier Bouda</span>
      <span style="font-size:10.5px;color:#888;letter-spacing:4px;text-transform:uppercase;display:block;margin-top:3px;">C.E.O</span>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 0 16px 0;">
      <a href="tel:+14388130592" style="color:#0d0d0b;text-decoration:none;font-size:13px;">438&#x202F;813&#x2011;0592</a>
      <span style="color:#d0ccc4;font-size:13px;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
      <a href="mailto:olivier@nexuradata.ca" style="color:#0d0d0b;text-decoration:none;font-size:13px;">olivier@nexuradata.ca</a>
      <span style="color:#d0ccc4;font-size:13px;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
      <a href="https://nexuradata.ca" style="color:#0d0d0b;text-decoration:none;font-size:13px;">nexuradata.ca</a>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;border-top:0.5px solid #e0ddd6;">
      <p style="font-size:9.5px;color:#aaa;line-height:1.45;margin:0 0 4px 0;">Ce message et ses pièces jointes sont confidentiels et destinés exclusivement à leur destinataire. Si vous avez reçu ce courriel par erreur, veuillez le supprimer et en aviser l'expéditeur. Toute reproduction, diffusion ou utilisation non autorisée est interdite.</p>
      <p style="font-size:9.5px;color:#bbb;line-height:1.45;margin:0;">This message and its attachments are confidential and intended solely for the addressee. If you received this email in error, please delete it and notify the sender. Any unauthorized reproduction, distribution, or use is prohibited.</p>
    </td>
  </tr>
</table>
'@

$sigParams = @{ userId = "me"; sendAsEmail = "olivier@nexuradata.ca" } | ConvertTo-Json -Compress
$sigBody = @{ signature = $signatureHtml } | ConvertTo-Json -Compress -Depth 2

$r = Invoke-Gws -GwsArgs @("gmail", "users", "settings", "sendAs", "patch", "--params", $sigParams, "--json", $sigBody) -Label "sendAs patch"
Write-Output $r

# ──────────────────────────────────────────────────────────────────
# 2. VACATION AUTO-REPLY (always-on acknowledgement)
# ──────────────────────────────────────────────────────────────────
Write-Host "`n[2/2] Setting vacation auto-reply..." -ForegroundColor White

$autoReplyHtml = @'
<div style="font-family:Georgia,'Times New Roman',serif;color:#0d0d0b;font-size:14px;line-height:1.7;max-width:560px;">
  <p>Merci pour votre message.</p>
  <p>Nous l'avons bien reçu et nous vous répondrons dans les <strong>24 heures ouvrables</strong>.<br>
  Pour les cas urgents, veuillez appeler le <a href="tel:+14388130592" style="color:#0d0d0b;">438&nbsp;813-0592</a>.</p>
  <p style="margin-top:24px;">Thank you for your message.</p>
  <p>We have received it and will respond within <strong>24 business hours</strong>.<br>
  For urgent matters, please call <a href="tel:+14388130592" style="color:#0d0d0b;">438&nbsp;813-0592</a>.</p>
  <hr style="border:none;border-top:0.5px solid #e0ddd6;margin:24px 0;">
  <p style="font-size:12px;color:#888;">
    <strong>Olivier Bouda</strong> — C.E.O, NEXURA DATA<br>
    <a href="https://nexuradata.ca" style="color:#888;">nexuradata.ca</a> · Longueuil, Québec
  </p>
</div>
'@

$vacParams = @{ userId = "me" } | ConvertTo-Json -Compress
$vacBody = @{
    enableAutoReply    = $true
    responseSubject    = "Accusé de réception / Message received — NEXURA DATA"
    responseBodyHtml   = $autoReplyHtml
    restrictToContacts = $false
    restrictToDomain   = $false
} | ConvertTo-Json -Compress -Depth 2

$r2 = Invoke-Gws -GwsArgs @("gmail", "users", "settings", "updateVacation", "--params", $vacParams, "--json", $vacBody) -Label "updateVacation"
Write-Output $r2

Write-Host "`n✅ Gmail Workspace setup complete." -ForegroundColor Green
Write-Host @"

────────────────────────────────────────────────────────
  EMAIL ALIASES — Manual step required in Google Admin
────────────────────────────────────────────────────────
  The following addresses are referenced in the site code
  and must be routed to olivier@nexuradata.ca via:
  admin.google.com → Directory → Users → Olivier Bouda
                   → Alternate emails (aliases)

    contact@nexuradata.ca     ← main public contact
    privacy@nexuradata.ca     ← PIPEDA / privacy requests
    dossiers@nexuradata.ca    ← case tracking portal
    urgence@nexuradata.ca     ← urgent escalation
    paiements@nexuradata.ca   ← payment confirmations

  Once added as aliases, all mail routes to your inbox
  automatically — no forwarding rules needed.
────────────────────────────────────────────────────────
"@ -ForegroundColor Yellow

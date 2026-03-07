# 🚀 LF-RISKROSI: GitHub Sync Automator
# Run this script in a terminal where 'git' is installed (e.g. VS Code or GitHub Desktop)

$REPO_URL = "https://github.com/rekhasingh5964-hash/LI-RISKROSI.git"

Write-Host "🛡️ Checking Repository Status..." -ForegroundColor Cyan

# 1. Initialize Git if not present
if (!(Test-Path .git)) {
    Write-Host "🛡️ Initializing Local Repository..." -ForegroundColor Cyan
    git init
}

# 2. Add Remote if not present
# We check if origin already exists
$existingRemote = git remote 2>$null | Select-String "origin"
if (!$existingRemote) {
    Write-Host "🔗 Connecting to Remote URL: $REPO_URL" -ForegroundColor Cyan
    git remote add origin $REPO_URL
}

# 3. Stage and Commit Reliability & Recovery components
Write-Host "📦 Staging current stability & instrumentation updates..." -ForegroundColor DarkCyan
git add .

# 4. Commit with Platform Readiness flag
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "🚀 RISKROSI Platform Sync: Tier-1 Resilience & CI/CD Readiness ($timestamp)"

# 5. Push to Main
Write-Host "☁️ Syncing to GitHub (Main Branch)..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host "✅ Sync Complete! Your CI/CD pipeline is now active." -ForegroundColor Green

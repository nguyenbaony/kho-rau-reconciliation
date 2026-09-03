param (
    [string]$CommitMessage = "Auto-update reconciliation tool and datapay rules $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Continue"
$projectDir = $PSScriptRoot

Set-Location $projectDir
Write-Host "=== STARTING GIT AUTO PUSH PIPELINE ===" -ForegroundColor Cyan
Write-Host "Project Directory: $projectDir"

# 1. Check Git
$minGitPath = "C:\Users\longa\AppData\Local\MinGit\cmd\git.exe"
if (Test-Path $minGitPath) {
    $env:Path = "C:\Users\longa\AppData\Local\MinGit\cmd;" + $env:Path
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
        $env:Path += ";C:\Program Files\Git\cmd"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe") {
        $env:Path += ";$env:LOCALAPPDATA\Programs\Git\cmd"
    } else {
        Write-Error "Git executable not found in PATH or MinGit."
        exit 1
    }
}

# Ensure git config user.name / email if not configured
$currentName = git config user.name 2>$null
if ([string]::IsNullOrWhiteSpace($currentName)) {
    git config --global user.name "Kho Rau Recon Bot"
    git config --global user.email "bot@khorau-recon.local"
}

# 2. Check Git repository
if (-not (Test-Path "$projectDir\.git")) {
    Write-Host "[1/4] Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# 3. Configure Remote if provided
if ($RemoteUrl -ne "") {
    Write-Host "[2/4] Setting Git Remote: $RemoteUrl" -ForegroundColor Yellow
    $existingRemote = git remote get-url origin 2>$null
    if ($existingRemote) {
        git remote set-url origin $RemoteUrl
    } else {
        git remote add origin $RemoteUrl
    }
}

# 4. Stage and commit
Write-Host "[3/4] Staging files and creating commit..." -ForegroundColor Yellow
git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "$CommitMessage"
    Write-Host "Commit created successfully!" -ForegroundColor Green
} else {
    Write-Host "No new changes detected to commit." -ForegroundColor DarkGray
}

# 5. Push to GitHub
$hasRemote = git remote get-url origin 2>$null
if ($hasRemote) {
    Write-Host "[4/4] Pushing to GitHub remote ($hasRemote)..." -ForegroundColor Cyan
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Warning "Push was not completed. Please verify GitHub authentication (Token/SSH Key)."
    }
} else {
    Write-Host "No remote configured yet. Pass -RemoteUrl <GitHub-URL> to automatically push." -ForegroundColor Yellow
}

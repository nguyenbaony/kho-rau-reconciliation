$env:Path = "C:\Users\longa\AppData\Local\MinGit\cmd;" + $env:Path
$gh = "C:\Users\longa\AppData\Local\GitHubCLI\bin\gh.exe"

Write-Host "Configuring Git authentication via GitHub CLI..." -ForegroundColor Cyan
& $gh auth setup-git

Write-Host "Pushing main to GitHub..." -ForegroundColor Cyan
git push origin main
Write-Host "Push exit code: $LASTEXITCODE" -ForegroundColor Green

$env:Path = "$env:LOCALAPPDATA\MinGit\cmd;$env:LOCALAPPDATA\GitHubCLI\bin;" + $env:Path

Write-Host "Configuring Git authentication via GitHub CLI..." -ForegroundColor Cyan
& gh auth setup-git

Write-Host "Pushing main to GitHub (nguyenbaony/kho-rau-reconciliation)..." -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n*** DA PUSH THANH CONG LEN GITHUB! GitHub Pages se tu dong cap nhat. ***" -ForegroundColor Green
} else {
    Write-Host "`n*** Push that bai. ***" -ForegroundColor Red
}

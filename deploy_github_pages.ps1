param (
    [string]$RepoUrl = ""
)

$ghExe = "C:\Users\longa\AppData\Local\GitHubCLI\bin\gh.exe"
$gitExe = "C:\Users\longa\AppData\Local\MinGit\cmd\git.exe"

Write-Host "=== DEPLOY TO GITHUB & GITHUB PAGES ===" -ForegroundColor Cyan

if ($RepoUrl -ne "") {
    Write-Host "Configuring remote origin: $RepoUrl" -ForegroundColor Yellow
    & $gitExe remote remove origin 2>$null
    & $gitExe remote add origin $RepoUrl
    Write-Host "Pushing main branch to GitHub..." -ForegroundColor Cyan
    & $gitExe push -u origin main --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PUSH TO GITHUB COMPLETED!" -ForegroundColor Green
    }
}

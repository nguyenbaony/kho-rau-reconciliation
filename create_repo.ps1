$env:Path = "C:\Users\longa\AppData\Local\MinGit\cmd;" + $env:Path
$gh = "C:\Users\longa\AppData\Local\GitHubCLI\bin\gh.exe"

Write-Host "Creating repository on GitHub: nguyenbaony/kho-rau-reconciliation..." -ForegroundColor Cyan
& $gh repo create nguyenbaony/kho-rau-reconciliation --public --source=. --remote=origin --push

Write-Host "Repository creation result: $LASTEXITCODE"

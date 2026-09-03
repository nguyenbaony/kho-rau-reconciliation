$gh = "C:\Users\longa\AppData\Local\GitHubCLI\bin\gh.exe"
& $gh api --method POST /repos/nguyenbaony/kho-rau-reconciliation/pages -f "source[branch]=main" -f "source[path]=/"

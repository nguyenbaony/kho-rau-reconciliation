Copy-Item "index.html" "web\index.html" -Force
Copy-Item "app.js" "web\app.js" -Force
Copy-Item "telegram_groups_analysis.json" "web\telegram_groups_analysis.json" -Force
Copy-Item "Danh_Sach_459_Group_Telegram.csv" "web\Danh_Sach_459_Group_Telegram.csv" -Force

$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
Copy-Item "index.html" $desktop -Force
Copy-Item "app.js" $desktop -Force
Copy-Item "telegram_groups_analysis.json" $desktop -Force

Write-Host "Files copied to web and Desktop!"
& powershell -ExecutionPolicy Bypass -File C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\auto_push.ps1 -CommitMessage "Add Telegram groups interactive modal to web dashboard"

$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
$scratch = [System.IO.Path]::Combine("C:\Users\longa\.gemini\antigravity-ide\scratch", $name)

Copy-Item "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\send_telegram.ps1" $desktop -Force
Copy-Item "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\send_telegram.ps1" $scratch -Force
Copy-Item "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\config.json" $desktop -Force
Copy-Item "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\config.json" $scratch -Force

Write-Host "Synchronized Telegram scripts to all folders!" -ForegroundColor Green

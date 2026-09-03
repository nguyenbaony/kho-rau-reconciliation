$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
$scratch = [System.IO.Path]::Combine("C:\Users\longa\.gemini\antigravity-ide\scratch", $name)

Copy-Item "connect_telegram_session.py" $desktop -Force
Copy-Item "connect_session.ps1" $desktop -Force
Copy-Item "connect_telegram_session.py" $scratch -Force
Copy-Item "connect_session.ps1" $scratch -Force

Write-Host "Synchronized session scripts to Desktop and Scratch successfully!"

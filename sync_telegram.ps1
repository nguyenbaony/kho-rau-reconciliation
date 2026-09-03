Copy-Item "index.html" "web\index.html" -Force
Copy-Item "app.js" "web\app.js" -Force

$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
$scratch = [System.IO.Path]::Combine("C:\Users\longa\.gemini\antigravity-ide\scratch", $name)

Copy-Item "index.html" $desktop -Force
Copy-Item "app.js" $desktop -Force
Copy-Item "send_my_telegram.ps1" $desktop -Force

Copy-Item "index.html" $scratch -Force
Copy-Item "app.js" $scratch -Force
Copy-Item "send_my_telegram.ps1" $scratch -Force

Write-Host "Synchronized files successfully!"

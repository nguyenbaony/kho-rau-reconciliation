$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
$scratch = [System.IO.Path]::Combine("C:\Users\longa\.gemini\antigravity-ide\scratch", $name)

$files = @(
    "send_report_session.py",
    "Gui_Bao_Cao_Telegram.bat",
    "ny_personal_session.session",
    "telegram_auth_state.json",
    "index.html",
    "app.js",
    "config.json"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        Copy-Item $f $desktop -Force
        Copy-Item $f $scratch -Force
    }
}

Write-Host "Synchronized all session files to Desktop and Scratch successfully!" -ForegroundColor Green

$python = "C:\Users\longa\AppData\Local\PythonEmbed\python.exe"
$script = Join-Path $PSScriptRoot "connect_telegram_session.py"

& $python $script
pause

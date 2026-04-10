@echo off
cd /d C:\Users\muyan\FDV\vault\sistema-fdv\app
start powershell -NoExit -Command "cd 'C:\Users\muyan\FDV\vault\sistema-fdv\app'; Write-Host '✅ Servidor FDV iniciando...' -ForegroundColor Green; node server.js"
timeout /t 2 /nobreak >nul
start http://localhost:3000

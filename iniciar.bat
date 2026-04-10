@echo off
title FDV — Servidor Local
cd /d "%~dp0app"
echo.
echo   FDV — Iniciando servidor local...
echo   Abrindo http://localhost:3000
echo.
start "" node server.js
timeout /t 1 /nobreak > nul
start "" "http://localhost:3000"
pause

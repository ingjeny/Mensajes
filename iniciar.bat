@echo off
title Catalogo WA - Servidores
echo Iniciando Backend...
start "Backend" cmd /k "cd /d D:\Users\Aux_Sistemas\Desktop\Catalogo\backend && set PUPPETEER_SKIP_DOWNLOAD=true && npm run dev"
timeout /t 3 /nobreak >nul
echo Iniciando Frontend...
start "Frontend" cmd /k "cd /d D:\Users\Aux_Sistemas\Desktop\Catalogo\frontend && npm run dev"
timeout /t 4 /nobreak >nul
echo Abriendo navegador...
start chrome "http://localhost:5173"
echo.
echo Servidores iniciados. Podes cerrar esta ventana.
pause

@echo off
REM ============================================================
REM  CoWatch launcher
REM  Starts the Node backend and Tailscale Funnel in two
REM  separate console windows so you can watch the logs and
REM  Ctrl+C either one independently.
REM ============================================================

setlocal
set ROOT=%~dp0
set PORT=3000

echo.
echo  Starting CoWatch backend on port %PORT% ...
start "CoWatch Backend" cmd /k "cd /d %ROOT%backend && npm start"

REM Give the backend a moment to bind to the port before Funnel
REM starts proxying to it, otherwise the first few public
REM requests would get a connection-refused.
timeout /t 3 /nobreak >nul

echo  Starting Tailscale Funnel on port %PORT% ...
start "Tailscale Funnel" cmd /k "tailscale funnel %PORT%"

echo.
echo  Both processes launched in their own windows.
echo  - Close the "CoWatch Backend" window to stop the server.
echo  - Close the "Tailscale Funnel" window to stop the tunnel.
echo.
echo  You can close this launcher window now.
echo.
pause
endlocal

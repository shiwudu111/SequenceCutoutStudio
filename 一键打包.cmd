@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-internal.ps1" %*
set "BUILD_EXIT=%ERRORLEVEL%"
echo.
if not "%BUILD_EXIT%"=="0" echo Build failed. See the error above and release build logs.
if "%BUILD_EXIT%"=="0" echo Build completed. Output details are shown above.
pause
exit /b %BUILD_EXIT%

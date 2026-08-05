
@echo off
setlocal

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

echo add tools to path
setx /M PATH "%PATH%;%THISDIR%"

echo set r
setx /M r "%THISDIR%\.."

echo show file extensions
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideFileExt /t REG_DWORD /d 0 /f


set "MATCHED=black"

for %%S in (black red orange yellow green blue indigo violet) do (
    echo(%COMPUTERNAME%| findstr /I /E /C:"%%S" >nul && set "MATCHED=%%S"
)

echo Color Machine: %MATCHED%

if /I "%MATCHED%"=="black" set "BACKGROUND=0 0 0"
if /I "%MATCHED%"=="red" set "BACKGROUND=255 0 0"
if /I "%MATCHED%"=="orange" set "BACKGROUND=255 165 0"
if /I "%MATCHED%"=="yellow" set "BACKGROUND=255 255 0"
if /I "%MATCHED%"=="green" set "BACKGROUND=0 128 0"
if /I "%MATCHED%"=="blue" set "BACKGROUND=0 0 255"
if /I "%MATCHED%"=="indigo" set "BACKGROUND=75 0 130"
if /I "%MATCHED%"=="violet" set "BACKGROUND=238 130 238"
echo Background Color: %BACKGROUND%

:: background color - to fix
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Wallpapers" /v BackgroundType /t REG_DWORD /d 1 /f
reg add "HKCU\Control Panel\Desktop" /v WallPaper /t REG_SZ /d "" /f
reg add "HKCU\Control Panel\Colors" /v Background /t REG_SZ /d "%BACKGROUND%" /f

rundll32.exe user32.dll,UpdatePerUserSystemParameters


:: restart to apply reg key to show file extensions
echo restart explorer
taskkill /f /IM explorer.exe
start explorer.exe

:: other steps
:: 1. Install NVM
:: https://github.com/coreybutler/nvm-windows/releases
:: 2. Install node
:: nvm install lts
:: nvm use lts
:: node --version

endlocal
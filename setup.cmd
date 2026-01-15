
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

:: background color - to fix
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Wallpapers" /v BackgroundType /t REG_DWORD /d 1 /f
reg add "HKCU\Control Panel\Desktop" /v WallPaper /t REG_SZ /d "" /f
reg add "HKCU\Control Panel\Colors" /v Background /t REG_SZ /d "0 0 0" /f

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
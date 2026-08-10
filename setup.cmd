
@echo off
setlocal

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

echo add tools to path
setx /M PATH "%PATH%;%THISDIR%"

@REM setx requires admin

echo set r
setx /M r "%THISDIR%\.."

echo set tools
if not defined tools (
    setx /M tools "%THISDIR%"
) else (
    echo tools already set
)


:: Setup NVM and node
:: 1. Install NVM
:: https://github.com/coreybutler/nvm-windows/releases
:: 2. Install node
:: nvm install lts
:: nvm use lts
:: node --version

:: Is NVM installed?
set "do_install_nvm=true"

where nvm >nul 2>&1
if %errorlevel% EQU 0 (
    echo NVM is installed.
    call nvm version
    set "do_install_nvm="
)

set "NVM_DOWNLOAD_URL=https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe"
set "NVM_DOWNLOAD_EXE=%USERPROFILE%\Downloads\nvm-setup.exe"

if defined do_install_nvm (
    echo Install NVM
    curl -L -o "%NVM_DOWNLOAD_EXE%" "%NVM_DOWNLOAD_URL%"
    if %errorlevel% NEQ 0 (
        echo [ERROR] Failed to download NVM.
        goto :cleanup
    )
    start /wait "Install NVM" "%NVM_DOWNLOAD_EXE%"

    call nvm install lts
    call nvm use lts
    call where node
    call node --version
)

call node.exe %THISDIR%\setup.js




@REM set "MATCHED=black"

@REM for %%S in (black red orange yellow green blue indigo violet) do (
@REM     echo(%COMPUTERNAME%| findstr /I /E /C:"%%S" >nul && set "MATCHED=%%S"
@REM )

@REM echo Color Machine: %MATCHED%

@REM if /I "%MATCHED%"=="black" set "BACKGROUND=0 0 0"
@REM if /I "%MATCHED%"=="red" set "BACKGROUND=255 0 0"
@REM if /I "%MATCHED%"=="orange" set "BACKGROUND=255 165 0"
@REM if /I "%MATCHED%"=="yellow" set "BACKGROUND=255 255 0"
@REM if /I "%MATCHED%"=="green" set "BACKGROUND=0 128 0"
@REM if /I "%MATCHED%"=="blue" set "BACKGROUND=0 0 255"
@REM if /I "%MATCHED%"=="indigo" set "BACKGROUND=75 0 130"
@REM if /I "%MATCHED%"=="violet" set "BACKGROUND=238 130 238"
@REM echo Background Color: %BACKGROUND%

@REM :: background color - to fix
@REM reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Wallpapers" /v BackgroundType /t REG_DWORD /d 1 /f
@REM reg add "HKCU\Control Panel\Desktop" /v WallPaper /t REG_SZ /d "" /f
@REM reg add "HKCU\Control Panel\Colors" /v Background /t REG_SZ /d "%BACKGROUND%" /f

@REM rundll32.exe user32.dll,UpdatePerUserSystemParameters


:: restart to apply reg key to show file extensions
echo restart explorer
taskkill /f /IM explorer.exe
start explorer.exe

endlocal
@echo off
setlocal
:: Local Server Setup

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

set server_location=%1
if "%server_location%"=="help" (
    goto :help
)

if not defined server_location (
    set server_location=%USERPROFILE%\Desktop\local-server
)

:: must run as administrator
net session 1>NUL 2>NUL
if %errorlevel% neq 0 (
    echo.
    echo ERROR: This script MUST be run from an administrator command prompt.
    goto :help
)


echo.
echo Install Certificates -Must be running as admin-
echo.

set command=npx office-addin-dev-certs install --machine
echo %command%
call %command%

echo.
echo Install http-server
echo.

set command=npm install -g http-server
echo %command%
call %command%

echo.
echo create local-server folder
echo.

if not exist "%server_location%" (
    mkdir "%server_location%"
)

set index_file="%server_location%\index.txt"
if not exist %index_file% (
    echo Local Server > %index_file%
    echo %server_location% >> %index_file%
)

goto :eof

:help
echo.
echo usage: [local server directory]
echo example: %%USERPROFILE%%\Desktop\local-server
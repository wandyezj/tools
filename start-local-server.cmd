@echo off
setlocal enabledelayedexpansion
:: Local Server Start

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

set server_location=%1
set port=%2

set server_location=%1
if "%server_location%"=="help" (
    goto :help
)

if not defined server_location (
    set server_location=%USERPROFILE%\Desktop\local-server
)

if not defined port (
    set port=3000
)

if not exist "%server_location%" (
    
    echo.
    echo Creating Server
    echo.

    set command=%THISDIR%\setup-local-server.cmd "%server_location%"
    echo !command!
    call !command!
)

echo.
echo Start Local Server: %server_location%
echo.

set command=start "Local Server: %server_location%" /D "%server_location%" npx http-server %server_location% --ssl --cert %USERPROFILE%\\.office-addin-dev-certs\\localhost.crt --key %USERPROFILE%\\.office-addin-dev-certs\\localhost.key -c-1 --cors -p %port%
echo %command%
call %command%

set index_file=https://localhost:%port%/index.txt
echo.
echo Test Local Server by going to the following location in a browser:
echo.
echo %index_file%
echo.

call start msedge %index_file%


goto :eof

:usage
echo usage: [local server directory]
echo example: %%USERPROFILE%%\Desktop\local-server
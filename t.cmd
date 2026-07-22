@echo off
setlocal EnableDelayedExpansion

:: Alias for tool

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

set run=
set emit=

for /f "delims=" %%I in ('node "%THISDIR%/alias.js" --inline %*') do (
    REM echo %%I
    set "TOOL_RESULT=%%I"

    set run=
    set emit=
    if "!TOOL_RESULT:~0,5!"=="emit " (
        set emit=!TOOL_RESULT:~5!
    )

    if "!TOOL_RESULT:~0,4!"=="run " (
        set run=!TOOL_RESULT:~4!
    )
)


set "NODE_EXIT=%ERRORLEVEL%"

if not "%NODE_EXIT%"=="0" (
    exit /b %NODE_EXIT%
)

set "t_run="
set "t_emit="

if defined emit (
    set "t_emit=!emit!"
)

if defined run (
    set "t_run=!run!"
)

endlocal & set "t_run=%t_run%" & set "t_emit=%t_emit%"

if defined t_emit (
    echo %t_emit%
    set "t_exit=0"
)

if defined t_run (
    REM echo %t_run%
    call %t_run%
    set "t_exit=%ERRORLEVEL%"
)

set "t_run="
set "t_emit="
exit /b %t_exit%


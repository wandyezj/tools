@echo off
REM This script changes the current directory to the one specified in the environment variable 'r'.
if DEFINED r (
    if EXIST "%r%" (
        cd /D %r%
    )
)
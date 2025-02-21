@echo off

:: Alias for tool

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

node %THISDIR%/alias.js %*
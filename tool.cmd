@echo off

:: Usage
:: Add tool directory to environment path.
:: tool [name] [parameters ...]

set THISDIR=%~dp0
set THISDIR=%THISDIR:~,-1%

node %THISDIR%/%1.js %2 %3 %4 %5 %6 %7 %8 %9
@REM / - Arinara Network © 2026 - /
@REM This source code is the exclusive property of Arinara Network.
@REM Unauthorized use, reproduction, distribution, or modification of this
@REM code — in whole or in part — for any purpose whatsoever is strictly
@REM prohibited without prior written consent from Arinara Network as the
@REM sole legal owner of this codebase.
@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0StartArudio.ps1"
exit /b %errorlevel%

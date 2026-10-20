@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-AquaOpsDemo.ps1" -Presentation
if errorlevel 1 pause

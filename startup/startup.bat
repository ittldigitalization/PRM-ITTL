@echo off
title CRM DIGITALIZATION

echo ============================
echo Starting CRM DIGITALIZATION
echo ============================

REM Change to project folder
cd /d "%~dp0.."

REM Check if package.json exists
if not exist package.json (
    echo ERROR: package.json not found!
    echo Please check the project path.
    pause
    exit /b
)

REM Suppress node warnings and extra logs
set NODE_OPTIONS=--no-warnings
set DOTENV_CONFIG_QUIET=true
set DOTENVX_LOG_LEVEL=error

REM Build and Start the Application for the Network
npm start --silent

pause
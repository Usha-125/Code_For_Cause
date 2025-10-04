@echo off
echo ================================
echo Starting Frontend Server
echo ================================
echo.

cd frontend

echo Checking if node_modules exists...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed.
)

echo.
echo Starting development server...
call npm run dev

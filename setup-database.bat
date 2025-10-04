@echo off
echo ================================
echo Database Setup
echo ================================
echo.
echo This will run the database migration.
echo Make sure PostgreSQL is running and you have created the database.
echo.
echo To create the database, run in psql:
echo   CREATE DATABASE expense_reimbursement;
echo.
pause

cd backend
call npm run migrate

echo.
echo ================================
echo Database setup complete!
echo ================================
pause

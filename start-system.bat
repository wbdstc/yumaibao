@echo off
chcp 65001 >nul
cls

echo =====================================
echo Yumaobao System Startup Script
echo =====================================
echo.

:: 1. Check and Start MongoDB Service
echo 1. Checking MongoDB Service...
sc query MongoDB >nul 2>&1
if %ERRORLEVEL% == 1060 (
    echo    MongoDB service not installed.
) else (
    sc query MongoDB | find "RUNNING" >nul
    if %ERRORLEVEL% == 0 (
        echo    MongoDB service is already running.
    ) else (
        echo    Starting MongoDB service...
        net start MongoDB >nul 2>&1
        if %ERRORLEVEL% == 0 (
            echo    MongoDB service started successfully.
        ) else (
            echo    Failed to start MongoDB service. Please start it manually.
        )
    )
)

echo.

:: 2. Check and Start MinIO Service
echo 2. Checking MinIO Service...
tasklist | find /i "minio" >nul
if %ERRORLEVEL% == 1 (
    echo    MinIO process not running, starting...
    
    :: Check MinIO installation location
    if exist "D:\tool\minio.exe" (
        :: Start MinIO service
        echo    Starting MinIO service...
        start "MinIO" /B "D:\tool\minio.exe" server D:\minio-data
        
        :: Wait for MinIO to initialize
        echo    Waiting for MinIO to initialize...
        timeout /t 8 >nul
        
        :: Check if MinIO is running
        tasklist | find /i "minio.exe" >nul
        if not errorlevel 1 (
            echo    MinIO service started successfully. Access at http://localhost:9000
        ) else (
            echo    MinIO service might be starting. Please verify at http://localhost:9000
        )
    ) else (
        echo    MinIO executable not found at D:\tool\minio.exe.
        echo    Please check the installation path.
    )
) else (
    echo    MinIO service is already running.
)

echo.

:: 3. Start Backend Service
echo 3. Starting Backend Service...
cd /d "d:\code\yumaibao\backend"
start "Backend Service" cmd /k "npm run dev"
echo    Backend service started at http://localhost:3000

echo.

:: 4. Start Frontend Service
echo 4. Starting Frontend Service...
cd /d "d:\code\yumaibao\frontend"
start "Frontend Service" cmd /k "npm run dev"
echo    Frontend service started at http://localhost:5175

echo.
echo =====================================
echo System Startup Completed!
echo Please check each terminal window for service status.
echo =====================================
echo.
echo Press any key to close this window...
pause >nul
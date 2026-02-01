@echo off
REM Test script to verify Docker setup with new container names
REM This script tests that all services can be built and run correctly

setlocal enabledelayedexpansion

echo [INFO] Starting Docker setup verification...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Build the image
echo [INFO] Building Docker image...
docker-compose build
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    exit /b 1
)
echo [SUCCESS] Docker image built successfully

REM Test build service
echo [INFO] Testing service: build (container: repository-build)
docker-compose run --rm build echo "Container repository-build is working"
if errorlevel 1 (
    echo [ERROR] Service build failed
) else (
    echo [SUCCESS] Service build works correctly
)

REM Test other services (allow failures for quick test)
echo [INFO] Testing service: test-before (container: repository-before)
docker-compose run --rm test-before echo "Container repository-before is working" 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Service test-before works correctly
)

echo [INFO] Testing service: test-after (container: repository-after)
docker-compose run --rm test-after echo "Container repository-after is working" 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Service test-after works correctly
)

REM List containers to verify names
echo [INFO] Listing project containers:
docker ps -a --filter "name=repository" --filter "name=evaluate" --filter "name=test-all" --filter "name=orderbook"

echo [SUCCESS] Docker setup verification completed!
echo [INFO] You can now run: docker-compose run --rm test-all
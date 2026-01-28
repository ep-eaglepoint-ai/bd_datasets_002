@echo off
REM Docker Test Runner for OrderBook Aggregator (Windows)
REM This script provides easy commands to run different test scenarios

setlocal enabledelayedexpansion

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    exit /b 1
)

if "%1"=="build" (
    echo [INFO] Building Docker image...
    docker-compose build --no-cache
    if errorlevel 1 (
        echo [ERROR] Failed to build Docker image
        exit /b 1
    )
    echo [SUCCESS] Docker image built successfully
    goto :eof
)

if "%1"=="test-before" (
    echo [INFO] Testing original implementation repository_before...
    docker-compose run --rm test-before
    goto :eof
)

if "%1"=="test-after" (
    echo [INFO] Testing optimized implementation repository_after...
    docker-compose run --rm test-after
    goto :eof
)

if "%1"=="test-comparison" (
    echo [INFO] Running comparison tests...
    docker-compose run --rm test-comparison
    goto :eof
)

if "%1"=="evaluate" (
    echo [INFO] Generating evaluation report...
    docker-compose run --rm evaluate
    goto :eof
)

if "%1"=="test-memory" (
    echo [INFO] Running memory leak tests...
    docker-compose run --rm test-memory
    goto :eof
)

if "%1"=="test-all" (
    echo [INFO] Running all tests in sequence...
    docker-compose run --rm test-all
    goto :eof
)

if "%1"=="dev" (
    echo [INFO] Starting development environment...
    docker-compose run --rm dev
    goto :eof
)

if "%1"=="cleanup" (
    echo [INFO] Cleaning up Docker containers and volumes...
    docker-compose down -v --remove-orphans
    docker system prune -f
    echo [SUCCESS] Cleanup completed
    goto :eof
)

if "%1"=="verify" (
    echo [INFO] Verifying Docker setup...
    scripts\test-docker-setup.bat
    goto :eof
)

REM Default help message
echo OrderBook Aggregator Docker Test Runner (Windows)
echo ================================================
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   build           Build the Docker image
echo   verify          Verify Docker setup and container names
echo   test-before     Test original implementation (repository_before)
echo   test-after      Test optimized implementation (repository_after)
echo   test-comparison Run comparison tests between both implementations
echo   evaluate        Generate comprehensive evaluation report
echo   test-memory     Run memory leak tests
echo   test-all        Run all tests in sequence
echo   dev             Start interactive development environment
echo   cleanup         Clean up Docker containers and volumes
echo   help            Show this help message
echo.
echo Container Names:
echo   test-before     -^> repository-before
echo   test-after      -^> repository-after
echo   test-comparison -^> repository-comparison
echo   evaluate        -^> evaluate
echo   test-memory     -^> repository-memory
echo   build           -^> repository-build
echo   dev             -^> orderbook-dev
echo   test-all        -^> test-all
echo.
echo Examples:
echo   %0 build                    # Build Docker image
echo   %0 verify                   # Verify setup
echo   %0 test-all                 # Run all tests
echo   %0 test-after               # Test optimized version only
echo   %0 evaluate                 # Generate evaluation report
echo.
echo Reports will be saved to: evaluation/reports/
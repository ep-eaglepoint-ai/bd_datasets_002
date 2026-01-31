@echo off
REM Script to build and push Docker image to Docker Hub

set IMAGE_NAME=hailu3548/jr2pzv-app

echo Building Docker image: %IMAGE_NAME%
docker build -t %IMAGE_NAME% .

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo.
    echo Pushing image to Docker Hub...
    docker push %IMAGE_NAME%
    
    if %ERRORLEVEL% EQU 0 (
        echo Push successful! Image is now available at: %IMAGE_NAME%
    ) else (
        echo Push failed. Make sure you're logged in to Docker Hub:
        echo   docker login
    )
) else (
    echo Build failed!
    exit /b 1
)


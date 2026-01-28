#!/bin/bash

# Test script to verify Docker setup with new container names
# This script tests that all services can be built and run correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to test container creation
test_container() {
    local service=$1
    local container_name=$2
    
    print_status "Testing service: $service (container: $container_name)"
    
    # Build and run the service
    if docker-compose run --rm $service echo "Container $container_name is working"; then
        print_success "Service $service works correctly"
    else
        print_error "Service $service failed"
        return 1
    fi
}

# Main test execution
main() {
    print_status "Starting Docker setup verification..."
    
    # Check Docker
    check_docker
    
    # Build the image
    print_status "Building Docker image..."
    if docker-compose build; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    # Test each service
    print_status "Testing individual services..."
    
    # Test build service first
    test_container "build" "repository-build"
    
    # Test other services
    test_container "test-before" "repository-before" || true
    test_container "test-after" "repository-after" || true
    
    # List containers to verify names
    print_status "Listing project containers:"
    docker ps -a --filter "name=repository" --filter "name=evaluate" --filter "name=test-all" --filter "name=orderbook"
    
    print_success "Docker setup verification completed!"
    print_status "You can now run: docker-compose run --rm test-all"
}

# Run main function
main "$@"
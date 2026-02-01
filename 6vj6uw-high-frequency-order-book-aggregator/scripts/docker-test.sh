#!/bin/bash

# Docker Test Runner for OrderBook Aggregator
# This script provides easy commands to run different test scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
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
}

# Function to build the Docker image
build_image() {
    print_status "Building Docker image..."
    docker-compose build --no-cache
    print_success "Docker image built successfully"
}

# Function to run a specific service
run_service() {
    local service=$1
    print_status "Running service: $service"
    docker-compose run --rm $service
}

# Function to clean up containers and volumes
cleanup() {
    print_status "Cleaning up Docker containers and volumes..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Main script logic
case "$1" in
    "build")
        check_docker
        build_image
        ;;
    "test-before")
        check_docker
        print_status "Testing original implementation (repository_before)..."
        run_service test-before
        ;;
    "test-after")
        check_docker
        print_status "Testing optimized implementation (repository_after)..."
        run_service test-after
        ;;
    "test-comparison")
        check_docker
        print_status "Running comparison tests..."
        run_service test-comparison
        ;;
    "evaluate")
        check_docker
        print_status "Generating evaluation report..."
        run_service evaluate
        ;;
    "test-memory")
        check_docker
        print_status "Running memory leak tests..."
        run_service test-memory
        ;;
    "test-all")
        check_docker
        print_status "Running all tests in sequence..."
        run_service test-all
        ;;
    "dev")
        check_docker
        print_status "Starting development environment..."
        docker-compose run --rm dev
        ;;
    "cleanup")
        check_docker
        cleanup
        ;;
    "verify")
        check_docker
        print_status "Verifying Docker setup..."
        ./scripts/test-docker-setup.sh
        ;;
    "help"|"--help"|"-h"|"")
        echo "OrderBook Aggregator Docker Test Runner"
        echo "======================================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  build           Build the Docker image"
        echo "  verify          Verify Docker setup and container names"
        echo "  test-before     Test original implementation (repository_before)"
        echo "  test-after      Test optimized implementation (repository_after)"
        echo "  test-comparison Run comparison tests between both implementations"
        echo "  evaluate        Generate comprehensive evaluation report"
        echo "  test-memory     Run memory leak tests"
        echo "  test-all        Run all tests in sequence"
        echo "  dev             Start interactive development environment"
        echo "  cleanup         Clean up Docker containers and volumes"
        echo "  help            Show this help message"
        echo ""
        echo "Container Names:"
        echo "  test-before     -> repository-before"
        echo "  test-after      -> repository-after"
        echo "  test-comparison -> repository-comparison"
        echo "  evaluate        -> evaluate"
        echo "  test-memory     -> repository-memory"
        echo "  build           -> repository-build"
        echo "  dev             -> orderbook-dev"
        echo "  test-all        -> test-all"
        echo ""
        echo "Examples:"
        echo "  $0 build                    # Build Docker image"
        echo "  $0 verify                   # Verify setup"
        echo "  $0 test-all                 # Run all tests"
        echo "  $0 test-after               # Test optimized version only"
        echo "  $0 evaluate                 # Generate evaluation report"
        echo ""
        echo "Reports will be saved to: evaluation/reports/"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac
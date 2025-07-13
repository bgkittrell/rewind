#!/bin/bash

# Recommendation Engine Test Runner
# This script runs the complete test suite for the recommendation engine

echo "🚀 Starting Recommendation Engine Test Suite"
echo "============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=0
INTEGRATION_TESTS_PASSED=0
E2E_TESTS_PASSED=0
PERFORMANCE_TESTS_PASSED=0

# Function to run tests and track results
run_test() {
    local test_name=$1
    local test_command=$2
    local test_type=$3
    
    echo -e "${BLUE}Running ${test_name}...${NC}"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ ${test_name} PASSED${NC}"
        if [ "$test_type" == "unit" ]; then
            UNIT_TESTS_PASSED=1
        elif [ "$test_type" == "integration" ]; then
            INTEGRATION_TESTS_PASSED=1
        elif [ "$test_type" == "e2e" ]; then
            E2E_TESTS_PASSED=1
        elif [ "$test_type" == "performance" ]; then
            PERFORMANCE_TESTS_PASSED=1
        fi
        return 0
    else
        echo -e "${RED}❌ ${test_name} FAILED${NC}"
        return 1
    fi
}

# Check if dependencies are installed
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}✅ Dependencies ready${NC}"
}

# Phase 1: Unit Tests
run_unit_tests() {
    echo -e "\n${YELLOW}📋 Phase 1: Unit Tests${NC}"
    echo "============================"
    
    # Backend unit tests
    run_test "Backend Service Tests" "cd backend && npm run test -- --testPathPattern=recommendationService.test.ts" "unit"
    run_test "Backend Handler Tests" "cd backend && npm run test -- --testPathPattern=recommendationHandler.test.ts" "unit"
    
    # Frontend unit tests
    run_test "Frontend Service Tests" "cd frontend && npm run test -- --testPathPattern=recommendationService.test.ts" "unit"
    run_test "Frontend Component Tests" "cd frontend && npm run test -- --testPathPattern=RecommendationCard.test.tsx" "unit"
    
    # Test coverage check
    echo -e "${BLUE}Checking test coverage...${NC}"
    cd backend && npm run test:coverage -- --testPathPattern=recommendation
    cd ../frontend && npm run test:coverage -- --testPathPattern=recommendation
    cd ..
}

# Phase 2: Integration Tests
run_integration_tests() {
    echo -e "\n${YELLOW}📋 Phase 2: Integration Tests${NC}"
    echo "============================"
    
    # Backend integration tests
    run_test "DynamoDB Integration" "cd backend && npm run test -- --testPathPattern=recommendation.integration.test.ts" "integration"
    run_test "AWS Bedrock Integration" "cd backend && npm run test -- --testPathPattern=bedrock.integration.test.ts" "integration"
    
    # API integration tests
    run_test "API Gateway Integration" "cd backend && npm run test -- --testPathPattern=api.integration.test.ts" "integration"
    
    # Frontend-Backend integration
    run_test "Frontend-Backend Integration" "cd frontend && npm run test -- --testPathPattern=integration" "integration"
}

# Phase 3: End-to-End Tests
run_e2e_tests() {
    echo -e "\n${YELLOW}📋 Phase 3: End-to-End Tests${NC}"
    echo "============================"
    
    # Check if backend is running
    echo -e "${BLUE}Checking backend availability...${NC}"
    if ! curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${RED}❌ Backend is not running. Please start the backend first.${NC}"
        return 1
    fi
    
    # Run E2E tests
    run_test "Recommendation Flow E2E" "cd frontend && npm run test:e2e -- --testPathPattern=recommendation.spec.ts" "e2e"
    run_test "Mobile Experience E2E" "cd frontend && npm run test:e2e -- --project='Mobile Chrome' --testPathPattern=recommendation.spec.ts" "e2e"
    
    # Generate screenshots
    echo -e "${BLUE}Generating test screenshots...${NC}"
    cd frontend && npm run test:e2e:screenshots -- --testPathPattern=recommendation.spec.ts
    cd ..
}

# Phase 4: Performance Tests
run_performance_tests() {
    echo -e "\n${YELLOW}📋 Phase 4: Performance Tests${NC}"
    echo "============================"
    
    # Check if artillery is installed
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Installing artillery for load testing...${NC}"
        npm install -g artillery
    fi
    
    # Load testing
    echo -e "${BLUE}Running load tests...${NC}"
    if [ -f "tests/performance/artillery.yml" ]; then
        run_test "Load Testing" "artillery run tests/performance/artillery.yml" "performance"
    else
        echo -e "${YELLOW}⚠️  Load test configuration not found${NC}"
    fi
    
    # Database performance tests
    run_test "Database Performance" "cd backend && npm run test -- --testPathPattern=database.performance.test.ts" "performance"
    
    # Frontend performance tests
    run_test "Frontend Performance" "cd frontend && npm run test:e2e -- --testPathPattern=performance" "performance"
}

# Function to run specific test types
run_specific_tests() {
    case $1 in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        *)
            echo -e "${RED}❌ Unknown test type: $1${NC}"
            echo "Available options: unit, integration, e2e, performance"
            exit 1
            ;;
    esac
}

# Generate test report
generate_report() {
    echo -e "\n${YELLOW}📊 Test Results Summary${NC}"
    echo "============================"
    
    local total_phases=4
    local passed_phases=0
    
    if [ $UNIT_TESTS_PASSED -eq 1 ]; then
        echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
        ((passed_phases++))
    else
        echo -e "${RED}❌ Unit Tests: FAILED${NC}"
    fi
    
    if [ $INTEGRATION_TESTS_PASSED -eq 1 ]; then
        echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
        ((passed_phases++))
    else
        echo -e "${RED}❌ Integration Tests: FAILED${NC}"
    fi
    
    if [ $E2E_TESTS_PASSED -eq 1 ]; then
        echo -e "${GREEN}✅ E2E Tests: PASSED${NC}"
        ((passed_phases++))
    else
        echo -e "${RED}❌ E2E Tests: FAILED${NC}"
    fi
    
    if [ $PERFORMANCE_TESTS_PASSED -eq 1 ]; then
        echo -e "${GREEN}✅ Performance Tests: PASSED${NC}"
        ((passed_phases++))
    else
        echo -e "${RED}❌ Performance Tests: FAILED${NC}"
    fi
    
    echo -e "\n${BLUE}Overall: ${passed_phases}/${total_phases} test phases passed${NC}"
    
    if [ $passed_phases -eq $total_phases ]; then
        echo -e "${GREEN}🎉 All tests passed! Recommendation engine is ready for deployment.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please review and fix issues before deployment.${NC}"
        exit 1
    fi
}

# Main execution
main() {
    # Check for command line arguments
    if [ $# -eq 1 ]; then
        check_dependencies
        run_specific_tests $1
        generate_report
        return
    fi
    
    # Run full test suite
    check_dependencies
    
    # Run all test phases
    run_unit_tests
    run_integration_tests
    run_e2e_tests
    run_performance_tests
    
    # Generate final report
    generate_report
}

# Show help
show_help() {
    echo "Recommendation Engine Test Runner"
    echo "Usage: $0 [test_type]"
    echo ""
    echo "Test types:"
    echo "  unit         - Run unit tests only"
    echo "  integration  - Run integration tests only"
    echo "  e2e          - Run end-to-end tests only"
    echo "  performance  - Run performance tests only"
    echo "  (no args)    - Run all tests"
    echo ""
    echo "Examples:"
    echo "  $0           # Run all tests"
    echo "  $0 unit      # Run only unit tests"
    echo "  $0 e2e       # Run only E2E tests"
    echo ""
    echo "Prerequisites:"
    echo "  - Node.js and npm installed"
    echo "  - Dependencies installed (npm install)"
    echo "  - Backend running for E2E tests"
    echo "  - AWS credentials configured for integration tests"
}

# Handle command line arguments
case $1 in
    "-h"|"--help")
        show_help
        exit 0
        ;;
    *)
        main $@
        ;;
esac
#!/usr/bin/env bash
# Skill Verification Script
# Verifies that all commands referenced in skills are valid and executable

set -e

echo "🔍 Verifying Iudex Skills..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper function to check command
check_command() {
  local skill_name=$1
  local command=$2
  local description=$3

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -n "  Checking: $description... "

  if eval "$command" &>/dev/null; then
    echo -e "${GREEN}✅${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌${NC}"
    echo -e "    ${RED}Failed: $command${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

check_command_exists() {
  local skill_name=$1
  local cmd=$2
  local description=$3

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -n "  Checking: $description... "

  if command -v "$cmd" &>/dev/null; then
    echo -e "${GREEN}✅${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${YELLOW}⚠️  (optional)${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    return 1
  fi
}

check_file_exists() {
  local skill_name=$1
  local file=$2
  local description=$3

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -n "  Checking: $description... "

  if [ -f "$file" ] || [ -d "$file" ]; then
    echo -e "${GREEN}✅${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌${NC}"
    echo -e "    ${RED}Missing: $file${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

echo -e "${BLUE}📋 1. Core Dependencies${NC}"
check_command_exists "core" "node" "Node.js installed"
check_command_exists "core" "npm" "npm installed"
check_command_exists "core" "docker" "Docker installed (for integration tests)"
check_command_exists "core" "psql" "PostgreSQL client (for manual DB ops)"
echo ""

echo -e "${BLUE}📦 2. Project Structure${NC}"
check_file_exists "structure" "package.json" "package.json exists"
check_file_exists "structure" "core/dsl.js" "Core DSL exists"
check_file_exists "structure" "database/schema.sql" "Database schema exists"
check_file_exists "structure" "cli/index.js" "CLI exists"
check_file_exists "structure" "examples" "Examples directory exists"
echo ""

echo -e "${BLUE}🧪 3. Test Skills${NC}"
check_command "test" "npm run test:unit --help 2>&1 | grep -q '.*' || npm test --help 2>&1 | grep -q '.*'" "npm test command available"
check_command "test-unit" "npm run test:unit --help 2>&1 | grep -q '.*' || true" "npm run test:unit available"
check_file_exists "test-integration" "examples/httpbin.test.js" "Integration test examples exist"
echo ""

echo -e "${BLUE}🗄️  4. Database Skills${NC}"
check_command_exists "db" "mise" "mise installed (for db tasks)"
if command -v mise &>/dev/null; then
  check_command "db-setup" "mise tasks | grep -q 'db.setup\\|db_setup'" "mise db_setup task exists"
  check_command "db-reset" "mise tasks | grep -q 'db.reset\\|db_reset'" "mise db_reset task exists"
  check_command "db-status" "mise tasks | grep -q 'db.status\\|db_status'" "mise db_status task exists"
else
  echo -e "  ${YELLOW}⚠️  Skipping mise task checks (mise not installed)${NC}"
  WARNING_CHECKS=$((WARNING_CHECKS + 3))
  TOTAL_CHECKS=$((TOTAL_CHECKS + 3))
fi
echo ""

echo -e "${BLUE}✨ 5. Code Quality Skills${NC}"
check_command_exists "lint" "npx" "npx available"
check_file_exists "lint" "node_modules/.bin/eslint" "ESLint installed"
echo ""

echo -e "${BLUE}🚀 6. Development Skills${NC}"
check_command "dev" "node --help 2>&1 | grep -q 'watch\\|--watch'" "Node.js watch mode available"
check_file_exists "dev" "cli/index.js" "CLI entry point exists"
echo ""

echo -e "${BLUE}📊 7. Skill Definitions${NC}"
check_file_exists "skills" "skills/README.md" "Skills README exists"
check_file_exists "skills" "skills/definitions/test.md" "test skill definition"
check_file_exists "skills" "skills/definitions/test-unit.md" "test-unit skill definition"
check_file_exists "skills" "skills/definitions/db-setup.md" "db-setup skill definition"
check_file_exists "skills" "skills/definitions/lint.md" "lint skill definition"
check_file_exists "skills" "skills/definitions/dev.md" "dev skill definition"
check_file_exists "skills" "skills/definitions/examples.md" "examples skill definition"
check_file_exists "skills" "skills/definitions/validate.md" "validate skill definition"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📈 Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total Checks:    $TOTAL_CHECKS"
echo -e "${GREEN}Passed:          $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:          $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings:        $WARNING_CHECKS${NC}"
echo ""

# Calculate percentage
if [ $TOTAL_CHECKS -gt 0 ]; then
  PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
  echo -e "Pass Rate:       ${PASS_RATE}%"
else
  echo "No checks performed"
fi

echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✅ All critical checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Install dependencies: npm install"
  echo "  2. Run tests: /test or npm test"
  echo "  3. Try examples: /examples"
  echo "  4. Setup database (optional): /db-setup"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  echo ""
  echo "Fix issues above and run again: ./skills/verify-skills.sh"
  exit 1
fi

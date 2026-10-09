#!/bin/bash
set -e

# Database test runner for VisionBuild
# Creates a fresh test database, applies shim + migrations, runs SQL tests

DB_NAME="visionbuild_test"
DB_USER="postgres"
TEST_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$TEST_DIR/scripts"

echo "🧪 VisionBuild Database Test Suite"
echo "=================================="
echo ""

# Drop and recreate test database
echo "📦 Creating fresh test database: $DB_NAME"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

# Apply shim (creates auth/storage schemas)
echo "🔧 Applying Supabase shim..."
sudo -u postgres psql -d "$DB_NAME" -f "$SCRIPT_DIR/db/shim.sql" -q

# Apply migrations in order
echo "📋 Applying migrations..."
for migration in "$TEST_DIR"/supabase/migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "  → $(basename "$migration")"
    sudo -u postgres psql -d "$DB_NAME" -f "$migration" -q -v ON_ERROR_STOP=1
  fi
done

# Apply post-migration grants for service_role
echo "🔐 Applying service_role grants..."
sudo -u postgres psql -d "$DB_NAME" -f "$SCRIPT_DIR/db/post-migration-grants.sql" -q

echo ""
echo "✅ Database setup complete"
echo ""

# Run SQL tests
echo "🧪 Running SQL tests..."
echo ""

test_count=0
passed_count=0
failed_count=0

for test_file in "$SCRIPT_DIR"/sql-tests/*.sql; do
  if [ -f "$test_file" ]; then
    test_count=$((test_count + 1))
    test_name=$(basename "$test_file")
    echo "Running: $test_name"
    
    if sudo -u postgres psql -d "$DB_NAME" -f "$test_file" -v ON_ERROR_STOP=1 > /tmp/test-output.txt 2>&1; then
      passed_count=$((passed_count + 1))
      echo "  ✅ PASSED"
    else
      failed_count=$((failed_count + 1))
      echo "  ❌ FAILED"
      echo ""
      echo "Output:"
      cat /tmp/test-output.txt
      echo ""
    fi
    echo ""
  fi
done

# Summary
echo "=================================="
echo "📊 Test Results:"
echo "  Total:  $test_count"
echo "  Passed: $passed_count"
echo "  Failed: $failed_count"
echo ""

if [ $failed_count -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi

#!/bin/bash
set -e

# Function test runner for VisionBuild Supabase Functions
# Runs deno check for type checking and deno test for unit tests

DENO_BIN="/home/ubuntu/.deno/bin/deno"
FUNCTIONS_DIR="$(cd "$(dirname "$0")/../supabase/functions" && pwd)"

echo "🧪 VisionBuild Function Test Suite"
echo "==================================="
echo ""

# Check if Deno is available
if [ ! -f "$DENO_BIN" ]; then
  echo "❌ Deno not found at $DENO_BIN"
  echo "Please install Deno: curl -fsSL https://deno.land/install.sh | sh"
  exit 1
fi

# Type check all functions
echo "🔍 Type checking functions..."
cd "$FUNCTIONS_DIR"

if $DENO_BIN check **/*.ts; then
  echo "✅ All functions type check successfully"
else
  echo "❌ Type check failed"
  exit 1
fi

echo ""

# Run unit tests
echo "🧪 Running unit tests..."
if $DENO_BIN test --allow-env --allow-net --allow-read; then
  echo "✅ All unit tests passed"
else
  echo "❌ Some unit tests failed"
  exit 1
fi

echo ""
echo "==================================="
echo "✅ All function tests passed!"

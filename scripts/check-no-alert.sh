#!/bin/bash
# Check for Alert.alert usage in app/ and components/
# Fails if any Alert.alert calls are found (web-incompatible)

set -e

echo "🔍 Checking for Alert.alert in app/ and components/..."

# Search for Alert.alert in app/ and components/
MATCHES=$(grep -rn "Alert\.alert" app/ components/ 2>&1 || true)

# Check if grep failed (not just "no matches")
if echo "$MATCHES" | grep -q "No such file or directory"; then
  echo "❌ Error: grep failed to search directories"
  exit 1
fi

# Filter out grep's "no matches" message
MATCHES=$(echo "$MATCHES" | grep -v "No such file or directory" || true)

if [ -n "$MATCHES" ]; then
  echo ""
  echo "❌ Alert.alert found (web-incompatible):"
  echo ""
  echo "$MATCHES"
  echo ""
  echo "Replace Alert.alert with ConfirmationSheet or inline/toast messages that work on web."
  exit 1
fi

echo "✅ No Alert.alert found."

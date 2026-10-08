#!/bin/bash
# Check that dev buttons are properly gated

set -e

echo "Checking dev button is gated..."

# Find any devButton renders without proper gating
UNGATED=$(grep -rn "styles\.devButton" app/ --include="*.tsx" | grep -v "SHOW_DEV_BUTTON &&" || true)

if [ -n "$UNGATED" ]; then
  echo "❌ Found ungated dev button usage:"
  echo "$UNGATED"
  exit 1
fi

# Check that SHOW_DEV_BUTTON is properly defined
if ! grep -q "__DEV__.*EXPO_PUBLIC_DEV_MOCK_SESSION" "app/(tabs)/index.tsx"; then
  echo "❌ SHOW_DEV_BUTTON is not properly gated with __DEV__ or EXPO_PUBLIC_DEV_MOCK_SESSION"
  exit 1
fi

echo "✅ Dev button is properly gated"

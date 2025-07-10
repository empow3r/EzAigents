#!/bin/bash

echo "🔧 Fixing chunk loading errors..."

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next

# Clear browser cache hint
echo "
📝 Please also clear your browser cache:
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Safari: Cmd+Option+E then reload
"

# Rebuild the application
echo "Rebuilding application..."
npm run build

echo "✅ Fix applied! Please restart the development server with 'npm run dev'"
echo "If the issue persists, try:"
echo "  1. Clear your browser's local storage and cookies for localhost:3000"
echo "  2. Try using an incognito/private window"
echo "  3. Disable browser extensions temporarily"
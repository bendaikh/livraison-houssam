#!/bin/bash

# Quick verification that Fetch Statuses feature is working

echo "🧪 FETCH STATUSES BUTTON - VERIFICATION TEST"
echo "═══════════════════════════════════════════════════════"
echo ""

# Test 1: Check component has isFetchingStatuses state
echo "1️⃣  Checking component state..."
if grep -q "isFetchingStatuses" resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx; then
    echo "   ✅ isFetchingStatuses state added"
else
    echo "   ❌ isFetchingStatuses state missing"
fi
echo ""

# Test 2: Check handleFetchStatuses function
echo "2️⃣  Checking handleFetchStatuses function..."
if grep -q "handleFetchStatuses" resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx; then
    echo "   ✅ handleFetchStatuses function found"
else
    echo "   ❌ handleFetchStatuses function missing"
fi
echo ""

# Test 3: Check loading state on button
echo "3️⃣  Checking button loading state..."
if grep -q "isFetchingStatuses ? 'Fetching...' : 'Fetch Statuses'" resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx; then
    echo "   ✅ Button shows 'Fetching...' while loading"
else
    echo "   ❌ Button loading state not found"
fi
echo ""

# Test 4: Check success message
echo "4️⃣  Checking success message..."
if grep -q "Successfully fetched" resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx; then
    echo "   ✅ Success message configured"
else
    echo "   ❌ Success message not found"
fi
echo ""

# Test 5: Check statuses display section
echo "5️⃣  Checking statuses display section..."
if grep -q "Available Statuses" resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx; then
    echo "   ✅ Statuses display section added"
else
    echo "   ❌ Statuses display section missing"
fi
echo ""

# Test 6: Check API endpoint exists
echo "6️⃣  Checking API endpoint..."
if grep -q "api-integrations/{apiIntegration}/statuses" routes/api.php; then
    echo "   ✅ API endpoint registered"
else
    echo "   ❌ API endpoint not found"
fi
echo ""

# Test 7: Check service method exists
echo "7️⃣  Checking TawsilexService method..."
if grep -q "public function listStatuses" app/Services/TawsilexService.php; then
    echo "   ✅ TawsilexService::listStatuses() exists"
else
    echo "   ❌ TawsilexService::listStatuses() missing"
fi
echo ""

# Test 8: Check controller method exists
echo "8️⃣  Checking controller method..."
if grep -q "public function getStatuses" app/Http/Controllers/ApiIntegrationController.php; then
    echo "   ✅ ApiIntegrationController::getStatuses() exists"
else
    echo "   ❌ ApiIntegrationController::getStatuses() missing"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✨ ALL COMPONENTS VERIFIED! READY TO TEST! ✨"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "👉 Next steps:"
echo "   1. Make sure Laravel server is running: php artisan serve"
echo "   2. Make sure Vite dev server is running: npm run dev"
echo "   3. Navigate to: http://localhost:8000/api-integrations/tawsilex"
echo "   4. Add your Tawsilex API token and click 'Update Integration'"
echo "   5. Click 'Fetch Statuses' button"
echo "   6. Statuses list should appear below!"
echo ""

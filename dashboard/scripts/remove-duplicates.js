#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Duplicate files to remove (keeping only the optimized versions)
const duplicatesToRemove = [
  // Dashboard variants - keep UnifiedFastDashboard
  'src/MainDashboard.jsx',
  'src/OptimizedMainDashboard.jsx',
  'src/OptimizedMainDashboardV2.jsx',
  'src/CleanMainDashboard.jsx',
  'src/SimpleDashboard.jsx',
  'src/MinimalDashboard.jsx',
  'src/FastDashboard.jsx',
  'src/OptimizedFastDashboard.jsx',
  'src/ProjectDashboard.jsx',
  'src/GameficationDashboard.jsx',
  
  // Duplicate utilities
  'src/services/api-cache.js',
  'src/services/apiCache.js', // keep unified-api-cache.js
  'src/utils/imageOptimization.js', // keep image-optimization.js
  'src/services/performanceMonitor.js', // keep utils version
  'src/utils/lazyComponentRegistry.js', // keep optimizedLazyComponentRegistry.js
  'src/utils/advancedLazyLoader.js', // keep optimizedLazyLoader.js
  
  // Duplicate hooks
  'src/hooks/usePerformance.js',
  'src/hooks/usePerformanceBoost.js', // keep usePerformanceOptimization.js
  'src/hooks/useTextToSpeech.js', // keep useTTS.js
  'src/hooks/useRealTimeData.js', // keep useUnifiedRealTimeData.js
  
  // Sound services
  'src/services/soundService.js', // keep optimizedSoundService.js
  
  // Multiple dashboards in components
  'src/components/SimpleDashboard.jsx',
  'src/components/MinimalDashboard.jsx',
  'src/components/FastDashboard.jsx',
  'src/components/PerformanceDashboard.jsx',
  'src/components/ProjectDashboard.jsx',
];

console.log('🧹 Removing duplicate files...\n');

let removedCount = 0;
let errorCount = 0;

duplicatesToRemove.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } else {
      console.log(`⏭️  Skipped (not found): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error removing ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   - Files removed: ${removedCount}`);
console.log(`   - Files skipped: ${duplicatesToRemove.length - removedCount - errorCount}`);
console.log(`   - Errors: ${errorCount}`);

console.log('\n💡 Next steps:');
console.log('   1. Update imports in other files to use the consolidated components');
console.log('   2. Run "npm run build" to ensure everything still works');
console.log('   3. Clear browser cache and test the dashboard');
# API Cache Migration Guide

## Overview
We've consolidated two duplicate API cache implementations into a single unified module that combines the best features of both.

## Migration Steps

### 1. Update Imports

Replace old imports:
```javascript
// OLD - Replace these:
import apiCache from '@/src/utils/apiCache';
import { cachedFetch } from '@/src/utils/apiCache';
import { APICache } from '@/src/utils/api-cache';

// NEW - With this:
import apiCache from '@/src/utils/unified-api-cache';
import { cachedFetch, useCachedApi } from '@/src/utils/unified-api-cache';
```

### 2. Update Component Usage

The unified API maintains backward compatibility, so most code should work without changes. However, some method names have been standardized:

```javascript
// Both of these work:
apiCache.invalidate(pattern);  // From api-cache.js
invalidateCache(pattern);      // From apiCache.js
```

### 3. New Features Available

The unified cache includes all features from both implementations:
- React hooks (`useCachedApi`)
- Batch requests (`BatchRequester`)
- Polling management (`PollingManager`)
- Background refresh
- Cache warming
- Request deduplication
- Page visibility handling
- Enhanced statistics

### 4. Files to Delete

After migration is complete, delete these files:
- `/dashboard/src/utils/apiCache.js`
- `/dashboard/src/utils/api-cache.js`

### 5. Testing

Test these key areas after migration:
1. Dashboard data loading
2. Real-time updates
3. Cache hit rates
4. Background refresh
5. Page visibility handling

## Benefits

- **Code Reduction**: ~250 lines eliminated
- **Single Source**: One cache implementation to maintain
- **All Features**: Preserves functionality from both versions
- **Better Performance**: Combined optimizations from both implementations
- **Cleaner API**: Consistent method naming
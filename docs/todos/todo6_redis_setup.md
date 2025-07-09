# TODO 6: Redis Infrastructure Engineer
**Agent Type:** GPT-4o
**Estimated Time:** 3-4 hours
**Dependencies:** todo5_api_task_designer.md

## Objective
Implement the complete Redis infrastructure for task queuing, pub/sub, and caching.

## Tasks
- [ ] Create `cli/redis_setup.js` implementing:
  - Connection pooling with retry logic
  - Queue creation and management
  - Pub/sub channel setup
  - Dead letter queue handling
- [ ] Implement queue managers in `cli/queue/`:
  - `task_queue.js` - Main task queue operations
  - `priority_queue.js` - Priority-based queuing
  - `retry_queue.js` - Failed task retry logic
  - `dlq_handler.js` - Dead letter queue processing
- [ ] Create Redis Lua scripts in `scripts/redis/`:
  - Atomic dequeue operation
  - Bulk task assignment
  - Queue metrics collection
  - Token bucket rate limiting
- [ ] Implement caching layer:
  - Agent response caching
  - Token count caching
  - Cost calculation caching
- [ ] Create `config/redis.json` with:
  - Connection settings
  - Queue configurations
  - TTL settings
  - Memory limits
- [ ] Implement monitoring:
  - Queue depth tracking
  - Latency monitoring
  - Memory usage alerts
- [ ] Create backup/restore utilities

## Output Files
- `cli/redis_setup.js` - Redis initialization
- `cli/queue/*.js` - Queue management modules
- `scripts/redis/*.lua` - Lua scripts
- `config/redis.json` - Redis configuration

## Success Criteria
- Fault-tolerant queue system
- Sub-100ms queue operations
- Automatic retry with backoff
- Memory-efficient caching
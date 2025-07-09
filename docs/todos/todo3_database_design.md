# TODO 3: Database Designer
**Agent Type:** GPT-4o
**Estimated Time:** 3-4 hours
**Dependencies:** todo1_file_structure.md, todo2_naming_convention.md

## Objective
Design the complete database schema for agent metrics, logs, and persistent storage using PostgreSQL/Supabase.

## Tasks
- [ ] Create `database.md` with full schema documentation
- [ ] Design tables for:
  - agents (id, name, type, status, created_at)
  - tasks (id, agent_id, file, prompt, status, tokens, cost)
  - agent_logs (id, agent_id, timestamp, level, message)
  - token_usage (id, agent_id, model, tokens_used, cost, timestamp)
  - agent_memory (id, agent_id, key, value, updated_at)
  - task_queue (id, model, payload, status, attempts, error)
  - api_keys (id, provider, key_hash, usage_count, last_used)
  - cost_tracking (id, date, model, total_tokens, total_cost)
- [ ] Create `db.schema.sql` with CREATE TABLE statements
- [ ] Design indexes for performance optimization
- [ ] Create database migration scripts
- [ ] Design views for dashboard analytics
- [ ] Establish foreign key relationships
- [ ] Create stored procedures for common operations
- [ ] Design partitioning strategy for logs table
- [ ] Create `supabase_setup.sql` for Supabase-specific features

## Output Files
- `database.md` - Complete schema documentation
- `db.schema.sql` - SQL schema file
- `migrations/001_initial_schema.sql` - Initial migration
- `supabase_setup.sql` - Supabase configuration

## Success Criteria
- Normalized database design
- Efficient indexing strategy
- Clear relationships between entities
- Scalable for 100+ agents
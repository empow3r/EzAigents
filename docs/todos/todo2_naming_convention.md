# TODO 2: Naming Convention Master
**Agent Type:** Claude-3-Opus  
**Estimated Time:** 2-3 hours
**Dependencies:** todo1_file_structure.md

## Objective
Establish consistent naming conventions across the entire codebase for files, functions, variables, and APIs.

## Tasks
- [ ] Create `naming.md` with comprehensive naming rules
- [ ] Define naming patterns for:
  - JavaScript/TypeScript files (camelCase vs snake_case)
  - React components (PascalCase)
  - API endpoints (/api/agent-stats vs /api/agentStats)
  - Redis keys (agent:status vs agent_status)
  - Environment variables (REDIS_URL pattern)
  - Docker containers (ai_claude vs ai-claude)
  - Function names (submitTask vs submit_task)
  - CSS classes (BEM vs utility-first)
- [ ] Create naming examples for each category
- [ ] Define abbreviation rules (max vs maximum)
- [ ] Establish prefixes/suffixes conventions
- [ ] Create `rename_map.json` for existing files needing updates
- [ ] Define rules for agent-generated file names
- [ ] Establish timestamp format standards
- [ ] Create naming validation regex patterns

## Output Files
- `naming.md` - Complete naming convention guide
- `rename_map.json` - Files that need renaming
- `naming_validators.js` - Regex patterns for validation

## Success Criteria
- Clear, unambiguous naming rules
- Examples for every naming category
- No conflicts with existing popular conventions
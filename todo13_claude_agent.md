# TODO 13: Claude Agent Implementation
**Agent Type:** Claude-3-Opus
**Estimated Time:** 4-5 hours
**Dependencies:** todo7_agent_templates.md, todo8_token_pool_manager.md

## Objective
Implement the complete Claude agent with advanced code refactoring and architecture capabilities.

## Context
You are building the Claude agent for EzAugent. This agent specializes in code refactoring, architecture decisions, and complex reasoning. Focus ONLY on Claude agent files.

## Assigned Files (ONLY EDIT THESE)
- `agents/claude/index.js`
- `agents/claude/refactor_engine.js`
- `agents/claude/architecture_analyzer.js`
- `agents/claude/prompts/refactor.md`
- `agents/claude/prompts/architecture.md`
- `agents/claude/config.json`

## Tasks
- [ ] Enhance `agents/claude/index.js`:
  - Extend base agent template
  - Implement Claude-specific API calls
  - Add context window management
  - Handle 200k token context
  - Implement streaming responses
- [ ] Create `refactor_engine.js`:
  - Code analysis algorithms
  - Refactoring pattern detection
  - Safe transformation rules
  - Test preservation logic
  - Performance optimization
- [ ] Build `architecture_analyzer.js`:
  - Codebase structure analysis
  - Dependency graph building
  - Architecture pattern detection
  - Tech debt identification
  - Modernization suggestions
- [ ] Develop specialized prompts:
  - Refactoring templates
  - Architecture review prompts
  - Code quality prompts
  - Security audit prompts
  - Documentation prompts
- [ ] Implement Claude features:
  - Multi-file context handling
  - Code diff generation
  - Incremental refactoring
  - Rollback capabilities
  - Change impact analysis
- [ ] Add memory management:
  - Context pruning strategies
  - Relevant code extraction
  - Memory persistence
  - Learning from feedback
- [ ] Create quality checks:
  - Code validation
  - Test coverage maintenance
  - Breaking change detection
  - Style consistency

## Output Files
- `agents/claude/index.js` - Main Claude agent
- `agents/claude/refactor_engine.js` - Refactoring logic
- `agents/claude/architecture_analyzer.js` - Architecture analysis
- `agents/claude/prompts/*.md` - Prompt templates

## Success Criteria
- High-quality refactoring
- Architecture insights
- Test preservation
- Context efficiency
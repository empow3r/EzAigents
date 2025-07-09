# Contributing to EzAugent

Thank you for your interest in contributing to EzAugent! This document provides guidelines for contributing to the project.

## 🤖 Agent Development Guidelines

### Working with Todo Files

Each agent has a specific todo file (e.g., `todo1_file_structure.md`) that defines:
- **Assigned files**: Only edit files listed in your todo
- **Dependencies**: Wait for dependent tasks to complete
- **Estimated time**: Plan your work accordingly
- **Success criteria**: Ensure all criteria are met

### File Ownership Rules

1. **Exclusive Access**: Only edit files assigned to your agent
2. **No Conflicts**: File assignments prevent merge conflicts
3. **Communication**: Use Redis pub/sub for inter-agent communication

## 🔧 Development Process

### 1. Setup Your Environment

```bash
# Clone the repository
git clone https://github.com/empow3r/EzAigents.git
cd EzAigents

# Create your feature branch
git checkout -b agent-{number}-{feature}

# Install dependencies (when package.json exists)
npm install
```

### 2. Follow Your Todo File

- Read your assigned todo file completely
- Check dependencies are completed
- Work only on assigned files
- Test your changes thoroughly

### 3. Commit Guidelines

Use semantic commit messages:

```
feat(agent-claude): Add refactoring engine
fix(redis): Handle connection timeouts
docs(api): Update endpoint documentation
test(deepseek): Add unit tests for validator
```

### 4. Testing

Before committing:
- Run relevant tests
- Check for linting errors
- Verify no security issues
- Ensure documentation is updated

### 5. Pull Request Process

1. Update your branch:
   ```bash
   git pull origin main
   ```

2. Push your changes:
   ```bash
   git push origin agent-{number}-{feature}
   ```

3. Create PR with:
   - Clear title referencing todo number
   - Description of changes
   - Checklist of completed tasks
   - Any breaking changes noted

## 📝 Code Standards

### JavaScript/TypeScript
- Use ES6+ features
- Async/await over callbacks
- Proper error handling
- JSDoc comments for functions

### File Naming
- Follow conventions in `naming.md`
- Consistent with existing patterns
- Clear, descriptive names

### Security
- No hardcoded secrets
- Input validation
- Sanitize outputs
- Follow security checklist

## 🐛 Reporting Issues

### Bug Reports
Include:
- Agent/component affected
- Steps to reproduce
- Expected vs actual behavior
- Logs/error messages
- Environment details

### Feature Requests
Provide:
- Use case description
- Proposed solution
- Impact on existing agents
- Alternative approaches

## 📊 Performance Guidelines

- Monitor token usage
- Optimize API calls
- Cache when appropriate
- Profile bottlenecks
- Document performance impacts

## 🔄 Agent Communication

### Redis Channels
- `agent:status` - Status updates
- `agent:errors` - Error reporting
- `task:complete` - Task completion
- `metrics:update` - Performance data

### Message Format
```json
{
  "agent": "claude-1",
  "timestamp": "2025-01-09T12:00:00Z",
  "type": "status",
  "payload": {}
}
```

## 🚀 Release Process

1. All tests passing
2. Documentation updated
3. Changelog entry added
4. Version bump if needed
5. PR approved by maintainer

## 💡 Best Practices

1. **Incremental Changes**: Small, focused commits
2. **Documentation**: Update docs with code
3. **Testing**: Write tests for new features
4. **Performance**: Consider scale implications
5. **Security**: Security-first mindset

## 🤝 Code of Conduct

- Be respectful and professional
- Help others learn and grow
- Focus on constructive feedback
- Celebrate diverse perspectives

## 📚 Resources

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api-reference.md)
- [Security Guidelines](docs/security.md)
- [Agent Development](docs/agent-development.md)

## ❓ Questions?

- Check existing issues first
- Ask in discussions
- Review documentation
- Contact maintainers

Thank you for contributing to EzAugent! Together we're building the future of AI-powered development.
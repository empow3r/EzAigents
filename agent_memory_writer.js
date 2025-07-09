// /cli/agent-memory-writer.js
import fs from 'fs';
import path from 'path';

const memoryTemplates = {
  claude: {
    'claude.md': `# Claude System Rules
Ultimate Claude.md for Programming Projects
System ID: CursorArchitect_OS-v3.0
...
`,
    'todo.md': `# Task Plan\n[ ] Initial task placeholder\n`,
    'codebase.md': `# Codebase Notes\n`,
    'version.md': `# Versioning\n`,
    'notes.md': `# Strategic Notes\n`,
    'security.md': `# Security Checklist\n`
  },
  gemini: {
    'gemini.md': `# Gemini CLI Autonomous Stack\nMode: Strategic Prompt Architect\n...
`,
    'blueprint.md': `# System Blueprint\n`,
    'testplan.md': `# Unit + Integration Test Plan\n`,
    'memory.md': `# Session Memory\n`
  },
  gpt: {
    'openai.md': `# GPT Modular Engineering Mode\n`,
    'workflow.md': `# Development Workflow\n`,
    'tests.md': `# Test Plan\n`
  },
  deepseek: {
    'deepseek.md': `# DeepSeek Recursive Symbolic Reasoner\n`,
    'vector.md': `# Embedding Context Plan\n`
  }
};

export function writeAgentMemory(agentType, basePath) {
  const base = agentType.toLowerCase();
  const files = memoryTemplates[base] || {};
  const dir = path.join(basePath, '.ai');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  for (const [filename, content] of Object.entries(files)) {
    const fpath = path.join(dir, filename);
    fs.writeFileSync(fpath, content, 'utf-8');
  }
  return dir;
}

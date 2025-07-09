import redis
import json

# Connect to Redis (adjust host if needed)
r = redis.Redis(host='localhost', port=6379, db=0)

# Define planning tasks for agents
planning_tasks = [
    {"agent": "claude", "task": "plan_structure", "file": "structure.md", "prompt": "Define the complete project folder and file structure.", "model": "claude-3-opus"},
    {"agent": "claude", "task": "plan_naming", "file": "naming.md", "prompt": "Describe the full naming convention for the codebase.", "model": "claude-3-opus"},
    {"agent": "gpt", "task": "define_stack", "file": "stack.md", "prompt": "Select the frontend, backend, database, orchestration, and hosting stack.", "model": "gpt-4o"},
    {"agent": "gpt", "task": "schema_design", "file": "database.md", "prompt": "Define database schema, tables, and relationships.", "model": "gpt-4o"},
    {"agent": "deepseek", "task": "task_formats", "file": "tasks.md", "prompt": "List slash commands and Redis task formats for all agents.", "model": "deepseek-coder"},
    {"agent": "claude", "task": "global_rules", "file": "rules.md", "prompt": "Define system-wide rules and safe coding practices for all agents.", "model": "claude-3-opus"},
]

# Enqueue each task
for task in planning_tasks:
    r.publish('agent-tasks', json.dumps(task))
    print(f"✅ Published task: {task['task']} to file: {task['file']}")
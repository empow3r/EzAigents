# 🔍 Universal LLM Agent Observability

Complete observability solution for ANY LLM agent - OpenAI, Anthropic, Google, Cohere, LangChain, or custom implementations.

## 🌟 Features

- **Universal Compatibility**: Works with any LLM provider or framework
- **Zero Code Changes**: Wrap existing clients for instant observability  
- **Live Streaming**: Real-time event visualization in terminal or web
- **Automatic Tracking**: API calls, tool usage, errors, token consumption
- **Multi-Agent Support**: Track complex multi-agent systems
- **Beautiful UI**: Terminal and web dashboards with color-coded agents

## 🚀 Quick Start

### 1. Start the Observability Server

```bash
cd server
bun run app-enhanced.ts
```

### 2. Integrate with Your Agent

#### OpenAI Example
```python
from agents.universal_agent_wrapper import OpenAIObserver
from openai import OpenAI

# Create observer and wrap client
observer = OpenAIObserver("MyGPT-Agent")
client = OpenAI()
client = observer.wrap_openai_client(client)

# Use normally - all calls are tracked!
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### Anthropic Example
```python
from agents.universal_agent_wrapper import AnthropicObserver
import anthropic

# Create observer and wrap client
observer = AnthropicObserver("MyClaude-Agent")
client = anthropic.Anthropic()
client = observer.wrap_anthropic_client(client)

# Use normally - all calls are tracked!
response = client.messages.create(
    model="claude-3-opus-20240229",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### Custom Agent Example
```python
from agents.universal_agent_wrapper import UniversalAgentObserver

# Create observer for any custom agent
observer = UniversalAgentObserver("MyCustom-Agent", "custom")

# Track custom events
observer.observe_custom("task_started", {"task": "data_processing"})

# Decorate functions for automatic tracking
@observer.observe_function
def process_data(data):
    return {"processed": data}

# Track tool usage
observer.observe_tool_use("database_query", {"query": "SELECT * FROM users"})
```

### 3. View Live Events

#### Terminal Stream (Simple)
```bash
python cli/agent-stream-simple.py
```

#### Web Dashboard
Open `client/index-enhanced.html` in your browser

#### Example Output
```
🚀 LIVE AGENT EVENT STREAM
============================================================
12:34:56 [GPT-4-Agent] 🤖 llm_request - Calling openai/gpt-4 with 2 messages
12:34:57 [GPT-4-Agent] 💬 llm_response - Received response in 1.23s
12:34:57 [GPT-4-Agent] 🪙 token_usage - Used 150 tokens
12:34:58 [Claude-Agent] 🤖 llm_request - Calling anthropic/claude-3 
12:34:59 [Claude-Agent] 💬 llm_response - Received response in 0.89s
12:35:00 [Research-Agent] 🔧 tool_use - Using tool: web_search
12:35:01 [Writer-Agent] 📌 custom - Draft completed with 1500 words
```

## 📦 Integration Examples

### LangChain Integration
```python
from agents.universal_agent_wrapper import LangChainObserver
from langchain.chat_models import ChatOpenAI

observer = LangChainObserver("MyLangChain-Agent")
llm = ChatOpenAI(callbacks=observer.create_callbacks())
```

### Multi-Agent System
```python
# Create observers for each agent
coordinator = UniversalAgentObserver("Coordinator", "custom")
researcher = UniversalAgentObserver("Researcher", "custom") 
writer = UniversalAgentObserver("Writer", "custom")

# Each agent tracks its own events
coordinator.observe_custom("task_assigned", {"task": "write_article"})
researcher.observe_tool_use("search_papers", {"topic": "AI safety"})
writer.observe_custom("draft_complete", {"words": 2000})
```

## 📊 Event Types Tracked

- **LLM Requests/Responses**: Model, messages, parameters, duration
- **Tool Usage**: Tool name, parameters, results
- **Token Usage**: Prompt/completion tokens per request
- **Function Calls**: Start, complete, duration, errors
- **Custom Events**: Any domain-specific events
- **Errors**: Exceptions, tracebacks, context

## 🛠️ Advanced Features

### Filtering Events
```bash
# Filter by app
python cli/agent-stream-simple.py --filter-app "GPT-4-Agent"

# Filter by event type  
python cli/agent-stream-simple.py --filter-type "tool_use"
```

### Export Data
```bash
# Export as JSON
curl http://localhost:3001/events > events.json

# Export as CSV
curl http://localhost:3001/export/csv > events.csv
```

### Metrics & Analytics
- Real-time event rates
- Token usage tracking
- Error rate monitoring
- Agent performance metrics
- Session analytics

## 🐳 Docker Deployment

```bash
cd observability
docker-compose up -d
```

## 🔧 Environment Variables

```bash
# Optional: Enable authentication
ENABLE_AUTH=true
OBSERVABILITY_API_KEY=your-secret-key

# Optional: Custom retention
RETENTION_DAYS=30
```

## 📚 Examples

Run the interactive examples:
```bash
python agents/example-integrations.py
```

Available examples:
1. OpenAI GPT Agent
2. Anthropic Claude Agent  
3. LangChain Agent
4. Custom Python Agent
5. Multi-Agent System

## 🎯 Use Cases

- **Development**: Debug agent behavior in real-time
- **Monitoring**: Track production agent performance
- **Analytics**: Understand token usage and costs
- **Debugging**: Trace errors and tool failures
- **Compliance**: Audit agent activities
- **Optimization**: Identify bottlenecks and inefficiencies

## 🔌 Supported Providers

- ✅ OpenAI (GPT-3.5, GPT-4, etc.)
- ✅ Anthropic (Claude 1, 2, 3)
- ✅ Google (PaLM, Gemini)
- ✅ Cohere
- ✅ Mistral
- ✅ DeepSeek
- ✅ LangChain
- ✅ Any custom implementation

## 🚨 Troubleshooting

### Connection Issues
```bash
# Check server is running
curl http://localhost:3001/health

# Check recent events
curl http://localhost:3001/events?limit=5
```

### No Events Appearing
- Verify server URL in agent configuration
- Check network connectivity
- Ensure observer is properly initialized

## 🤝 Contributing

Feel free to add support for more LLM providers! The universal wrapper pattern makes it easy to extend.

---

Built with ❤️ for the AI agent community
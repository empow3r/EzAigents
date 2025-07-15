#!/usr/bin/env python3
"""
Example integrations showing how to add observability to ANY LLM agent
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

from universal_agent_wrapper import (
    UniversalAgentObserver, 
    OpenAIObserver, 
    AnthropicObserver,
    LangChainObserver
)

# ============================================================================
# EXAMPLE 1: OpenAI GPT Agent with Observability
# ============================================================================
def example_openai_agent():
    """Example OpenAI agent with full observability"""
    print("🤖 OpenAI Agent Example")
    print("-" * 50)
    
    try:
        from openai import OpenAI
        
        # Initialize observer
        observer = OpenAIObserver("GPT-4-Agent", session_id="demo-session-1")
        
        # Create and wrap OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        client = observer.wrap_openai_client(client)
        
        # Send custom event for agent start
        observer.observe_custom("agent_started", {
            "model": "gpt-4",
            "purpose": "Demo agent for observability"
        })
        
        # Make API call - automatically tracked
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Write a haiku about observability"}
            ],
            temperature=0.7
        )
        
        # Extract and log the response
        haiku = response.choices[0].message.content
        observer.observe_custom("haiku_generated", {"haiku": haiku})
        
        print(f"Generated Haiku:\n{haiku}\n")
        
        # Simulate tool use
        observer.observe_tool_use("save_to_file", {
            "filename": "haiku.txt",
            "content": haiku
        })
        
        # End session
        observer.observe_custom("agent_completed", {
            "status": "success",
            "events_sent": observer.event_count
        })
        
        print(f"✅ Sent {observer.event_count} events to observability server")
        
    except ImportError:
        print("❌ OpenAI library not installed. Run: pip install openai")
    except Exception as e:
        print(f"❌ Error: {e}")


# ============================================================================
# EXAMPLE 2: Anthropic Claude Agent with Observability
# ============================================================================
def example_anthropic_agent():
    """Example Anthropic Claude agent with full observability"""
    print("🤖 Anthropic Claude Agent Example")
    print("-" * 50)
    
    try:
        import anthropic
        
        # Initialize observer
        observer = AnthropicObserver("Claude-3-Agent", session_id="demo-session-2")
        
        # Create and wrap Anthropic client
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        client = observer.wrap_anthropic_client(client)
        
        # Send custom event for agent start
        observer.observe_custom("agent_started", {
            "model": "claude-3-opus-20240229",
            "purpose": "Demo Claude agent"
        })
        
        # Make API call - automatically tracked
        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=100,
            messages=[
                {"role": "user", "content": "What makes a good observability system?"}
            ]
        )
        
        # Extract and log the response
        answer = response.content[0].text
        observer.observe_custom("answer_generated", {
            "question": "What makes a good observability system?",
            "answer_preview": answer[:100] + "..."
        })
        
        print(f"Claude's Answer:\n{answer[:200]}...\n")
        
        # End session
        observer.observe_custom("agent_completed", {
            "status": "success",
            "events_sent": observer.event_count
        })
        
        print(f"✅ Sent {observer.event_count} events to observability server")
        
    except ImportError:
        print("❌ Anthropic library not installed. Run: pip install anthropic")
    except Exception as e:
        print(f"❌ Error: {e}")


# ============================================================================
# EXAMPLE 3: LangChain Agent with Observability
# ============================================================================
def example_langchain_agent():
    """Example LangChain agent with full observability"""
    print("🤖 LangChain Agent Example")
    print("-" * 50)
    
    try:
        from langchain.chat_models import ChatOpenAI
        from langchain.agents import create_react_agent, AgentExecutor
        from langchain.tools import Tool
        from langchain.prompts import PromptTemplate
        
        # Initialize observer
        observer = LangChainObserver("LangChain-Agent", session_id="demo-session-3")
        
        # Create LLM with callbacks
        llm = ChatOpenAI(
            temperature=0,
            callbacks=observer.create_callbacks()
        )
        
        # Create a simple tool
        def get_weather(location: str) -> str:
            observer.observe_tool_use("weather_api", {"location": location})
            return f"The weather in {location} is sunny and 72°F"
        
        tools = [
            Tool(
                name="Weather",
                func=get_weather,
                description="Get weather for a location"
            )
        ]
        
        # Create agent
        prompt = PromptTemplate.from_template(
            "Answer the following question using the tools available: {input}"
        )
        
        agent = create_react_agent(
            llm=llm,
            tools=tools,
            prompt=prompt
        )
        
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            callbacks=observer.create_callbacks()
        )
        
        # Run agent - automatically tracked
        result = agent_executor.run("What's the weather in San Francisco?")
        
        print(f"Agent Result: {result}\n")
        
        observer.observe_custom("agent_completed", {
            "status": "success",
            "result": result
        })
        
        print(f"✅ Sent events to observability server")
        
    except ImportError:
        print("❌ LangChain not installed. Run: pip install langchain openai")
    except Exception as e:
        print(f"❌ Error: {e}")


# ============================================================================
# EXAMPLE 4: Custom Python Agent with Observability
# ============================================================================
def example_custom_agent():
    """Example custom agent with manual observability integration"""
    print("🤖 Custom Python Agent Example")
    print("-" * 50)
    
    # Initialize observer
    observer = UniversalAgentObserver(
        agent_name="Custom-Research-Agent",
        agent_type="custom",
        session_id="demo-session-4"
    )
    
    # Agent class with observability
    class ResearchAgent:
        def __init__(self, observer):
            self.observer = observer
            self.knowledge_base = []
        
        def observe(self, func):
            """Decorator to observe methods"""
            return self.observer.observe_function(func)
        
        def start(self):
            self.observer.observe_custom("agent_initialized", {
                "agent_class": "ResearchAgent",
                "capabilities": ["search", "summarize", "save"]
            })
        
        def search_web(self, query: str):
            """Simulated web search"""
            self.observer.observe_tool_use("web_search", {"query": query})
            
            # Simulate search results
            results = [
                f"Result 1 for '{query}'",
                f"Result 2 for '{query}'",
                f"Result 3 for '{query}'"
            ]
            
            self.observer.observe_custom("search_completed", {
                "query": query,
                "result_count": len(results)
            })
            
            return results
        
        def summarize_results(self, results: list):
            """Simulated summarization"""
            self.observer.observe_tool_use("summarizer", {
                "input_count": len(results)
            })
            
            summary = f"Summary of {len(results)} results"
            
            self.observer.observe_custom("summary_generated", {
                "summary_length": len(summary)
            })
            
            return summary
        
        def save_to_knowledge_base(self, data: str):
            """Save to knowledge base"""
            self.observer.observe_tool_use("knowledge_base_write", {
                "data_size": len(data)
            })
            
            self.knowledge_base.append(data)
            
            self.observer.observe_custom("knowledge_updated", {
                "total_items": len(self.knowledge_base)
            })
    
    # Use the agent
    agent = ResearchAgent(observer)
    agent.start()
    
    # Perform research task
    print("🔍 Performing research task...")
    
    results = agent.search_web("AI observability best practices")
    print(f"Found {len(results)} results")
    
    summary = agent.summarize_results(results)
    print(f"Generated summary: {summary}")
    
    agent.save_to_knowledge_base(summary)
    print(f"Saved to knowledge base")
    
    # Complete
    observer.observe_custom("research_completed", {
        "status": "success",
        "events_sent": observer.event_count
    })
    
    print(f"\n✅ Sent {observer.event_count} events to observability server")


# ============================================================================
# EXAMPLE 5: Multi-Agent System with Observability
# ============================================================================
def example_multi_agent_system():
    """Example multi-agent system with coordinated observability"""
    print("🤖 Multi-Agent System Example")
    print("-" * 50)
    
    import threading
    import time
    
    # Create observers for different agents
    observers = {
        "coordinator": UniversalAgentObserver("Coordinator-Agent", "custom"),
        "researcher": UniversalAgentObserver("Research-Agent", "custom"),
        "writer": UniversalAgentObserver("Writer-Agent", "custom"),
        "reviewer": UniversalAgentObserver("Review-Agent", "custom")
    }
    
    # Coordinator broadcasts task
    observers["coordinator"].observe_custom("task_broadcast", {
        "task": "Write article about AI observability",
        "agents": ["researcher", "writer", "reviewer"]
    })
    
    # Simulate agent interactions
    def research_phase():
        obs = observers["researcher"]
        obs.observe_custom("phase_started", {"phase": "research"})
        time.sleep(0.5)  # Simulate work
        obs.observe_tool_use("web_search", {"query": "AI observability"})
        obs.observe_tool_use("paper_search", {"query": "observability metrics"})
        obs.observe_custom("research_completed", {
            "sources_found": 10,
            "papers_reviewed": 5
        })
    
    def writing_phase():
        obs = observers["writer"]
        obs.observe_custom("phase_started", {"phase": "writing"})
        time.sleep(0.5)  # Simulate work
        obs.observe_tool_use("text_generator", {"style": "technical"})
        obs.observe_tool_use("grammar_check", {"word_count": 1500})
        obs.observe_custom("draft_completed", {
            "word_count": 1500,
            "sections": 5
        })
    
    def review_phase():
        obs = observers["reviewer"]
        obs.observe_custom("phase_started", {"phase": "review"})
        time.sleep(0.5)  # Simulate work
        obs.observe_tool_use("fact_checker", {"claims": 20})
        obs.observe_tool_use("plagiarism_checker", {"status": "passed"})
        obs.observe_custom("review_completed", {
            "approval": "approved",
            "suggestions": 3
        })
    
    # Run phases in sequence
    print("📝 Running multi-agent workflow...")
    
    research_phase()
    print("✓ Research phase completed")
    
    writing_phase()
    print("✓ Writing phase completed")
    
    review_phase()
    print("✓ Review phase completed")
    
    # Coordinator completes task
    observers["coordinator"].observe_custom("task_completed", {
        "status": "success",
        "duration": 1.5,
        "agents_involved": 4
    })
    
    # Summary
    total_events = sum(obs.event_count for obs in observers.values())
    print(f"\n✅ Multi-agent system sent {total_events} total events")
    for name, obs in observers.items():
        print(f"   - {name}: {obs.event_count} events")


# ============================================================================
# Main Menu
# ============================================================================
def main():
    """Run examples"""
    print("\n🔍 LLM Agent Observability Examples")
    print("=" * 50)
    print("1. OpenAI GPT Agent")
    print("2. Anthropic Claude Agent")
    print("3. LangChain Agent")
    print("4. Custom Python Agent")
    print("5. Multi-Agent System")
    print("6. Run All Examples")
    print("=" * 50)
    
    choice = input("\nSelect an example (1-6) or 'q' to quit: ").strip()
    
    examples = {
        "1": example_openai_agent,
        "2": example_anthropic_agent,
        "3": example_langchain_agent,
        "4": example_custom_agent,
        "5": example_multi_agent_system,
        "6": lambda: [f() for f in [
            example_custom_agent,
            example_multi_agent_system
        ]]
    }
    
    if choice in examples:
        print()
        if choice == "6":
            # Run examples that don't require API keys
            print("Running examples that don't require API keys...\n")
        examples[choice]()
    elif choice.lower() != 'q':
        print("Invalid choice. Please try again.")
        main()


if __name__ == "__main__":
    # First, test that we can connect to the server
    observer = UniversalAgentObserver("Test-Agent", "test")
    if observer.send_event("test", {"message": "Testing connection"}, "Connection test"):
        print("✅ Successfully connected to observability server!")
        print("   You can now watch events at:")
        print("   - Dashboard: http://localhost:3001 (open client/index-enhanced.html)")
        print("   - Terminal: python cli/agent-stream.py")
        print()
        main()
    else:
        print("❌ Could not connect to observability server")
        print("   Make sure the server is running: cd server && bun run app-enhanced.ts")
#!/usr/bin/env python3
"""
Universal Agent Event Wrapper
Works with any LLM API (OpenAI, Anthropic, Google, Cohere, etc.)
Automatically tracks and streams all agent activities to observability server
"""

import json
import time
import functools
import inspect
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Callable
import urllib.request
import urllib.parse
import os
import sys

class UniversalAgentObserver:
    """Universal observer that works with any LLM agent"""
    
    def __init__(self, 
                 agent_name: str,
                 agent_type: str = "unknown",
                 server_url: str = "http://localhost:3001",
                 session_id: Optional[str] = None):
        self.agent_name = agent_name
        self.agent_type = agent_type
        self.server_url = server_url
        self.session_id = session_id or f"{agent_name}-{int(time.time())}"
        self.start_time = time.time()
        self.event_count = 0
        
    def send_event(self, event_type: str, payload: Dict[str, Any], summary: Optional[str] = None):
        """Send event to observability server"""
        try:
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "app": self.agent_name,
                "session_id": self.session_id,
                "event_type": event_type,
                "summary": summary,
                "payload": {
                    **payload,
                    "agent_type": self.agent_type,
                    "event_number": self.event_count,
                    "session_duration": time.time() - self.start_time
                }
            }
            
            data = json.dumps(event).encode('utf-8')
            req = urllib.request.Request(
                f"{self.server_url}/events",
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req) as response:
                self.event_count += 1
                return True
                
        except Exception as e:
            print(f"Failed to send event: {e}", file=sys.stderr)
            return False
    
    def observe_function(self, func: Callable) -> Callable:
        """Decorator to observe any function call"""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            func_name = func.__name__
            start_time = time.time()
            
            # Pre-execution event
            self.send_event(
                event_type="function_call_start",
                payload={
                    "function": func_name,
                    "args": str(args)[:500],  # Truncate long args
                    "kwargs": str(kwargs)[:500]
                },
                summary=f"Starting {func_name}"
            )
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Post-execution event
                self.send_event(
                    event_type="function_call_complete",
                    payload={
                        "function": func_name,
                        "duration": duration,
                        "result_type": type(result).__name__,
                        "success": True
                    },
                    summary=f"Completed {func_name} in {duration:.2f}s"
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Error event
                self.send_event(
                    event_type="function_call_error",
                    payload={
                        "function": func_name,
                        "duration": duration,
                        "error": str(e),
                        "traceback": traceback.format_exc()
                    },
                    summary=f"Error in {func_name}: {str(e)}"
                )
                raise
                
        return wrapper
    
    def observe_llm_call(self, 
                        provider: str,
                        model: str,
                        messages: list,
                        **kwargs):
        """Track LLM API calls"""
        self.send_event(
            event_type="llm_request",
            payload={
                "provider": provider,
                "model": model,
                "messages": messages,
                "parameters": kwargs,
                "message_count": len(messages),
                "total_tokens": sum(len(str(m).split()) * 1.3 for m in messages)  # Rough estimate
            },
            summary=f"Calling {provider}/{model} with {len(messages)} messages"
        )
    
    def observe_llm_response(self,
                            provider: str,
                            model: str,
                            response: Any,
                            duration: float):
        """Track LLM API responses"""
        self.send_event(
            event_type="llm_response",
            payload={
                "provider": provider,
                "model": model,
                "duration": duration,
                "response_type": type(response).__name__,
                "has_content": bool(response)
            },
            summary=f"Received response from {provider}/{model} in {duration:.2f}s"
        )
    
    def observe_tool_use(self, tool_name: str, tool_params: Dict[str, Any]):
        """Track tool/function usage"""
        self.send_event(
            event_type="tool_use",
            payload={
                "tool": tool_name,
                "parameters": tool_params
            },
            summary=f"Using tool: {tool_name}"
        )
    
    def observe_error(self, error: Exception, context: str = ""):
        """Track errors"""
        self.send_event(
            event_type="error",
            payload={
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context,
                "traceback": traceback.format_exc()
            },
            summary=f"Error: {type(error).__name__} in {context}"
        )
    
    def observe_custom(self, event_type: str, data: Any, summary: Optional[str] = None):
        """Track custom events"""
        self.send_event(
            event_type=event_type,
            payload={"data": data},
            summary=summary
        )


# Provider-specific wrappers
class OpenAIObserver(UniversalAgentObserver):
    """OpenAI-specific observer"""
    
    def __init__(self, agent_name: str = "OpenAI-Agent", **kwargs):
        super().__init__(agent_name, "openai", **kwargs)
    
    def wrap_openai_client(self, client):
        """Wrap OpenAI client to observe all calls"""
        original_create = client.chat.completions.create
        
        def wrapped_create(*args, **kwargs):
            start_time = time.time()
            
            # Extract messages and model
            messages = kwargs.get('messages', [])
            model = kwargs.get('model', 'unknown')
            
            self.observe_llm_call("openai", model, messages, **kwargs)
            
            try:
                response = original_create(*args, **kwargs)
                duration = time.time() - start_time
                
                self.observe_llm_response("openai", model, response, duration)
                
                # Track token usage if available
                if hasattr(response, 'usage'):
                    self.send_event(
                        event_type="token_usage",
                        payload={
                            "prompt_tokens": response.usage.prompt_tokens,
                            "completion_tokens": response.usage.completion_tokens,
                            "total_tokens": response.usage.total_tokens,
                            "model": model
                        },
                        summary=f"Used {response.usage.total_tokens} tokens"
                    )
                
                return response
                
            except Exception as e:
                self.observe_error(e, f"OpenAI API call with model {model}")
                raise
        
        client.chat.completions.create = wrapped_create
        return client


class AnthropicObserver(UniversalAgentObserver):
    """Anthropic-specific observer"""
    
    def __init__(self, agent_name: str = "Claude-Agent", **kwargs):
        super().__init__(agent_name, "anthropic", **kwargs)
    
    def wrap_anthropic_client(self, client):
        """Wrap Anthropic client to observe all calls"""
        original_create = client.messages.create
        
        def wrapped_create(*args, **kwargs):
            start_time = time.time()
            
            # Extract messages and model
            messages = kwargs.get('messages', [])
            model = kwargs.get('model', 'unknown')
            
            self.observe_llm_call("anthropic", model, messages, **kwargs)
            
            try:
                response = original_create(*args, **kwargs)
                duration = time.time() - start_time
                
                self.observe_llm_response("anthropic", model, response, duration)
                
                # Track token usage if available
                if hasattr(response, 'usage'):
                    self.send_event(
                        event_type="token_usage",
                        payload={
                            "input_tokens": response.usage.input_tokens,
                            "output_tokens": response.usage.output_tokens,
                            "model": model
                        },
                        summary=f"Used {response.usage.input_tokens + response.usage.output_tokens} tokens"
                    )
                
                return response
                
            except Exception as e:
                self.observe_error(e, f"Anthropic API call with model {model}")
                raise
        
        client.messages.create = wrapped_create
        return client


class LangChainObserver(UniversalAgentObserver):
    """LangChain-specific observer"""
    
    def __init__(self, agent_name: str = "LangChain-Agent", **kwargs):
        super().__init__(agent_name, "langchain", **kwargs)
    
    def create_callbacks(self):
        """Create LangChain callbacks for observability"""
        from langchain.callbacks.base import BaseCallbackHandler
        
        class ObservabilityCallback(BaseCallbackHandler):
            def __init__(self, observer):
                self.observer = observer
            
            def on_llm_start(self, serialized, prompts, **kwargs):
                self.observer.send_event(
                    event_type="langchain_llm_start",
                    payload={"prompts": prompts, "serialized": serialized},
                    summary=f"Starting LLM with {len(prompts)} prompts"
                )
            
            def on_llm_end(self, response, **kwargs):
                self.observer.send_event(
                    event_type="langchain_llm_end",
                    payload={"generations": len(response.generations)},
                    summary="LLM call completed"
                )
            
            def on_chain_start(self, serialized, inputs, **kwargs):
                self.observer.send_event(
                    event_type="langchain_chain_start",
                    payload={"chain": serialized.get("name", "unknown"), "inputs": inputs},
                    summary=f"Starting chain: {serialized.get('name', 'unknown')}"
                )
            
            def on_tool_start(self, serialized, input_str, **kwargs):
                self.observer.send_event(
                    event_type="langchain_tool_start",
                    payload={"tool": serialized.get("name", "unknown"), "input": input_str},
                    summary=f"Using tool: {serialized.get('name', 'unknown')}"
                )
            
            def on_chain_error(self, error, **kwargs):
                self.observer.observe_error(error, "LangChain execution")
        
        return [ObservabilityCallback(self)]


# Example usage functions
def example_openai_integration():
    """Example: Integrating with OpenAI"""
    from openai import OpenAI
    
    # Create observer
    observer = OpenAIObserver("MyGPT-Agent")
    
    # Wrap client
    client = OpenAI()
    client = observer.wrap_openai_client(client)
    
    # Now all API calls are automatically tracked
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}]
    )
    
    return observer


def example_anthropic_integration():
    """Example: Integrating with Anthropic"""
    import anthropic
    
    # Create observer
    observer = AnthropicObserver("MyClaude-Agent")
    
    # Wrap client
    client = anthropic.Anthropic()
    client = observer.wrap_anthropic_client(client)
    
    # Now all API calls are automatically tracked
    response = client.messages.create(
        model="claude-3-opus-20240229",
        messages=[{"role": "user", "content": "Hello!"}]
    )
    
    return observer


def example_langchain_integration():
    """Example: Integrating with LangChain"""
    from langchain.chat_models import ChatOpenAI
    from langchain.chains import LLMChain
    from langchain.prompts import ChatPromptTemplate
    
    # Create observer
    observer = LangChainObserver("MyLangChain-Agent")
    
    # Create chain with callbacks
    llm = ChatOpenAI(callbacks=observer.create_callbacks())
    prompt = ChatPromptTemplate.from_template("Tell me about {topic}")
    chain = LLMChain(llm=llm, prompt=prompt, callbacks=observer.create_callbacks())
    
    # Run chain - automatically tracked
    result = chain.run(topic="AI observability")
    
    return observer


def example_custom_agent():
    """Example: Custom agent with manual tracking"""
    observer = UniversalAgentObserver("MyCustom-Agent", "custom")
    
    # Track custom events
    observer.observe_custom("agent_initialized", {"version": "1.0.0"})
    
    # Decorate functions
    @observer.observe_function
    def process_data(data):
        # Simulate processing
        time.sleep(0.1)
        return {"processed": data}
    
    # Use decorated function - automatically tracked
    result = process_data("test data")
    
    # Manual tool tracking
    observer.observe_tool_use("database_query", {"query": "SELECT * FROM users"})
    
    # Track errors
    try:
        raise ValueError("Something went wrong")
    except Exception as e:
        observer.observe_error(e, "data processing")
    
    return observer


if __name__ == "__main__":
    print("Universal Agent Observer - Examples")
    print("=" * 50)
    
    # Test sending a simple event
    observer = UniversalAgentObserver("Test-Agent", "test")
    success = observer.send_event(
        event_type="test",
        payload={"message": "Universal agent observer is working!"},
        summary="Test event from universal observer"
    )
    
    if success:
        print("✅ Successfully sent test event!")
        print(f"   Agent: {observer.agent_name}")
        print(f"   Session: {observer.session_id}")
        print(f"   Server: {observer.server_url}")
    else:
        print("❌ Failed to send test event")
    
    print("\n📚 Integration Examples:")
    print("1. OpenAI: example_openai_integration()")
    print("2. Anthropic: example_anthropic_integration()")
    print("3. LangChain: example_langchain_integration()")
    print("4. Custom: example_custom_agent()")
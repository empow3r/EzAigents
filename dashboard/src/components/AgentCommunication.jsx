'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const AgentCommunication = ({ agents = [] }) => {
  const [isClient, setIsClient] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('command');
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [agentResponses, setAgentResponses] = useState({});
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      initializeCommunication();
      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [isClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeCommunication = useCallback(() => {
    // Initialize WebSocket for agent communication
    try {
      wsRef.current = new WebSocket(`ws://${window.location.host}/ws/agent-communication`);
      
      wsRef.current.onopen = () => {
        setConnectionStatus('connected');
        addSystemMessage('Connected to agent communication system');
      };
      
      wsRef.current.onmessage = handleAgentMessage;
      
      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        addSystemMessage('Disconnected from agent communication system');
      };
      
      wsRef.current.onerror = () => {
        setConnectionStatus('error');
        addSystemMessage('Error connecting to agent communication system');
      };
    } catch (error) {
      setConnectionStatus('error');
      addSystemMessage('WebSocket not available, using simulated communication');
      simulateAgentCommunication();
    }
  }, []);

  const simulateAgentCommunication = useCallback(() => {
    // Simulate some agent messages for demonstration
    const simulatedMessages = [
      { type: 'agent_message', agentId: 'claude-001', agentType: 'claude', message: 'System initialized and ready for tasks', timestamp: new Date().toISOString() },
      { type: 'agent_message', agentId: 'gpt-001', agentType: 'gpt', message: 'Backend services are operational', timestamp: new Date().toISOString() },
      { type: 'agent_message', agentId: 'deepseek-001', agentType: 'deepseek', message: 'Testing framework loaded successfully', timestamp: new Date().toISOString() }
    ];

    simulatedMessages.forEach((msg, index) => {
      setTimeout(() => {
        handleAgentMessage({ data: JSON.stringify(msg) });
      }, (index + 1) * 2000);
    });
  }, []);

  const handleAgentMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'agent_message':
          addMessage({
            id: Date.now() + Math.random(),
            from: data.agentId || data.agentType,
            agentType: data.agentType,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
            type: 'received'
          });
          break;
          
        case 'agent_response':
          setAgentResponses(prev => ({
            ...prev,
            [data.agentId]: {
              ...data.response,
              timestamp: new Date().toISOString()
            }
          }));
          addMessage({
            id: Date.now() + Math.random(),
            from: data.agentId,
            agentType: data.agentType,
            message: data.response.message,
            timestamp: new Date().toISOString(),
            type: 'response',
            status: data.response.status
          });
          break;
          
        case 'broadcast_acknowledgment':
          addMessage({
            id: Date.now() + Math.random(),
            from: data.agentId,
            agentType: data.agentType,
            message: `Acknowledged broadcast message`,
            timestamp: new Date().toISOString(),
            type: 'ack'
          });
          break;
          
        case 'agent_collaboration':
          addMessage({
            id: Date.now() + Math.random(),
            from: 'system',
            message: `${data.initiator} is collaborating with ${data.target} on task: ${data.task}`,
            timestamp: new Date().toISOString(),
            type: 'collaboration'
          });
          break;
      }
    } catch (error) {
      console.error('Failed to parse agent message:', error);
    }
  }, []);

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addSystemMessage = useCallback((message) => {
    addMessage({
      id: Date.now() + Math.random(),
      from: 'system',
      message,
      timestamp: new Date().toISOString(),
      type: 'system'
    });
  }, [addMessage]);

  const sendMessage = useCallback(async () => {
    if (!messageText.trim()) return;

    const message = {
      id: Date.now() + Math.random(),
      from: 'user',
      to: broadcastMode ? 'all' : selectedAgent,
      message: messageText,
      type: messageType,
      timestamp: new Date().toISOString(),
      broadcast: broadcastMode
    };

    // Add to local messages
    addMessage({ ...message, type: 'sent' });

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        // Simulate response for demonstration
        setTimeout(() => {
          simulateAgentResponse(message);
        }, 1000 + Math.random() * 2000);
      }
    } catch (error) {
      addSystemMessage('Failed to send message: ' + error.message);
    }

    setMessageText('');
  }, [messageText, messageType, broadcastMode, selectedAgent, addMessage, addSystemMessage]);

  const simulateAgentResponse = useCallback((sentMessage) => {
    const responses = [
      'Command received and executed successfully',
      'Task has been queued for processing',
      'Analyzing request, please wait...',
      'Error: Unable to process this command',
      'Collaboration request approved',
      'System status: All services operational',
      'Task completed successfully',
      'Warning: High resource usage detected'
    ];

    if (broadcastMode) {
      // Simulate responses from multiple agents
      agents.slice(0, 3).forEach((agent, index) => {
        setTimeout(() => {
          handleAgentMessage({
            data: JSON.stringify({
              type: 'agent_response',
              agentId: `${agent.type}-001`,
              agentType: agent.type,
              response: {
                message: responses[Math.floor(Math.random() * responses.length)],
                status: Math.random() > 0.8 ? 'error' : 'success'
              }
            })
          });
        }, (index + 1) * 500);
      });
    } else if (selectedAgent) {
      setTimeout(() => {
        handleAgentMessage({
          data: JSON.stringify({
            type: 'agent_response',
            agentId: selectedAgent,
            agentType: selectedAgent.split('-')[0],
            response: {
              message: responses[Math.floor(Math.random() * responses.length)],
              status: Math.random() > 0.8 ? 'error' : 'success'
            }
          })
        });
      }, 1000);
    }
  }, [broadcastMode, selectedAgent, agents, handleAgentMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearMessages = () => {
    setMessages([]);
    addSystemMessage('Message history cleared');
  };

  const getMessageColor = (messageType) => {
    switch (messageType) {
      case 'sent': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'received': return 'bg-green-100 border-green-300 text-green-800';
      case 'response': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'system': return 'bg-gray-100 border-gray-300 text-gray-600';
      case 'ack': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'collaboration': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading communication interface...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Communication Interface */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Agent Communication Interface</h2>
            <div className="flex items-center space-x-4">
              <div className={`text-sm ${getConnectionStatusColor()}`}>
                ● {connectionStatus}
              </div>
              <button
                onClick={clearMessages}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Message Area */}
        <div className="h-96 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border ${getMessageColor(message.type)} max-w-3xl ${
                  message.from === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium">
                    {message.from === 'user' ? 'You' : 
                     message.from === 'system' ? 'System' :
                     `${message.agentType || 'Agent'} (${message.from})`}
                    {message.broadcast && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-1 rounded">BROADCAST</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm">{message.message}</div>
                {message.status && (
                  <div className={`text-xs mt-1 ${
                    message.status === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Status: {message.status}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="broadcastMode"
                  checked={broadcastMode}
                  onChange={(e) => setBroadcastMode(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="broadcastMode" className="text-sm text-gray-700">
                  Broadcast to all agents
                </label>
              </div>

              {!broadcastMode && (
                <select
                  value={selectedAgent || ''}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select agent...</option>
                  {agents.map((agent, index) => (
                    <option key={index} value={`${agent.type}-${index + 1}`}>
                      {agent.name || agent.type} ({agent.type}-{index + 1})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="command">Command</option>
                <option value="query">Query</option>
                <option value="collaboration">Collaboration</option>
                <option value="status">Status Request</option>
              </select>
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={broadcastMode ? "Message to all agents..." : "Message to selected agent..."}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!broadcastMode && !selectedAgent}
              />
              <button
                onClick={sendMessage}
                disabled={!messageText.trim() || (!broadcastMode && !selectedAgent)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            {/* Quick Commands */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMessageText('status')}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Get Status
              </button>
              <button
                onClick={() => setMessageText('health_check')}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Health Check
              </button>
              <button
                onClick={() => setMessageText('pause_tasks')}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Pause Tasks
              </button>
              <button
                onClick={() => setMessageText('resume_tasks')}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Resume Tasks
              </button>
              <button
                onClick={() => setMessageText('clear_queue')}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Clear Queue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Response Summary */}
      {Object.keys(agentResponses).length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Agent Responses</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(agentResponses).slice(-6).map(([agentId, response]) => (
                <div key={agentId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{agentId}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      response.status === 'success' ? 'bg-green-100 text-green-800' :
                      response.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {response.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{response.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCommunication;
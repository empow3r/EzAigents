'use client';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Bot, 
  User, 
  Zap, 
  Brain, 
  MessageCircle,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';

export default function ChatDashboard() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);

  const agentProfiles = {
    'claude': { name: 'Claude', icon: '🧠', color: 'bg-blue-500', specialty: 'Architecture & Refactoring' },
    'gpt': { name: 'GPT-4', icon: '⚡', color: 'bg-green-500', specialty: 'Backend Logic' },
    'deepseek': { name: 'DeepSeek', icon: '🔍', color: 'bg-purple-500', specialty: 'Testing & Analysis' },
    'mistral': { name: 'Mistral', icon: '📚', color: 'bg-orange-500', specialty: 'Documentation' },
    'gemini': { name: 'Gemini', icon: '💎', color: 'bg-red-500', specialty: 'Security & Performance' }
  };

  useEffect(() => {
    // Initialize chat system
    initializeChat();
    
    // Set up real-time message streaming
    if (isStreaming) {
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Get active agents
      const response = await fetch('/api/agent-stats');
      const data = await response.json();
      
      if (data.success) {
        const activeAgents = Object.keys(data).filter(key => 
          !['activeAgents', 'totalAgents'].includes(key)
        );
        setAgents(activeAgents);
        setConnectionStatus('connected');
      }
      
      // Load recent messages
      await fetchMessages();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setConnectionStatus('error');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/agent-chat?limit=50');
      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      agent: selectedAgent
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    try {
      // Send to agent chat API
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          agent: selectedAgent,
          type: 'command'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: result.response || 'Command sent to agents',
          sender: 'system',
          timestamp: new Date().toISOString(),
          agent: selectedAgent
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Failed to send message. Please try again.',
        sender: 'error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendQuickCommand = async (command) => {
    setInputMessage(command);
    setTimeout(() => sendMessage(), 100);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (sender) => {
    switch (sender) {
      case 'user':
        return 'bg-blue-500 text-white ml-auto';
      case 'system':
        return 'bg-gray-200 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const quickCommands = [
    { label: 'Status Check', command: '/status', icon: RefreshCw },
    { label: 'Queue Stats', command: '/queue', icon: MessageCircle },
    { label: 'Start All Agents', command: '/start', icon: Play },
    { label: 'Pause Processing', command: '/pause', icon: Pause },
    { label: 'Clear Queues', command: '/clear', icon: Settings }
  ];

  return (
    <div className="h-full flex flex-col p-6 max-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-blue-500" />
            Agent Chat Control
          </h1>
          <p className="text-gray-600">Real-time communication with AI agents</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'error' ? 'Error' : 'Connecting...'}
          </div>
          
          <Button
            variant={isStreaming ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsStreaming(!isStreaming)}
          >
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-6 min-h-0">
        {/* Agent Status Panel */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant={selectedAgent === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedAgent('all')}
              >
                <Bot className="w-4 h-4 mr-2" />
                All Agents
              </Button>
              
              {agents.map(agent => {
                const profile = agentProfiles[agent] || { 
                  name: agent, 
                  icon: '🤖', 
                  color: 'bg-gray-500',
                  specialty: 'General'
                };
                
                return (
                  <Button
                    key={agent}
                    variant={selectedAgent === agent ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <Avatar className="w-5 h-5 mr-2">
                      <AvatarFallback className={`${profile.color} text-white text-xs`}>
                        {profile.icon}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-medium text-xs">{profile.name}</div>
                      <div className="text-xs text-gray-500">{profile.specialty}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agent Communication</span>
              <span className="text-sm text-gray-500">
                {selectedAgent === 'all' ? 'Broadcasting to all agents' : 
                 `Chatting with ${agentProfiles[selectedAgent]?.name || selectedAgent}`}
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 mb-4 border rounded-lg p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start a conversation with your agents!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={
                          message.sender === 'user' ? 'bg-blue-500 text-white' :
                          message.sender === 'system' ? 'bg-gray-500 text-white' :
                          'bg-green-500 text-white'
                        }>
                          {message.sender === 'user' ? <User className="w-4 h-4" /> :
                           message.sender === 'system' ? <Settings className="w-4 h-4" /> :
                           <Bot className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.sender === 'user' ? 'You' :
                             message.sender === 'system' ? 'System' :
                             agentProfiles[message.agent]?.name || message.agent}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        <div className={`p-3 rounded-lg max-w-md ${getMessageStyle(message.sender)}`}>
                          {message.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Commands */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Quick Commands:</div>
              <div className="flex gap-2 flex-wrap">
                {quickCommands.map(cmd => (
                  <Button
                    key={cmd.command}
                    variant="outline"
                    size="sm"
                    onClick={() => sendQuickCommand(cmd.command)}
                  >
                    <cmd.icon className="w-3 h-3 mr-1" />
                    {cmd.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Send a message to ${selectedAgent === 'all' ? 'all agents' : agentProfiles[selectedAgent]?.name || selectedAgent}...`}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
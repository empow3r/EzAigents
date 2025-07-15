'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { Badge } from '@/src/components/ui/badge';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCollaborationService } from '../hooks/useCollaborationService';

const AGENT_COLORS = {
  claude: '#8B5CF6',
  gpt: '#10B981',
  deepseek: '#F59E0B',
  mistral: '#3B82F6',
  gemini: '#EF4444',
  user: '#6B7280'
};

export default function CollaborationHub() {
  const [activeUsers, setActiveUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursors, setCursors] = useState({});
  const [annotations, setAnnotations] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewportSync, setViewportSync] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  
  const canvasRef = useRef(null);
  const chatScrollRef = useRef(null);
  
  const { 
    initializeCollaboration, 
    sendMessage, 
    sendCursorPosition,
    sendAnnotation,
    startScreenShare,
    stopScreenShare 
  } = useCollaborationService();
  
  const {
    localStream,
    remoteStreams,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled
  } = useWebRTC();

  useEffect(() => {
    initializeCollaboration({
      onUserJoin: (user) => {
        setActiveUsers(prev => [...prev, user]);
      },
      onUserLeave: (userId) => {
        setActiveUsers(prev => prev.filter(u => u.id !== userId));
        setCursors(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      },
      onMessage: (message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      },
      onCursorMove: ({ userId, position }) => {
        setCursors(prev => ({
          ...prev,
          [userId]: position
        }));
      },
      onAnnotation: (annotation) => {
        setAnnotations(prev => [...prev, annotation]);
      },
      onViewportSync: ({ userId, viewport }) => {
        if (viewportSync && userId !== 'current-user') {
          window.scrollTo(viewport.x, viewport.y);
        }
      }
    });
  }, [initializeCollaboration, viewportSync]);

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim()) {
      sendMessage({
        text: messageInput,
        timestamp: new Date().toISOString(),
        sender: {
          id: 'current-user',
          name: 'You',
          type: 'user'
        }
      });
      setMessageInput('');
    }
  }, [messageInput, sendMessage]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: Date.now()
    };
    sendCursorPosition(position);
  }, [sendCursorPosition]);

  const handleAnnotation = useCallback((e) => {
    if (e.shiftKey && e.type === 'click') {
      const rect = e.currentTarget.getBoundingClientRect();
      const annotation = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: prompt('Add annotation:'),
        userId: 'current-user',
        timestamp: new Date().toISOString()
      };
      if (annotation.text) {
        sendAnnotation(annotation);
      }
    }
  }, [sendAnnotation]);

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const success = await startScreenShare();
      setIsScreenSharing(success);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Collaboration Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Active Users Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Active Collaborators ({activeUsers.length})</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewportSync ? "default" : "outline"}
                  onClick={() => setViewportSync(!viewportSync)}
                >
                  {viewportSync ? "Sync On" : "Sync Off"}
                </Button>
                <Button
                  size="sm"
                  variant={isScreenSharing ? "destructive" : "outline"}
                  onClick={toggleScreenShare}
                >
                  {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeUsers.map(user => (
                <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: AGENT_COLORS[user.type] || AGENT_COLORS.user }}
                  />
                  <span className="text-sm font-medium">{user.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {user.status || 'active'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collaborative Canvas */}
        <Card>
          <CardHeader>
            <CardTitle>Collaborative Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={canvasRef}
              className="relative w-full h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-crosshair"
              onMouseMove={handleMouseMove}
              onClick={handleAnnotation}
            >
              {/* Remote Cursors */}
              {Object.entries(cursors).map(([userId, position]) => {
                const user = activeUsers.find(u => u.id === userId);
                if (!user) return null;
                
                return (
                  <div
                    key={userId}
                    className="absolute pointer-events-none transition-all duration-100"
                    style={{
                      left: position.x,
                      top: position.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: AGENT_COLORS[user.type] || AGENT_COLORS.user }}
                    />
                    <span className="absolute top-5 left-0 text-xs bg-black text-white px-1 rounded whitespace-nowrap">
                      {user.name}
                    </span>
                  </div>
                );
              })}

              {/* Annotations */}
              {annotations.map((annotation, idx) => (
                <div
                  key={idx}
                  className="absolute p-2 bg-yellow-100 border border-yellow-300 rounded shadow-sm"
                  style={{
                    left: annotation.x,
                    top: annotation.y,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="text-xs font-medium">{annotation.text}</div>
                  <div className="text-xs text-gray-500">
                    {activeUsers.find(u => u.id === annotation.userId)?.name || 'Unknown'}
                  </div>
                </div>
              ))}

              {/* File Preview Area */}
              {selectedFile && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
                  <div className="text-center">
                    <div className="text-lg font-medium">{selectedFile}</div>
                    <div className="text-sm text-gray-500">Collaborative editing mode</div>
                  </div>
                </div>
              )}

              {/* Screen Share Display */}
              {localStream && isScreenSharing && (
                <video
                  autoPlay
                  muted
                  className="absolute inset-0 w-full h-full object-contain"
                  ref={video => {
                    if (video) video.srcObject = localStream;
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Call Grid */}
        {(localStream || remoteStreams.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Video Conference</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isAudioEnabled ? "default" : "destructive"}
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? "🎤" : "🔇"}
                  </Button>
                  <Button
                    size="sm"
                    variant={isVideoEnabled ? "default" : "destructive"}
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? "📹" : "📹❌"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={endCall}
                  >
                    End Call
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {localStream && (
                  <div className="relative">
                    <video
                      autoPlay
                      muted
                      className="w-full rounded-lg bg-black"
                      ref={video => {
                        if (video) video.srcObject = localStream;
                      }}
                    />
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      You
                    </div>
                  </div>
                )}
                {remoteStreams.map((stream, idx) => (
                  <div key={idx} className="relative">
                    <video
                      autoPlay
                      className="w-full rounded-lg bg-black"
                      ref={video => {
                        if (video) video.srcObject = stream;
                      }}
                    />
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      Agent {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Sidebar */}
      <div className="space-y-4">
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>Team Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea ref={chatScrollRef} className="flex-1 pr-4">
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback 
                        style={{ 
                          backgroundColor: AGENT_COLORS[msg.sender.type] || AGENT_COLORS.user 
                        }}
                      >
                        {msg.sender.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{msg.sender.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => startCall()}>
                Start Video Call
              </Button>
              <Button className="w-full" size="sm" variant="outline">
                Request Code Review
              </Button>
              <Button className="w-full" size="sm" variant="outline">
                Share Terminal
              </Button>
              <Button className="w-full" size="sm" variant="outline">
                Create Breakout Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
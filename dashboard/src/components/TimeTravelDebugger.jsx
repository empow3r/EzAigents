'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const EVENT_TYPES = {
  TASK_RECEIVED: 'task_received',
  TASK_PROCESSING: 'task_processing',
  TASK_COMPLETED: 'task_completed',
  ERROR_OCCURRED: 'error_occurred',
  AGENT_SPAWNED: 'agent_spawned',
  AGENT_TERMINATED: 'agent_terminated',
  COMMUNICATION: 'communication',
  DECISION_MADE: 'decision_made',
  RESOURCE_CHANGED: 'resource_changed',
  ANOMALY_DETECTED: 'anomaly_detected'
};

const EVENT_COLORS = {
  [EVENT_TYPES.TASK_RECEIVED]: '#3B82F6',
  [EVENT_TYPES.TASK_PROCESSING]: '#8B5CF6',
  [EVENT_TYPES.TASK_COMPLETED]: '#10B981',
  [EVENT_TYPES.ERROR_OCCURRED]: '#EF4444',
  [EVENT_TYPES.AGENT_SPAWNED]: '#06B6D4',
  [EVENT_TYPES.AGENT_TERMINATED]: '#F59E0B',
  [EVENT_TYPES.COMMUNICATION]: '#84CC16',
  [EVENT_TYPES.DECISION_MADE]: '#F97316',
  [EVENT_TYPES.RESOURCE_CHANGED]: '#8B5CF6',
  [EVENT_TYPES.ANOMALY_DETECTED]: '#DC2626'
};

export default function TimeTravelDebugger() {
  const [timeline, setTimeline] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [systemStates, setSystemStates] = useState([]);
  const [agentStates, setAgentStates] = useState(new Map());
  const [filters, setFilters] = useState({
    eventTypes: new Set(Object.values(EVENT_TYPES)),
    agents: new Set(),
    timeRange: [0, 100]
  });

  const intervalRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    loadTimelineData();
    setupRealtimeUpdates();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const maxTime = timeline.length - 1;
          if (prev >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return prev + playbackSpeed;
        });
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, playbackSpeed, timeline.length]);

  const loadTimelineData = async () => {
    try {
      const response = await fetch('/api/timeline-events');
      const events = await response.json();
      
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setTimeline(sortedEvents);
      generateSystemStates(sortedEvents);
      
      // Update filters with available agents
      const agents = new Set(events.map(e => e.agent).filter(Boolean));
      setFilters(prev => ({ ...prev, agents }));
    } catch (error) {
      console.error('Error loading timeline data:', error);
      // Generate mock data for demonstration
      const mockEvents = generateMockTimelineData();
      setTimeline(mockEvents);
      generateSystemStates(mockEvents);
    }
  };

  const generateMockTimelineData = () => {
    const events = [];
    const agents = ['claude-1', 'gpt-1', 'deepseek-1', 'mistral-1'];
    const startTime = Date.now() - 3600000; // 1 hour ago

    for (let i = 0; i < 200; i++) {
      const timestamp = startTime + i * 18000; // Every 18 seconds
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const eventType = Object.values(EVENT_TYPES)[Math.floor(Math.random() * Object.values(EVENT_TYPES).length)];
      
      events.push({
        id: `event-${i}`,
        timestamp: new Date(timestamp).toISOString(),
        type: eventType,
        agent,
        data: generateEventData(eventType, agent),
        duration: Math.random() * 5000 + 100,
        success: Math.random() > 0.1
      });
    }

    return events;
  };

  const generateEventData = (eventType, agent) => {
    const baseData = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      queueDepth: Math.floor(Math.random() * 50),
      activeConnections: Math.floor(Math.random() * 100)
    };

    switch (eventType) {
      case EVENT_TYPES.TASK_RECEIVED:
        return {
          ...baseData,
          taskId: `task-${Math.random().toString(36).substr(2, 9)}`,
          complexity: Math.floor(Math.random() * 10) + 1,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        };
      
      case EVENT_TYPES.DECISION_MADE:
        return {
          ...baseData,
          decision: ['accept', 'delegate', 'reject'][Math.floor(Math.random() * 3)],
          confidence: Math.random(),
          factors: ['queue_depth', 'cpu_usage', 'task_complexity', 'agent_experience']
        };
      
      case EVENT_TYPES.ERROR_OCCURRED:
        return {
          ...baseData,
          error: 'Connection timeout',
          stack: 'Error: Connection timeout\n  at Agent.processTask',
          retryCount: Math.floor(Math.random() * 3)
        };
      
      default:
        return baseData;
    }
  };

  const generateSystemStates = (events) => {
    const states = [];
    let currentState = {
      timestamp: events[0]?.timestamp || new Date().toISOString(),
      agents: new Map(),
      resources: { cpu: 0, memory: 0, network: 0 },
      metrics: { tasksCompleted: 0, errors: 0, totalTasks: 0 }
    };

    events.forEach((event, index) => {
      // Update agent state
      const agentId = event.agent;
      if (agentId) {
        const agentState = currentState.agents.get(agentId) || {
          status: 'idle',
          currentTask: null,
          taskCount: 0,
          errorCount: 0
        };

        switch (event.type) {
          case EVENT_TYPES.TASK_RECEIVED:
            agentState.status = 'processing';
            agentState.currentTask = event.data.taskId;
            agentState.taskCount++;
            currentState.metrics.totalTasks++;
            break;
          
          case EVENT_TYPES.TASK_COMPLETED:
            agentState.status = 'idle';
            agentState.currentTask = null;
            currentState.metrics.tasksCompleted++;
            break;
          
          case EVENT_TYPES.ERROR_OCCURRED:
            agentState.errorCount++;
            currentState.metrics.errors++;
            break;
        }

        currentState.agents.set(agentId, agentState);
      }

      // Update resource usage
      if (event.data.cpu) currentState.resources.cpu = event.data.cpu;
      if (event.data.memory) currentState.resources.memory = event.data.memory;
      if (event.data.network) currentState.resources.network = event.data.network;

      // Save state snapshot
      states.push({
        ...JSON.parse(JSON.stringify(currentState)),
        timestamp: event.timestamp,
        eventIndex: index
      });
    });

    setSystemStates(states);
  };

  const setupRealtimeUpdates = () => {
    // Simulate real-time event updates
    const updateInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newEvent = {
          id: `event-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: Object.values(EVENT_TYPES)[Math.floor(Math.random() * Object.values(EVENT_TYPES).length)],
          agent: `agent-${Math.floor(Math.random() * 4) + 1}`,
          data: generateEventData(EVENT_TYPES.TASK_RECEIVED, 'agent-1'),
          duration: Math.random() * 5000 + 100,
          success: Math.random() > 0.1
        };

        setTimeline(prev => [...prev, newEvent]);
      }
    }, 5000);

    return () => clearInterval(updateInterval);
  };

  const getCurrentState = () => {
    const eventIndex = Math.floor(currentTime);
    return systemStates[eventIndex] || systemStates[0];
  };

  const getEventsInRange = (start, end) => {
    return timeline.slice(start, end).filter(event => 
      filters.eventTypes.has(event.type) &&
      (!event.agent || filters.agents.has(event.agent))
    );
  };

  const jumpToEvent = (eventIndex) => {
    setCurrentTime(eventIndex);
    setSelectedEvent(timeline[eventIndex]);
  };

  const restoreToCheckpoint = (stateIndex) => {
    const targetState = systemStates[stateIndex];
    if (targetState) {
      setCurrentTime(targetState.eventIndex);
      setSelectedEvent(timeline[targetState.eventIndex]);
    }
  };

  const exportDebugSession = () => {
    const debugData = {
      timeline,
      systemStates,
      currentTime,
      selectedEvent,
      filters,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentState = getCurrentState();
  const visibleEvents = getEventsInRange(
    Math.max(0, currentTime - 50),
    Math.min(timeline.length, currentTime + 50)
  );

  return (
    <div className="space-y-6">
      {/* Timeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Time Travel Debugger</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                disabled={currentTime <= 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                variant={isPlaying ? "destructive" : "default"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentTime(Math.min(timeline.length - 1, currentTime + 10))}
                disabled={currentTime >= timeline.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentTime(0)}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline Scrubber */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Time: {currentTime.toFixed(0)} / {timeline.length}</span>
                <span>Speed: {playbackSpeed}x</span>
              </div>
              <Slider
                value={[currentTime]}
                onValueChange={([value]) => setCurrentTime(value)}
                max={timeline.length - 1}
                step={1}
                className="w-full"
              />
              <Slider
                value={[playbackSpeed]}
                onValueChange={([value]) => setPlaybackSpeed(value)}
                min={0.25}
                max={4}
                step={0.25}
                className="w-full"
              />
            </div>

            {/* Event Type Filters */}
            <div className="flex flex-wrap gap-2">
              {Object.values(EVENT_TYPES).map(type => (
                <Badge
                  key={type}
                  variant={filters.eventTypes.has(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setFilters(prev => {
                      const newTypes = new Set(prev.eventTypes);
                      if (newTypes.has(type)) {
                        newTypes.delete(type);
                      } else {
                        newTypes.add(type);
                      }
                      return { ...prev, eventTypes: newTypes };
                    });
                  }}
                >
                  {type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System State at Current Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>CPU Usage</span>
                  <span>{currentState?.resources.cpu.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentState?.resources.cpu || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{currentState?.resources.memory.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentState?.resources.memory || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(currentState?.agents.entries() || []).map(([agentId, state]) => (
                <div key={agentId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{agentId}</span>
                  <Badge variant={state.status === 'processing' ? 'default' : 'secondary'}>
                    {state.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Tasks:</span>
                <span className="font-medium">{currentState?.metrics.totalTasks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed:</span>
                <span className="font-medium text-green-600">{currentState?.metrics.tasksCompleted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Errors:</span>
                <span className="font-medium text-red-600">{currentState?.metrics.errors || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Success Rate:</span>
                <span className="font-medium">
                  {currentState?.metrics.totalTasks > 0 
                    ? ((currentState.metrics.tasksCompleted / currentState.metrics.totalTasks) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemStates.map((state, index) => ({
                index,
                cpu: state.resources.cpu,
                memory: state.resources.memory,
                errors: state.metrics.errors,
                tasks: state.metrics.totalTasks
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <ReferenceLine 
                  x={currentTime} 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  label="Current Time"
                />
                <Line type="monotone" dataKey="cpu" stroke="#3B82F6" name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#10B981" name="Memory %" />
                <Line type="monotone" dataKey="errors" stroke="#EF4444" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {visibleEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvent?.id === event.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: EVENT_COLORS[event.type] }}
                      />
                      <span className="font-medium text-sm">{event.type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs text-gray-500">{event.agent}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvent ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Event Type:</span>
                  <Badge className="ml-2">{selectedEvent.type}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Agent:</span>
                  <span className="ml-2">{selectedEvent.agent}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Timestamp:</span>
                  <span className="ml-2">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Duration:</span>
                  <span className="ml-2">{selectedEvent.duration}ms</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Success:</span>
                  <Badge variant={selectedEvent.success ? "default" : "destructive"} className="ml-2">
                    {selectedEvent.success ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Data:</span>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedEvent.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select an event to view details</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Session Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={exportDebugSession} variant="outline">
              Export Debug Session
            </Button>
            <Button onClick={() => setCurrentTime(0)} variant="outline">
              Reset to Start
            </Button>
            <Button onClick={() => setSelectedEvent(null)} variant="outline">
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
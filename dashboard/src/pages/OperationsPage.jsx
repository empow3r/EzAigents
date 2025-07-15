'use client';
import React, { useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import * as Icons from 'lucide-react';

const OperationsPage = ({ darkMode, realTimeData = {} }) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data - replace with real data
  const tasks = [
    { id: 1, title: 'Refactor authentication module', agent: 'Claude', status: 'in-progress', priority: 'high', progress: 65 },
    { id: 2, title: 'Create API endpoints', agent: 'GPT-4', status: 'completed', priority: 'medium', progress: 100 },
    { id: 3, title: 'Generate unit tests', agent: 'DeepSeek', status: 'pending', priority: 'low', progress: 0 },
    { id: 4, title: 'Update documentation', agent: 'Mistral', status: 'in-progress', priority: 'medium', progress: 30 },
    { id: 5, title: 'Optimize database queries', agent: 'Gemini', status: 'failed', priority: 'high', progress: 45 }
  ];

  const agents = [
    { id: 'claude_001', name: 'Claude', status: 'active', tasks: 3, cpu: 45, memory: 62 },
    { id: 'gpt_001', name: 'GPT-4', status: 'active', tasks: 2, cpu: 38, memory: 55 },
    { id: 'deepseek_001', name: 'DeepSeek', status: 'idle', tasks: 0, cpu: 12, memory: 30 },
    { id: 'mistral_001', name: 'Mistral', status: 'active', tasks: 1, cpu: 28, memory: 40 },
    { id: 'gemini_001', name: 'Gemini', status: 'error', tasks: 0, cpu: 0, memory: 0 }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <Icons.CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <Icons.Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <Icons.XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Icons.Clock className="h-4 w-4 text-gray-500" />;
      default: return <Icons.AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.agent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operations Center</h2>
          <p className="text-muted-foreground">
            Manage tasks, agents, and system operations
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Icons.RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Icons.Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="queues">Queue Management</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'in-progress', 'completed', 'failed'].map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Task List */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Task Queue</h3>
              <div className="space-y-2">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedTask?.id === task.id ? 'border-primary bg-accent' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(task.status)}
                          <h4 className="font-medium">{task.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{task.agent}</Badge>
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {task.status === 'in-progress' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Task Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Task Details</h3>
              {selectedTask ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedTask.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Agent</p>
                      <p className="font-medium">{selectedTask.agent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedTask.status)}
                        <span className="font-medium capitalize">{selectedTask.status.replace('-', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button size="sm" className="flex-1">
                      <Icons.Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Icons.Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Icons.Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Select a task to view details
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => (
              <Card key={agent.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{agent.name}</h4>
                    <p className="text-sm text-muted-foreground">{agent.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                    <span className="text-sm capitalize">{agent.status}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>{agent.cpu}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${agent.cpu}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory</span>
                      <span>{agent.memory}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${agent.memory}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Icons.Settings className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Icons.RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Queue Management Tab */}
        <TabsContent value="queues" className="space-y-4">
          <div className="grid gap-4">
            {['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'].map(queue => (
              <Card key={queue} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">queue:{queue}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor(Math.random() * 10)} tasks pending
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      View Tasks
                    </Button>
                    <Button size="sm" variant="outline">
                      Clear Queue
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationsPage;
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import * as Icons from 'lucide-react';

const ProjectCreator = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [projectData, setProjectData] = useState({
    projectName: '',
    projectType: 'web-app',
    description: '',
    features: [],
    timeline: '24',
    budget: 'efficient',
    techStack: []
  });
  
  const [currentFeature, setCurrentFeature] = useState('');
  const [currentTech, setCurrentTech] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);

  const projectTypes = [
    { value: 'web-app', label: 'Web Application' },
    { value: 'mobile-app', label: 'Mobile Application' },
    { value: 'api', label: 'API Service' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'saas', label: 'SaaS Platform' },
    { value: 'ai-app', label: 'AI Application' }
  ];

  const commonFeatures = [
    'User Authentication',
    'Real-time Updates',
    'Payment Processing',
    'Admin Dashboard',
    'API Integration',
    'Email Notifications',
    'File Upload',
    'Search Functionality',
    'Analytics Dashboard',
    'Multi-language Support'
  ];

  const commonTechStack = [
    'React', 'Vue', 'Angular', 'Next.js',
    'Node.js', 'Python', 'Ruby', 'PHP',
    'PostgreSQL', 'MongoDB', 'MySQL', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'GCP'
  ];

  useEffect(() => {
    if (executionStatus?.projectId) {
      const interval = setInterval(() => {
        fetchProjectStatus(executionStatus.projectId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [executionStatus?.projectId]);

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchProjectStatus = async (projectId) => {
    try {
      const response = await fetch(`/api/project-execution?projectId=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setExecutionStatus(prev => ({
          ...prev,
          ...data.project,
          progress: data.progress,
          tasks: data.tasks,
          activeAgents: data.activeAgents
        }));
      }
    } catch (error) {
      console.error('Failed to fetch project status:', error);
    }
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/project-masterplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCreatedProject(data);
        setActiveTab('plan');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (error) {
      setError('Failed to create project: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExecuteProject = async () => {
    if (!createdProject?.projectId) return;
    
    setError(null);
    
    try {
      const response = await fetch('/api/project-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: createdProject.projectId,
          autoStart: true,
          agentConfig: {
            claude: { count: 1 },
            gpt: { count: 2 },
            deepseek: { count: 1 },
            mistral: { count: 1 },
            gemini: { count: 1 }
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExecutionStatus(data);
        setActiveTab('execute');
      } else {
        setError(data.error || 'Failed to execute project');
      }
    } catch (error) {
      setError('Failed to execute project: ' + error.message);
    }
  };

  const handleProjectAction = async (action) => {
    if (!executionStatus?.projectId) return;
    
    try {
      const response = await fetch('/api/project-execution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: executionStatus.projectId,
          action
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProjectStatus(executionStatus.projectId);
      }
    } catch (error) {
      console.error(`Failed to ${action} project:`, error);
    }
  };

  const addFeature = () => {
    if (currentFeature && !projectData.features.includes(currentFeature)) {
      setProjectData(prev => ({
        ...prev,
        features: [...prev.features, currentFeature]
      }));
      setCurrentFeature('');
    }
  };

  const removeFeature = (feature) => {
    setProjectData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  const addTech = () => {
    if (currentTech && !projectData.techStack.includes(currentTech)) {
      setProjectData(prev => ({
        ...prev,
        techStack: [...prev.techStack, currentTech]
      }));
      setCurrentTech('');
    }
  };

  const removeTech = (tech) => {
    setProjectData(prev => ({
      ...prev,
      techStack: prev.techStack.filter(t => t !== tech)
    }));
  };

  const getAgentIcon = (agentType) => {
    const icons = {
      claude: '🧠',
      gpt: '🤖',
      deepseek: '🔍',
      mistral: '📝',
      gemini: '✨'
    };
    return icons[agentType] || '🤖';
  };

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <Icons.CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Icons.Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <Icons.XCircle className="w-4 h-4 text-red-500" />;
      default: return <Icons.Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Bot className="w-6 h-6" />
            AI Project Creator & Executor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create">
                <Icons.FileCode className="w-4 h-4 mr-2" />
                Create
              </TabsTrigger>
              <TabsTrigger value="plan" disabled={!createdProject}>
                <Icons.Layers className="w-4 h-4 mr-2" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="execute" disabled={!executionStatus}>
                <Icons.Play className="w-4 h-4 mr-2" />
                Execute
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectData.projectName}
                    onChange={(e) => setProjectData(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="My Awesome SaaS"
                  />
                </div>

                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select
                    value={projectData.projectType}
                    onValueChange={(value) => setProjectData(prev => ({ ...prev, projectType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={projectData.description}
                  onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your project idea..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Features</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentFeature}
                    onChange={(e) => setCurrentFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  />
                  <Button onClick={addFeature} size="sm">
                    <Icons.Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectData.features.map(feature => (
                    <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                      {feature}
                      <Icons.Trash2 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeFeature(feature)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonFeatures.map(feature => (
                    <Badge 
                      key={feature} 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => setCurrentFeature(feature)}
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tech Stack</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentTech}
                    onChange={(e) => setCurrentTech(e.target.value)}
                    placeholder="Add technology..."
                    onKeyPress={(e) => e.key === 'Enter' && addTech()}
                  />
                  <Button onClick={addTech} size="sm">
                    <Icons.Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectData.techStack.map(tech => (
                    <Badge key={tech} variant="secondary" className="flex items-center gap-1">
                      {tech}
                      <Icons.Trash2 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeTech(tech)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonTechStack.map(tech => (
                    <Badge 
                      key={tech} 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => setCurrentTech(tech)}
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeline">Timeline (hours)</Label>
                  <Input
                    id="timeline"
                    type="number"
                    value={projectData.timeline}
                    onChange={(e) => setProjectData(prev => ({ ...prev, timeline: e.target.value }))}
                    min="1"
                    max="168"
                  />
                </div>

                <div>
                  <Label htmlFor="budget">Budget Approach</Label>
                  <Select
                    value={projectData.budget}
                    onValueChange={(value) => setProjectData(prev => ({ ...prev, budget: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efficient">Cost Efficient</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="premium">Premium Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleCreateProject}
                disabled={!projectData.projectName || !projectData.description || isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Project Plan...
                  </>
                ) : (
                  'Generate Project Masterplan'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              {createdProject && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Project Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Project ID</dt>
                            <dd className="text-sm">{createdProject.projectId}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Name</dt>
                            <dd className="text-sm">{createdProject.masterplan.projectName}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Type</dt>
                            <dd className="text-sm">{createdProject.masterplan.projectType}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Estimated Time</dt>
                            <dd className="text-sm">
                              {createdProject.masterplan.estimatedCompletion.estimatedHours}h {createdProject.masterplan.estimatedCompletion.estimatedMinutes}m
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tech Stack</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {createdProject.masterplan.techStack.map(tech => (
                            <Badge key={tech}>{tech}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Project Phases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {createdProject.masterplan.phases.map((phase, index) => (
                          <div key={phase.id} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{index + 1}. {phase.name}</h4>
                              <Badge variant="outline">{phase.duration}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">
                                {createdProject.masterplan.taskBreakdown.filter(t => t.phaseId === phase.id).length} tasks
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Agent Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-4">
                        {['claude', 'gpt', 'deepseek', 'mistral', 'gemini'].map(agent => {
                          const taskCount = Object.values(createdProject.masterplan.agentAssignments)
                            .filter(a => a.primaryAgent === agent).length;
                          
                          return (
                            <div key={agent} className="text-center">
                              <div className="text-2xl mb-1">{getAgentIcon(agent)}</div>
                              <div className="text-sm font-medium capitalize">{agent}</div>
                              <div className="text-xs text-gray-500">{taskCount} tasks</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button 
                      onClick={() => setActiveTab('create')}
                      variant="outline"
                    >
                      Back to Edit
                    </Button>
                    <Button 
                      onClick={handleExecuteProject}
                      className="flex-1"
                    >
                      <Icons.Play className="w-4 h-4 mr-2" />
                      Execute Project
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="execute" className="space-y-4">
              {executionStatus && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Execution Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Status</span>
                            <Badge variant={executionStatus.status === 'executing' ? 'default' : 'secondary'}>
                              {executionStatus.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Progress</span>
                            <span className="font-medium">{executionStatus.progress?.percentComplete || 0}%</span>
                          </div>
                          <Progress value={executionStatus.progress?.percentComplete || 0} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Task Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Total</span>
                            <span className="font-medium">{executionStatus.progress?.total || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Completed</span>
                            <span className="font-medium text-green-600">{executionStatus.progress?.completed || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>In Progress</span>
                            <span className="font-medium text-blue-600">{executionStatus.progress?.inProgress || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Failed</span>
                            <span className="font-medium text-red-600">{executionStatus.progress?.failed || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Active Agents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {agents.filter(a => a.status === 'active').map(agent => (
                            <div key={agent.id} className="text-center">
                              <div className="text-xl">{getAgentIcon(agent.type)}</div>
                              <div className="text-xs">{agent.id.split('_')[0]}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleProjectAction('pause')}
                      variant="outline"
                      disabled={executionStatus.status !== 'executing'}
                    >
                      <Icons.Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      onClick={() => handleProjectAction('resume')}
                      variant="outline"
                      disabled={executionStatus.status !== 'paused'}
                    >
                      <Icons.Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                    <Button
                      onClick={() => handleProjectAction('cancel')}
                      variant="outline"
                      disabled={executionStatus.status === 'completed' || executionStatus.status === 'cancelled'}
                    >
                      <Icons.StopCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => fetchProjectStatus(executionStatus.projectId)}
                      variant="outline"
                    >
                      <Icons.RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Task Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {executionStatus.tasks?.map(task => (
                          <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              {getTaskStatusIcon(task.status)}
                              <span className="text-sm">{task.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getAgentIcon(task.assignedAgent)} {task.assignedAgent}
                              </Badge>
                              {task.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleProjectAction('retry-task', task.id)}
                                >
                                  <Icons.RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectCreator;
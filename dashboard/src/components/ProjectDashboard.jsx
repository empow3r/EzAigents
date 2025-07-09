'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, AlertCircle, GitBranch, Package, Activity } from 'lucide-react';

export default function ProjectDashboard() {
  const [taskProgress, setTaskProgress] = useState({
    dashboard: { total: 6, completed: 0, inProgress: 0 },
    system: { total: 12, completed: 0, inProgress: 0 }
  });
  const [enhancementProgress, setEnhancementProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProgress = async () => {
    try {
      // Fetch enhancement progress from Redis
      const response = await fetch('/api/enhancement-progress');
      const data = await response.json();
      
      if (data.success) {
        setEnhancementProgress(data.progress);
        
        // Calculate task progress
        const dashboardTasks = data.tasks?.dashboard || [];
        const systemTasks = data.tasks?.system || [];
        
        setTaskProgress({
          dashboard: {
            total: 6,
            completed: dashboardTasks.filter(t => t.status === 'completed').length,
            inProgress: dashboardTasks.filter(t => t.status === 'in_progress').length
          },
          system: {
            total: 12,
            completed: systemTasks.filter(t => t.status === 'completed').length,
            inProgress: systemTasks.filter(t => t.status === 'in_progress').length
          }
        });
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallProgress = () => {
    const total = taskProgress.dashboard.total + taskProgress.system.total;
    const completed = taskProgress.dashboard.completed + taskProgress.system.completed;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const enhancements = [
    { id: 'security-layer', name: 'Enterprise Security Layer', icon: '🔐', priority: 'CRITICAL' },
    { id: 'observability-stack', name: 'Observability Stack', icon: '📊', priority: 'CRITICAL' },
    { id: 'distributed-queue-system', name: 'Distributed Queue System', icon: '📨', priority: 'HIGH' },
    { id: 'intelligent-orchestration', name: 'Intelligent Orchestration', icon: '🧠', priority: 'MEDIUM' },
    { id: 'collaboration-framework', name: 'Collaboration Framework', icon: '🤝', priority: 'MEDIUM' },
    { id: 'self-healing-infrastructure', name: 'Self-Healing Infrastructure', icon: '🔧', priority: 'HIGH' }
  ];

  const dashboardFeatures = [
    { name: 'Real-time Collaboration', agent: 'Claude', status: 'pending', icon: '🤝' },
    { name: 'AI-Powered Analytics', agent: 'GPT-4', status: 'pending', icon: '📈' },
    { name: 'Advanced Visualizations', agent: 'DeepSeek', status: 'pending', icon: '🎨' },
    { name: 'Voice Commands', agent: 'Mistral', status: 'pending', icon: '🎤' },
    { name: 'Mobile PWA', agent: 'Gemini', status: 'pending', icon: '📱' },
    { name: 'Enhanced Gamification', agent: 'Claude', status: 'pending', icon: '🏆' }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GitBranch className="w-6 h-6" />
              EzAugent Enhancement Progress
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {calculateOverallProgress()}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={calculateOverallProgress()} className="h-4" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {taskProgress.dashboard.completed + taskProgress.system.completed}
              </div>
              <div className="text-sm text-gray-600">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {taskProgress.dashboard.inProgress + taskProgress.system.inProgress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Enhancements */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="w-6 h-6" />
          System Enhancements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enhancements.map((enhancement) => {
            const progress = enhancementProgress[enhancement.id] || 0;
            return (
              <Card key={enhancement.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{enhancement.icon}</span>
                      <h3 className="font-semibold text-sm">{enhancement.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(enhancement.priority)}`}>
                      {enhancement.priority}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {progress === 0 && <Circle className="w-3 h-3" />}
                      {progress > 0 && progress < 100 && <Clock className="w-3 h-3 animate-pulse" />}
                      {progress === 100 && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                      <span>
                        {progress === 0 ? 'Not started' : 
                         progress === 100 ? 'Completed' : 
                         'In progress'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dashboard Features */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Dashboard Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardFeatures.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{feature.icon}</span>
                    <div>
                      <h3 className="font-semibold">{feature.name}</h3>
                      <p className="text-sm text-gray-600">Assigned to {feature.agent}</p>
                    </div>
                  </div>
                  {getStatusIcon(feature.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Week 1-2</div>
              <div className="flex-1">
                <div className="font-medium">Foundation</div>
                <div className="text-sm text-gray-600">Security Layer, Observability Stack</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Week 3-4</div>
              <div className="flex-1">
                <div className="font-medium">Infrastructure</div>
                <div className="text-sm text-gray-600">Queue System, Self-Healing</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Week 5-6</div>
              <div className="flex-1">
                <div className="font-medium">Intelligence</div>
                <div className="text-sm text-gray-600">Orchestration, Collaboration</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Week 7-8</div>
              <div className="flex-1">
                <div className="font-medium">Dashboard</div>
                <div className="text-sm text-gray-600">UI Features, Integration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
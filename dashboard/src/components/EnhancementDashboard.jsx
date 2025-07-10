'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Zap,
  RefreshCw,
  Shield,
  Eye,
  MessageSquare,
  Brain,
  Wrench,
  GitBranch,
  Smartphone,
  Volume2,
  GamepadIcon
} from 'lucide-react';
import MobilePWA from './MobilePWA';
import VoiceControl from './VoiceControl';
import GamificationPanel from './GamificationPanel';

export default function EnhancementDashboard({ 
  screenSize, 
  orientation, 
  getGridClasses, 
  getSpacingClasses, 
  isMobile, 
  isTablet, 
  isDesktop 
}) {
  const [enhancements, setEnhancements] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [selectedEnhancement, setSelectedEnhancement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const enhancementDetails = {
    'security-layer': {
      name: 'Enterprise Security Layer',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'HashiCorp Vault, OAuth2/OIDC, RBAC, E2E Encryption',
      components: [
        { name: 'Vault Client', file: 'cli/vault-client.js', agent: 'GPT-4' },
        { name: 'Auth Service', file: 'cli/auth-service.js', agent: 'GPT-4' },
        { name: 'RBAC Manager', file: 'cli/rbac-manager.js', agent: 'Claude' },
        { name: 'Encryption Service', file: 'cli/encryption-service.js', agent: 'Claude' }
      ]
    },
    'observability-stack': {
      name: 'Observability Stack',
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'OpenTelemetry, Prometheus, Grafana, Distributed Tracing',
      components: [
        { name: 'Telemetry System', file: 'cli/telemetry.js', agent: 'Claude' },
        { name: 'Metrics Collector', file: 'cli/metrics-collector.js', agent: 'Mistral' },
        { name: 'Monitoring Stack', file: 'deployment/observability/docker-compose-monitoring.yaml', agent: 'Mistral' }
      ]
    },
    'distributed-queue-system': {
      name: 'Distributed Queue System',
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Kafka, RabbitMQ, Queue Abstraction Layer',
      components: [
        { name: 'Queue Manager', file: 'cli/queue-manager.js', agent: 'GPT-4' },
        { name: 'Kafka Adapter', file: 'cli/kafka-adapter.js', agent: 'GPT-4' },
        { name: 'RabbitMQ Adapter', file: 'cli/rabbitmq-adapter.js', agent: 'DeepSeek' }
      ]
    },
    'intelligent-orchestration': {
      name: 'Intelligent Orchestration',
      icon: Brain,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'ML Agent Selection, DAG Execution, Cost Optimization',
      components: [
        { name: 'Orchestration Engine', file: 'cli/orchestration-engine.js', agent: 'Claude' },
        { name: 'ML Agent Selector', file: 'cli/ml-agent-selector.js', agent: 'Claude' }
      ]
    },
    'collaboration-framework': {
      name: 'Collaboration Framework',
      icon: GitBranch,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Consensus Protocol, Knowledge Graph, Task Negotiation',
      components: [
        { name: 'Consensus Protocol', file: 'cli/consensus-protocol.js', agent: 'Claude' },
        { name: 'Knowledge Graph', file: 'cli/knowledge-graph.js', agent: 'Claude' },
        { name: 'Task Negotiation', file: 'cli/task-negotiation.js', agent: 'Gemini' }
      ]
    },
    'self-healing-infrastructure': {
      name: 'Self-Healing Infrastructure',
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'K8s Operator, Health Checks, Auto-scaling, Circuit Breakers',
      components: [
        { name: 'K8s Operator', file: 'deployment/k8s/operator/agent-operator.yaml', agent: 'DeepSeek' },
        { name: 'Health Checker', file: 'cli/health-checker.js', agent: 'DeepSeek' },
        { name: 'Circuit Breaker', file: 'cli/circuit-breaker.js', agent: 'Mistral' }
      ]
    },
    'mobile-pwa': {
      name: 'Mobile PWA Features',
      icon: Smartphone,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Progressive Web App with offline support and mobile controls',
      components: [
        { name: 'Service Worker', file: 'dashboard/public/sw.js', agent: 'Gemini' },
        { name: 'PWA Manifest', file: 'dashboard/public/manifest.json', agent: 'Gemini' },
        { name: 'PWA Hooks', file: 'dashboard/src/hooks/usePWA.js', agent: 'Gemini' },
        { name: 'Gesture Controls', file: 'dashboard/src/hooks/useGestures.js', agent: 'Gemini' },
        { name: 'Mobile UI', file: 'dashboard/src/components/MobilePWA.jsx', agent: 'Gemini' }
      ]
    },
    'voice-sound-system': {
      name: 'Voice & Sound System',
      icon: Volume2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Voice commands, text-to-speech, and audio feedback system',
      components: [
        { name: 'Voice Commands', file: 'dashboard/src/hooks/useVoiceCommands.js', agent: 'Mistral' },
        { name: 'Text to Speech', file: 'dashboard/src/hooks/useTextToSpeech.js', agent: 'Mistral' },
        { name: 'Audio Feedback', file: 'dashboard/src/hooks/useAudioFeedback.js', agent: 'Mistral' },
        { name: 'Voice Control UI', file: 'dashboard/src/components/VoiceControl.jsx', agent: 'Mistral' }
      ]
    },
    'enhanced-gamification': {
      name: 'Enhanced Gamification',
      icon: GamepadIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Achievements, badges, quests, and leaderboards system',
      components: [
        { name: 'Gamification Hook', file: 'dashboard/src/hooks/useGamification.js', agent: 'Claude' },
        { name: 'Gamification Panel', file: 'dashboard/src/components/GamificationPanel.jsx', agent: 'Claude' }
      ]
    }
  };

  useEffect(() => {
    fetchEnhancementStatus();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchEnhancementStatus, 15000);
    }
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchEnhancementStatus = async () => {
    try {
      // Fetch enhancement progress
      const progressRes = await fetch('/api/enhancement-progress');
      const progressData = await progressRes.json();
      
      // Fetch queue status
      const queueRes = await fetch('/api/queue-stats');
      const queueData = await queueRes.json();
      
      // Combine data for each enhancement
      const enhancementList = Object.entries(enhancementDetails).map(([id, details]) => {
        const progress = progressData.progress?.[id] || 0;
        const components = details.components.map(comp => {
          // Check if component is in queue or processing
          const inQueue = queueData.queues?.some(q => 
            q.pending?.some(task => task.file === comp.file)
          );
          const processing = queueData.queues?.some(q => 
            q.processing?.some(task => task.file === comp.file)
          );
          
          return {
            ...comp,
            status: processing ? 'processing' : inQueue ? 'queued' : 'pending'
          };
        });
        
        return {
          id,
          ...details,
          progress,
          components,
          completedCount: components.filter(c => c.status === 'completed').length,
          processingCount: components.filter(c => c.status === 'processing').length
        };
      });
      
      setEnhancements(enhancementList);
      
      // Fetch recent logs
      const logsRes = await fetch('/api/agent-logs?limit=20');
      const logsData = await logsRes.json();
      if (logsData.success) {
        setTaskLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('Error fetching enhancement status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'queued':
        return <Activity className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold flex items-center gap-2`}>
            <Zap className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-yellow-500`} />
            {isMobile ? 'Enhancements' : 'System Enhancements'}
          </h1>
          <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
            {isMobile ? 'Infrastructure improvements' : 'Enterprise-grade infrastructure improvements'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'justify-center' : ''}`}>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size={isMobile ? "sm" : "sm"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 ${isMobile ? '' : 'mr-2'} ${autoRefresh ? 'animate-spin' : ''}`} />
            {!isMobile && 'Auto Refresh'}
          </Button>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={fetchEnhancementStatus}
          >
            {isMobile ? '↻' : 'Refresh Now'}
          </Button>
        </div>
      </div>

      {/* Mobile PWA Section */}
      <div className={`bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg ${isMobile ? 'p-4' : 'p-6'} mb-6`}>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center'} gap-3 mb-4`}>
          <div className={`${isMobile ? 'self-center' : ''} p-3 bg-indigo-100 rounded-lg`}>
            <Smartphone className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-indigo-600`} />
          </div>
          <div className={isMobile ? 'text-center' : ''}>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-indigo-900`}>
              {isMobile ? 'PWA Features' : 'Mobile PWA Features'}
            </h2>
            <p className={`text-indigo-700 ${isMobile ? 'text-sm' : ''}`}>
              {isMobile ? 'Offline support & mobile controls' : 'Progressive Web App with offline support and mobile controls'}
            </p>
          </div>
        </div>
        <MobilePWA screenSize={screenSize} isMobile={isMobile} isTablet={isTablet} />
      </div>

      {/* Voice & Sound System Section */}
      <div className={`bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg ${isMobile ? 'p-4' : 'p-6'} mb-6`}>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center'} gap-3 mb-4`}>
          <div className={`${isMobile ? 'self-center' : ''} p-3 bg-purple-100 rounded-lg`}>
            <Volume2 className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-purple-600`} />
          </div>
          <div className={isMobile ? 'text-center' : ''}>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-purple-900`}>
              {isMobile ? 'Voice & Sound' : 'Voice & Sound System'}
            </h2>
            <p className={`text-purple-700 ${isMobile ? 'text-sm' : ''}`}>
              {isMobile ? 'Voice commands & audio feedback' : 'Voice commands, text-to-speech, and audio feedback'}
            </p>
          </div>
        </div>
        <VoiceControl screenSize={screenSize} isMobile={isMobile} isTablet={isTablet} />
      </div>

      {/* Enhanced Gamification Section */}
      <div className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg ${isMobile ? 'p-4' : 'p-6'} mb-6`}>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center'} gap-3 mb-4`}>
          <div className={`${isMobile ? 'self-center' : ''} p-3 bg-green-100 rounded-lg`}>
            <GamepadIcon className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
          </div>
          <div className={isMobile ? 'text-center' : ''}>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-green-900`}>
              {isMobile ? 'Gamification' : 'Enhanced Gamification'}
            </h2>
            <p className={`text-green-700 ${isMobile ? 'text-sm' : ''}`}>
              {isMobile ? 'Achievements & leaderboards' : 'Achievements, badges, quests, and leaderboards system'}
            </p>
          </div>
        </div>
        <GamificationPanel screenSize={screenSize} isMobile={isMobile} isTablet={isTablet} />
      </div>

      {/* Enhancement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {enhancements.map((enhancement) => {
          const Icon = enhancement.icon;
          return (
            <Card 
              key={enhancement.id}
              className="cursor-pointer hover:shadow-lg transition-all min-w-0"
              onClick={() => setSelectedEnhancement(enhancement)}
            >
              <CardHeader className="pb-3 p-4 sm:p-6">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${enhancement.bgColor}`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${enhancement.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-xs sm:text-sm break-words">{enhancement.name}</h3>
                      <p className="text-xs text-gray-600 mt-1 break-words">
                        {enhancement.completedCount}/{enhancement.components.length} completed
                      </p>
                    </div>
                  </div>
                  {enhancement.processingCount > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span className="text-xs">{enhancement.processingCount}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={enhancement.progress} className="h-2 mb-3" />
                <p className="text-xs text-gray-600 line-clamp-2">
                  {enhancement.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Enhancement Details */}
      {selectedEnhancement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <selectedEnhancement.icon className={`w-6 h-6 ${selectedEnhancement.color}`} />
                {selectedEnhancement.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEnhancement(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">{selectedEnhancement.description}</p>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Components</h4>
                {selectedEnhancement.components.map((component, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(component.status)}
                      <div>
                        <div className="font-medium text-sm">{component.name}</div>
                        <div className="text-xs text-gray-600">{component.file}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Assigned to {component.agent}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {taskLogs.length > 0 ? (
                taskLogs.map((log, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{log.agent}</span>
                        <span className="text-gray-600"> • {log.action}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.file} • {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No recent activity
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
// Optional TensorFlow import with fallback
let tf = null;
try {
  tf = require('@tensorflow/tfjs');
} catch (e) {
  console.warn('TensorFlow.js not available, using mock predictions');
  tf = {
    sequential: () => ({ predict: () => ({ dataSync: () => [Math.random()] }) }),
    layers: { dense: () => ({}) },
    tensor2d: () => ({ shape: [1, 1] })
  };
}

// Mock hooks for missing dependencies
const usePredictionService = () => ({ predictions: [], isLoading: false });
const useAnomalyDetection = () => ({ anomalies: [], threshold: 0.5 });

const CHART_COLORS = {
  predicted: '#8B5CF6',
  actual: '#10B981',
  anomaly: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6'
};

export default function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [resourceForecasts, setResourceForecasts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [modelAccuracy, setModelAccuracy] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  
  const modelRef = useRef(null);
  
  const {
    trainPredictionModel,
    predictTaskCompletion,
    updateModelWithFeedback,
    getModelMetrics
  } = usePredictionService();
  
  const {
    detectAnomalies,
    analyzePattern,
    getRootCause,
    getAnomalyScore
  } = useAnomalyDetection();

  useEffect(() => {
    initializeModels();
    startRealtimeAnalysis();
  }, []);

  const initializeModels = async () => {
    setIsTraining(true);
    try {
      // Initialize TensorFlow.js model for task completion prediction
      const model = await createPredictionModel();
      modelRef.current = model;
      
      // Train with historical data
      await trainModel();
      
      setIsTraining(false);
    } catch (error) {
      console.error('Model initialization error:', error);
      setIsTraining(false);
    }
  };

  const createPredictionModel = async () => {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [10], // Features: agent_type, task_complexity, queue_depth, etc.
          units: 64, 
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ 
          units: 32, 
          activation: 'relu' 
        }),
        tf.layers.dense({ 
          units: 16, 
          activation: 'relu' 
        }),
        tf.layers.dense({ 
          units: 1, 
          activation: 'linear' // Regression for time prediction
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  };

  const trainModel = async () => {
    // Simulate training with historical data
    const historicalData = await fetchHistoricalData();
    if (!historicalData || historicalData.length === 0) return;

    const features = tf.tensor2d(
      historicalData.map(d => [
        d.agentType,
        d.taskComplexity,
        d.queueDepth,
        d.cpuUsage,
        d.memoryUsage,
        d.timeOfDay,
        d.dayOfWeek,
        d.previousTaskTime,
        d.agentExperience,
        d.concurrentTasks
      ])
    );

    const labels = tf.tensor2d(
      historicalData.map(d => [d.completionTime])
    );

    const history = await modelRef.current.fit(features, labels, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setModelAccuracy(100 - (logs.val_loss * 100));
        }
      }
    });

    features.dispose();
    labels.dispose();
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch('/api/agent-history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  };

  const startRealtimeAnalysis = () => {
    // Real-time analysis interval
    const analysisInterval = setInterval(async () => {
      await performAnalysis();
    }, 5000); // Every 5 seconds

    // Anomaly detection interval
    const anomalyInterval = setInterval(async () => {
      await detectSystemAnomalies();
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(analysisInterval);
      clearInterval(anomalyInterval);
    };
  };

  const performAnalysis = async () => {
    try {
      // Fetch current system state
      const systemState = await fetchSystemState();
      
      // Predict task completion times
      const taskPredictions = await predictTaskCompletions(systemState);
      setPredictions(taskPredictions);
      
      // Identify performance bottlenecks
      const bottleneckAnalysis = analyzeBottlenecks(systemState);
      setBottlenecks(bottleneckAnalysis);
      
      // Forecast resource usage
      const forecasts = await forecastResources(systemState);
      setResourceForecasts(forecasts);
      
      // Generate intelligent alerts
      const newAlerts = generateAlerts(taskPredictions, bottleneckAnalysis, forecasts);
      setAlerts(newAlerts);
      
      // Update performance metrics
      updatePerformanceMetrics(systemState);
    } catch (error) {
      console.error('Analysis error:', error);
    }
  };

  const fetchSystemState = async () => {
    const response = await fetch('/api/system-state');
    return await response.json();
  };

  const predictTaskCompletions = async (systemState) => {
    if (!modelRef.current || !systemState.activeTasks) return {};

    const predictions = {};
    
    for (const task of systemState.activeTasks) {
      const features = tf.tensor2d([[
        task.agentType,
        task.complexity,
        systemState.queueDepth,
        systemState.cpuUsage,
        systemState.memoryUsage,
        new Date().getHours(),
        new Date().getDay(),
        task.previousAvgTime || 30,
        task.agentExperience || 1,
        systemState.concurrentTasks
      ]]);

      const prediction = await modelRef.current.predict(features);
      const predictedTime = await prediction.data();
      
      predictions[task.id] = {
        taskId: task.id,
        predictedTime: predictedTime[0],
        confidence: calculateConfidence(task, systemState),
        factors: identifyInfluencingFactors(task, systemState)
      };

      features.dispose();
      prediction.dispose();
    }

    return predictions;
  };

  const calculateConfidence = (task, systemState) => {
    // Calculate prediction confidence based on various factors
    let confidence = 85; // Base confidence
    
    // Adjust based on historical accuracy for similar tasks
    if (task.historicalAccuracy) {
      confidence = confidence * 0.7 + task.historicalAccuracy * 0.3;
    }
    
    // Reduce confidence for high system load
    if (systemState.cpuUsage > 80) confidence -= 10;
    if (systemState.memoryUsage > 80) confidence -= 10;
    
    // Reduce confidence for complex tasks
    if (task.complexity > 8) confidence -= 15;
    
    return Math.max(0, Math.min(100, confidence));
  };

  const identifyInfluencingFactors = (task, systemState) => {
    const factors = [];
    
    if (systemState.cpuUsage > 70) {
      factors.push({ factor: 'High CPU Usage', impact: 'negative', value: systemState.cpuUsage });
    }
    
    if (systemState.queueDepth > 50) {
      factors.push({ factor: 'Deep Queue', impact: 'negative', value: systemState.queueDepth });
    }
    
    if (task.complexity > 7) {
      factors.push({ factor: 'High Complexity', impact: 'negative', value: task.complexity });
    }
    
    if (task.agentExperience > 5) {
      factors.push({ factor: 'Experienced Agent', impact: 'positive', value: task.agentExperience });
    }
    
    return factors;
  };

  const analyzeBottlenecks = (systemState) => {
    const bottlenecks = [];
    
    // Queue bottleneck detection
    if (systemState.queueDepth > 100) {
      bottlenecks.push({
        type: 'queue',
        severity: 'high',
        description: 'Queue depth exceeding threshold',
        recommendation: 'Scale up agent pool or optimize task distribution',
        metrics: { queueDepth: systemState.queueDepth }
      });
    }
    
    // Resource bottleneck detection
    if (systemState.cpuUsage > 85) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: 'CPU usage critical',
        recommendation: 'Optimize compute-intensive operations or add CPU resources',
        metrics: { cpuUsage: systemState.cpuUsage }
      });
    }
    
    // Agent bottleneck detection
    const agentUtilization = systemState.agents?.map(a => a.utilization) || [];
    const avgUtilization = agentUtilization.reduce((a, b) => a + b, 0) / agentUtilization.length;
    
    if (avgUtilization > 90) {
      bottlenecks.push({
        type: 'agent',
        severity: 'medium',
        description: 'Agent pool near capacity',
        recommendation: 'Spawn additional agents or redistribute workload',
        metrics: { avgUtilization }
      });
    }
    
    return bottlenecks;
  };

  const forecastResources = async (systemState) => {
    // Simple time series forecasting
    const history = systemState.resourceHistory || [];
    const forecasts = [];
    
    // CPU forecast
    const cpuTrend = calculateTrend(history.map(h => h.cpu));
    forecasts.push({
      resource: 'CPU',
      current: systemState.cpuUsage,
      forecast1h: Math.min(100, systemState.cpuUsage + cpuTrend * 12),
      forecast6h: Math.min(100, systemState.cpuUsage + cpuTrend * 72),
      trend: cpuTrend > 0 ? 'increasing' : 'decreasing'
    });
    
    // Memory forecast
    const memTrend = calculateTrend(history.map(h => h.memory));
    forecasts.push({
      resource: 'Memory',
      current: systemState.memoryUsage,
      forecast1h: Math.min(100, systemState.memoryUsage + memTrend * 12),
      forecast6h: Math.min(100, systemState.memoryUsage + memTrend * 72),
      trend: memTrend > 0 ? 'increasing' : 'decreasing'
    });
    
    return forecasts;
  };

  const calculateTrend = (values) => {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  };

  const generateAlerts = (predictions, bottlenecks, forecasts) => {
    const alerts = [];
    
    // Task completion alerts
    Object.values(predictions).forEach(pred => {
      if (pred.predictedTime > 300 && pred.confidence > 70) {
        alerts.push({
          type: 'warning',
          title: 'Long Task Duration Expected',
          message: `Task ${pred.taskId} predicted to take ${Math.round(pred.predictedTime)}s`,
          timestamp: new Date().toISOString(),
          actionable: true,
          actions: ['Optimize task', 'Assign to faster agent', 'Split task']
        });
      }
    });
    
    // Bottleneck alerts
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'high') {
        alerts.push({
          type: 'critical',
          title: `${bottleneck.type.toUpperCase()} Bottleneck Detected`,
          message: bottleneck.description,
          recommendation: bottleneck.recommendation,
          timestamp: new Date().toISOString(),
          actionable: true
        });
      }
    });
    
    // Resource forecast alerts
    forecasts.forEach(forecast => {
      if (forecast.forecast1h > 90) {
        alerts.push({
          type: 'warning',
          title: `${forecast.resource} Usage Forecast Alert`,
          message: `${forecast.resource} expected to reach ${Math.round(forecast.forecast1h)}% in 1 hour`,
          timestamp: new Date().toISOString(),
          actionable: true,
          actions: ['Scale resources', 'Optimize workload', 'Enable auto-scaling']
        });
      }
    });
    
    return alerts;
  };

  const detectSystemAnomalies = async () => {
    try {
      const systemMetrics = await fetchSystemState();
      const anomalies = await detectAnomalies(systemMetrics);
      
      if (anomalies.length > 0) {
        const analyzedAnomalies = await Promise.all(
          anomalies.map(async (anomaly) => {
            const pattern = await analyzePattern(anomaly);
            const rootCause = await getRootCause(anomaly);
            
            return {
              ...anomaly,
              pattern,
              rootCause,
              score: await getAnomalyScore(anomaly),
              timestamp: new Date().toISOString()
            };
          })
        );
        
        setAnomalies(analyzedAnomalies);
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
  };

  const updatePerformanceMetrics = (systemState) => {
    const newMetric = {
      timestamp: new Date().toISOString(),
      avgTaskTime: systemState.avgTaskTime || 0,
      successRate: systemState.successRate || 0,
      throughput: systemState.throughput || 0,
      errorRate: systemState.errorRate || 0,
      queueDepth: systemState.queueDepth || 0
    };
    
    setPerformanceMetrics(prev => [...prev.slice(-59), newMetric]); // Keep last 60 data points
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Model Status</span>
            <Badge variant={isTraining ? "secondary" : "success"}>
              {isTraining ? "Training" : `Accuracy: ${modelAccuracy.toFixed(1)}%`}
            </Badge>
          </CardTitle>
        </CardHeader>
        {isTraining && (
          <CardContent>
            <Progress value={modelAccuracy} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">Training prediction model...</p>
          </CardContent>
        )}
      </Card>

      {/* Intelligent Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Alert key={idx} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-sm mt-1 italic">Recommendation: {alert.recommendation}</p>
                    )}
                  </div>
                  {alert.actionable && (
                    <Badge variant="outline" className="ml-2">Action Required</Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Task Completion Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.values(predictions).slice(0, 5).map(pred => (
              <div key={pred.taskId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Task {pred.taskId}</p>
                  <p className="text-sm text-gray-500">
                    Predicted: {formatTime(pred.predictedTime)} • Confidence: {pred.confidence.toFixed(0)}%
                  </p>
                </div>
                <div className="text-right">
                  <Progress value={pred.confidence} className="w-24" />
                  {pred.factors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {pred.factors[0].factor}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgTaskTime" 
                  stroke={CHART_COLORS.actual} 
                  name="Avg Task Time (s)"
                />
                <Line 
                  type="monotone" 
                  dataKey="throughput" 
                  stroke={CHART_COLORS.predicted} 
                  name="Throughput"
                />
                <Line 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke={CHART_COLORS.anomaly} 
                  name="Error Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Resource Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resourceForecasts.map((forecast, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{forecast.resource}</span>
                    <span className={`text-sm ${forecast.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                      {forecast.trend}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="font-medium">{forecast.current.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">1h Forecast</p>
                      <p className="font-medium">{forecast.forecast1h.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">6h Forecast</p>
                      <p className="font-medium">{forecast.forecast6h.toFixed(1)}%</p>
                    </div>
                  </div>
                  <Progress value={forecast.current} className="mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottlenecks.length === 0 ? (
                <p className="text-sm text-gray-500">No bottlenecks detected</p>
              ) : (
                bottlenecks.map((bottleneck, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    bottleneck.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{bottleneck.type} Bottleneck</p>
                        <p className="text-sm text-gray-600">{bottleneck.description}</p>
                      </div>
                      <Badge variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'}>
                        {bottleneck.severity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{anomaly.type}</p>
                      <p className="text-sm text-gray-600">{anomaly.description}</p>
                      {anomaly.rootCause && (
                        <p className="text-sm text-gray-500 mt-1">
                          Root cause: {anomaly.rootCause}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">Score: {anomaly.score.toFixed(2)}</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
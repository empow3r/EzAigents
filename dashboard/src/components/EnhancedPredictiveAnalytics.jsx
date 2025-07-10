'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Zap,
  Brain,
  Eye,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

export default function EnhancedPredictiveAnalytics({ 
  predictions = {}, 
  trends = {}, 
  anomalies = [],
  realTimeMetrics = {},
  onInsightClick 
}) {
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [timeHorizon, setTimeHorizon] = useState('24h');

  // Generate strategic insights based on data
  const generateInsights = () => {
    const insights = [];
    
    // Revenue predictions
    if (predictions.revenue && predictions.revenue.length > 0) {
      const futureRevenue = predictions.revenue[predictions.revenue.length - 1];
      const currentRevenue = realTimeMetrics.totalRevenue || 2400000;
      const growth = ((futureRevenue - currentRevenue) / currentRevenue) * 100;
      
      insights.push({
        id: 'revenue_prediction',
        type: growth > 10 ? 'opportunity' : growth < -5 ? 'risk' : 'neutral',
        title: 'Revenue Forecast',
        description: `Predicted ${growth > 0 ? 'growth' : 'decline'} of ${Math.abs(growth).toFixed(1)}% over next period`,
        impact: 'high',
        confidence: 87,
        action: growth > 10 ? 'Scale marketing efforts' : growth < -5 ? 'Implement cost optimization' : 'Maintain current strategy',
        value: `$${(futureRevenue / 1000000).toFixed(1)}M`,
        trend: growth
      });
    }

    // Agent efficiency trends
    if (trends.agentEfficiency !== undefined) {
      const efficiency = trends.agentEfficiency;
      insights.push({
        id: 'efficiency_trend',
        type: efficiency > 5 ? 'opportunity' : efficiency < -3 ? 'risk' : 'neutral',
        title: 'Agent Performance Trend',
        description: `Agent efficiency ${efficiency > 0 ? 'improving' : 'declining'} by ${Math.abs(efficiency).toFixed(1)}%`,
        impact: 'medium',
        confidence: 92,
        action: efficiency < -3 ? 'Optimize agent algorithms' : 'Continue current optimization',
        value: `${efficiency > 0 ? '+' : ''}${efficiency.toFixed(1)}%`,
        trend: efficiency
      });
    }

    // Anomaly detection
    if (anomalies.length > 0) {
      insights.push({
        id: 'anomaly_alert',
        type: 'risk',
        title: 'Performance Anomalies Detected',
        description: `${anomalies.length} unusual patterns detected in system metrics`,
        impact: 'high',
        confidence: 95,
        action: 'Investigate anomalies immediately',
        value: anomalies.length,
        trend: 0
      });
    }

    // System health prediction
    if (realTimeMetrics.systemHealth < 95) {
      insights.push({
        id: 'health_warning',
        type: 'risk',
        title: 'System Health Alert',
        description: 'System health below optimal threshold',
        impact: 'medium',
        confidence: 88,
        action: 'Schedule maintenance window',
        value: `${realTimeMetrics.systemHealth}%`,
        trend: -2.3
      });
    }

    // Cost optimization opportunities
    if (trends.costOptimization > 0) {
      insights.push({
        id: 'cost_optimization',
        type: 'opportunity',
        title: 'Cost Optimization Opportunity',
        description: 'AI identifies potential cost savings in agent deployment',
        impact: 'high',
        confidence: 84,
        action: 'Implement suggested optimizations',
        value: `$${(realTimeMetrics.totalRevenue * 0.15 / 1000000).toFixed(1)}M savings`,
        trend: trends.costOptimization
      });
    }

    return insights;
  };

  const insights = generateInsights();

  const getInsightColor = (type) => {
    switch (type) {
      case 'opportunity': return 'text-green-400';
      case 'risk': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'opportunity': return TrendingUp;
      case 'risk': return AlertTriangle;
      default: return Activity;
    }
  };

  const InsightCard = ({ insight }) => {
    const Icon = getInsightIcon(insight.type);
    const colorClass = getInsightColor(insight.type);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className={`bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 cursor-pointer transition-all hover:border-cyan-500/30`}
        onClick={() => {
          setSelectedInsight(insight);
          onInsightClick && onInsightClick(insight);
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              insight.type === 'opportunity' ? 'bg-green-500/20' :
              insight.type === 'risk' ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}>
              <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <div>
              <h3 className="text-white font-semibold">{insight.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  insight.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                  insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {insight.impact.toUpperCase()} IMPACT
                </span>
                <span className="text-xs text-gray-400">
                  {insight.confidence}% confidence
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${colorClass}`}>
              {insight.value}
            </div>
            {insight.trend !== 0 && (
              <div className={`text-sm flex items-center gap-1 ${
                insight.trend > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {insight.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(insight.trend).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-4">{insight.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-cyan-400 text-sm font-medium">{insight.action}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-full transition-all"
          >
            Execute
          </motion.button>
        </div>
      </motion.div>
    );
  };

  const PredictionChart = ({ title, data, color, unit = '' }) => (
    <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        {title}
      </h3>
      <div className="relative h-24">
        <svg className="w-full h-full" viewBox="0 0 300 80">
          {data && data.map((value, index) => {
            const x = (index / (data.length - 1)) * 280 + 10;
            const y = 70 - ((value - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 60;
            const nextX = ((index + 1) / (data.length - 1)) * 280 + 10;
            const nextY = index < data.length - 1 ? 
              70 - ((data[index + 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 60 : y;
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                  className="drop-shadow-lg"
                />
                {index < data.length - 1 && (
                  <line
                    x1={x}
                    y1={y}
                    x2={nextX}
                    y2={nextY}
                    stroke={color}
                    strokeWidth="2"
                    className="drop-shadow-lg"
                  />
                )}
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 text-xs text-gray-400">
          Current
        </div>
        <div className="absolute bottom-0 right-0 text-xs text-gray-400">
          Predicted
        </div>
      </div>
      {data && (
        <div className="mt-2 text-center">
          <span className="text-lg font-bold" style={{ color }}>
            {data[data.length - 1]?.toFixed(1)}{unit}
          </span>
          <span className="text-xs text-gray-400 ml-2">in next period</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with time horizon selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          Predictive Intelligence
        </h2>
        <div className="flex bg-gray-800 rounded-lg p-1">
          {['1h', '24h', '7d', '30d'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeHorizon(period)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                timeHorizon === period
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Prediction Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PredictionChart
          title="Revenue Forecast"
          data={predictions.revenue}
          color="#10B981"
          unit="M"
        />
        <PredictionChart
          title="Agent Efficiency"
          data={predictions.agentEfficiency}
          color="#3B82F6"
          unit="%"
        />
        <PredictionChart
          title="System Health"
          data={predictions.systemHealth}
          color="#8B5CF6"
          unit="%"
        />
      </div>

      {/* Advanced Analytics Panel */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-purple-300 mb-6 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          AI-Powered Strategic Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Immediate Actions</h4>
            {insights.filter(i => i.impact === 'high').map((insight, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-200">{insight.action}</span>
                <span className="ml-auto text-xs bg-cyan-600 text-white px-2 py-1 rounded-full">
                  {insight.confidence}%
                </span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-green-400 text-lg font-bold">+23.7%</div>
                <div className="text-xs text-gray-400">ROI Growth</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-blue-400 text-lg font-bold">94.2%</div>
                <div className="text-xs text-gray-400">Accuracy</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-purple-400 text-lg font-bold">97.8%</div>
                <div className="text-xs text-gray-400">Success Rate</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-yellow-400 text-lg font-bold">2.3s</div>
                <div className="text-xs text-gray-400">Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Insight Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedInsight(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-gray-900/95 border border-cyan-500/30 rounded-2xl p-8 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{selectedInsight.title}</h3>
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300">{selectedInsight.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Confidence Level</div>
                    <div className="text-white text-xl font-bold">{selectedInsight.confidence}%</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Impact</div>
                    <div className="text-white text-xl font-bold capitalize">{selectedInsight.impact}</div>
                  </div>
                </div>
                
                <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-4">
                  <div className="text-cyan-400 font-semibold mb-2">Recommended Action</div>
                  <div className="text-white">{selectedInsight.action}</div>
                </div>
                
                <div className="flex gap-3">
                  <button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all">
                    Execute Action
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all">
                    Schedule Later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
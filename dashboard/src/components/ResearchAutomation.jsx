import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
const { 
  Brain, Zap, Settings, Play, Pause, RotateCcw, 
  CheckCircle, AlertTriangle, Clock, TrendingUp,
  Database, Globe, FileText, BarChart3, Users,
  ArrowRight, ChevronDown, Plus, X, Save
} = LucideIcons;

const ResearchAutomation = ({ projectId, onAutomationUpdate }) => {
  const [automationRules, setAutomationRules] = useState([]);
  const [activeAutomations, setActiveAutomations] = useState([]);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  // Research automation triggers
  const triggers = [
    {
      id: 'schedule',
      name: 'Schedule',
      description: 'Run at specific times or intervals',
      icon: Clock,
      options: ['Daily', 'Weekly', 'Monthly', 'Custom Interval']
    },
    {
      id: 'data_threshold',
      name: 'Data Threshold',
      description: 'Trigger when data metrics reach certain values',
      icon: TrendingUp,
      options: ['New Sources Available', 'Insight Confidence > 90%', 'Data Volume Increase']
    },
    {
      id: 'external_event',
      name: 'External Event',
      description: 'React to external data changes or notifications',
      icon: Globe,
      options: ['Market Event', 'Competitor Update', 'Industry News']
    },
    {
      id: 'project_milestone',
      name: 'Project Milestone',
      description: 'Trigger on project progress or completion',
      icon: CheckCircle,
      options: ['Phase Complete', 'Target Reached', 'Deadline Approaching']
    }
  ];

  // Research automation actions
  const actions = [
    {
      id: 'data_collection',
      name: 'Data Collection',
      description: 'Automatically gather data from specified sources',
      icon: Database,
      agents: ['WebScraper', 'Claude', 'Gemini'],
      options: ['Web Scraping', 'API Data Pull', 'Document Analysis']
    },
    {
      id: 'analysis',
      name: 'Analysis & Insights',
      description: 'Generate insights and analyze collected data',
      icon: Brain,
      agents: ['Claude', 'DeepSeek', 'GPT-4'],
      options: ['Trend Analysis', 'Competitive Analysis', 'Sentiment Analysis']
    },
    {
      id: 'report_generation',
      name: 'Report Generation',
      description: 'Create automated reports and summaries',
      icon: FileText,
      agents: ['Claude', 'GPT-4'],
      options: ['Executive Summary', 'Detailed Report', 'Data Visualization']
    },
    {
      id: 'notification',
      name: 'Notification',
      description: 'Send alerts and updates to team members',
      icon: AlertTriangle,
      agents: ['System'],
      options: ['Email Alert', 'Dashboard Notification', 'Slack Message']
    }
  ];

  useEffect(() => {
    // Load existing automation rules
    setAutomationRules([
      {
        id: 1,
        name: "Daily Market Monitor",
        trigger: "schedule",
        action: "data_collection",
        status: "active",
        lastRun: "2 hours ago",
        nextRun: "22 hours",
        success_rate: 98,
        description: "Collect daily market data and competitor updates"
      },
      {
        id: 2,
        name: "Insight Alert System",
        trigger: "data_threshold",
        action: "notification",
        status: "active",
        lastRun: "30 minutes ago",
        nextRun: "On threshold",
        success_rate: 100,
        description: "Alert when high-confidence insights are discovered"
      },
      {
        id: 3,
        name: "Weekly Analysis Report",
        trigger: "schedule",
        action: "report_generation",
        status: "paused",
        lastRun: "3 days ago",
        nextRun: "4 days",
        success_rate: 95,
        description: "Generate comprehensive weekly research summary"
      }
    ]);

    setActiveAutomations([
      {
        id: 1,
        name: "Market Data Collection",
        progress: 75,
        status: "running",
        agent: "WebScraper",
        started: "10 minutes ago",
        estimated_completion: "5 minutes"
      },
      {
        id: 2,
        name: "Competitor Analysis",
        progress: 45,
        status: "running",
        agent: "Claude",
        started: "25 minutes ago",
        estimated_completion: "15 minutes"
      }
    ]);
  }, []);

  const AutomationRuleCard = ({ rule }) => (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{rule.name}</h3>
          <p className="text-gray-600 text-sm">{rule.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            rule.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {rule.status}
          </span>
          
          <button className="p-1 hover:bg-gray-100 rounded">
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{rule.success_rate}%</div>
          <div className="text-xs text-gray-600">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{rule.lastRun}</div>
          <div className="text-xs text-gray-600">Last Run</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{rule.nextRun}</div>
          <div className="text-xs text-gray-600">Next Run</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="capitalize">{rule.trigger}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="capitalize">{rule.action}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {rule.status === 'active' ? (
            <button className="p-2 hover:bg-gray-100 rounded" title="Pause">
              <Pause className="w-4 h-4 text-gray-600" />
            </button>
          ) : (
            <button className="p-2 hover:bg-gray-100 rounded" title="Start">
              <Play className="w-4 h-4 text-green-600" />
            </button>
          )}
          
          <button className="p-2 hover:bg-gray-100 rounded" title="Run Now">
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const ActiveAutomationCard = ({ automation }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{automation.name}</h4>
          <p className="text-sm text-gray-600">Agent: {automation.agent}</p>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-blue-600">{automation.progress}%</div>
          <div className="text-xs text-gray-500">{automation.estimated_completion} remaining</div>
        </div>
      </div>

      <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${automation.progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Started {automation.started}</span>
        <span className="flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
          Running
        </span>
      </div>
    </motion.div>
  );

  const CreateRuleModal = () => (
    <AnimatePresence>
      {showCreateRule && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCreateRule(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Automation Rule</h2>
              <button
                onClick={() => setShowCreateRule(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Triggers */}
              <div>
                <h3 className="text-lg font-medium mb-4">Select Trigger</h3>
                <div className="space-y-3">
                  {triggers.map(trigger => {
                    const Icon = trigger.icon;
                    return (
                      <motion.button
                        key={trigger.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTrigger(trigger.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          selectedTrigger === trigger.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            selectedTrigger === trigger.id ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              selectedTrigger === trigger.id ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{trigger.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {trigger.options.slice(0, 2).map((option, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-lg font-medium mb-4">Select Action</h3>
                <div className="space-y-3">
                  {actions.map(action => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAction(action.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          selectedAction === action.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            selectedAction === action.id ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              selectedAction === action.id ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{action.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-gray-500">Agents:</span>
                              {action.agents.slice(0, 2).map((agent, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {agent}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Configuration */}
            {selectedTrigger && selectedAction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-gray-50 rounded-lg"
              >
                <h3 className="text-lg font-medium mb-4">Configure Rule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter automation rule name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe what this automation rule does..."
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateRule(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Create Rule</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            <span>Research Automation</span>
          </h2>
          <p className="text-gray-600 mt-1">Automate research tasks and data collection workflows</p>
        </div>
        
        <button
          onClick={() => setShowCreateRule(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Active Automations */}
      {activeAutomations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse" />
            Currently Running ({activeAutomations.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAutomations.map(automation => (
              <ActiveAutomationCard key={automation.id} automation={automation} />
            ))}
          </div>
        </div>
      )}

      {/* Automation Rules */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Automation Rules ({automationRules.length})
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automationRules.map(rule => (
            <AutomationRuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      </div>

      <CreateRuleModal />
    </div>
  );
};

export default ResearchAutomation;
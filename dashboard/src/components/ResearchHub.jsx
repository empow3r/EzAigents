import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
const { 
  Search, Plus, Filter, TrendingUp, Brain, Database, FileText, 
  Globe, Users, Calendar, Clock, CheckCircle, AlertCircle, 
  BarChart3, PieChart, LineChart, Download, Share2, Star,
  Zap, Target, Eye, BookOpen, Lightbulb, Activity,
  ArrowRight, Settings, Play, Pause, RefreshCw, X,
  ChevronDown, ChevronRight, ExternalLink, Copy
} = LucideIcons;

const ResearchHub = () => {
  const [activeProject, setActiveProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, timeline
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [researchProjects, setResearchProjects] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data - replace with real API calls
  useEffect(() => {
    // Simulate API call
    setResearchProjects([
      {
        id: 1,
        title: "AI Market Trends Analysis",
        description: "Comprehensive analysis of emerging AI technologies and market opportunities",
        status: "active",
        progress: 75,
        category: "market-research",
        priority: "high",
        deadline: "2025-08-15",
        team: ["Claude", "GPT-4", "Gemini"],
        insights: 47,
        sources: 156,
        lastUpdated: "2 hours ago",
        tags: ["AI", "Market Analysis", "Technology Trends"],
        color: "bg-blue-500"
      },
      {
        id: 2,
        title: "Competitor Analysis: SaaS Platforms",
        description: "Deep dive into competing SaaS platforms and their market positioning",
        status: "completed",
        progress: 100,
        category: "competitive-analysis",
        priority: "medium",
        deadline: "2025-07-30",
        team: ["DeepSeek", "Claude"],
        insights: 32,
        sources: 89,
        lastUpdated: "1 day ago",
        tags: ["SaaS", "Competition", "Market Share"],
        color: "bg-green-500"
      },
      {
        id: 3,
        title: "User Behavior Patterns Study",
        description: "Analysis of user interaction patterns and engagement metrics",
        status: "pending",
        progress: 0,
        category: "user-research",
        priority: "low",
        deadline: "2025-09-01",
        team: ["Gemini", "WebScraper"],
        insights: 0,
        sources: 0,
        lastUpdated: "Never",
        tags: ["UX", "Analytics", "Behavior"],
        color: "bg-purple-500"
      }
    ]);

    setInsights([
      {
        id: 1,
        title: "AI Adoption Rate Increase",
        value: "+127%",
        description: "Year-over-year growth in enterprise AI adoption",
        trend: "up",
        confidence: 94,
        source: "Market Research Project"
      },
      {
        id: 2,
        title: "Customer Acquisition Cost",
        value: "$89",
        description: "Average CAC across SaaS competitors",
        trend: "down",
        confidence: 87,
        source: "Competitor Analysis"
      },
      {
        id: 3,
        title: "User Engagement Score",
        value: "8.4/10",
        description: "Platform engagement rating from user studies",
        trend: "up",
        confidence: 91,
        source: "User Research"
      }
    ]);
  }, []);

  const categories = [
    { id: 'all', label: 'All Research', icon: Globe, count: researchProjects.length },
    { id: 'market-research', label: 'Market Research', icon: TrendingUp, count: 1 },
    { id: 'competitive-analysis', label: 'Competitive Analysis', icon: Target, count: 1 },
    { id: 'user-research', label: 'User Research', icon: Users, count: 1 },
    { id: 'trend-analysis', label: 'Trend Analysis', icon: Activity, count: 0 }
  ];

  const filteredProjects = researchProjects.filter(project => {
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { color: 'bg-blue-100 text-blue-800', icon: Play },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: Pause }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const priorityConfig = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${priorityConfig[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const ProgressBar = ({ progress, className = "" }) => (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <motion.div
        className="bg-blue-600 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );

  const handleCreateProject = async (projectData) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newProject = {
        id: Date.now(),
        ...projectData,
        status: 'pending',
        progress: 0,
        insights: 0,
        sources: 0,
        lastUpdated: 'Just now',
        color: 'bg-indigo-500'
      };
      setResearchProjects([...researchProjects, newProject]);
      setShowCreateModal(false);
      setIsLoading(false);
    }, 2000);
  };

  const ResearchProjectCard = ({ project }) => (
    <motion.div
      layout
      whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
      onClick={() => setActiveProject(project)}
    >
      <div className={`h-2 ${project.color}`} />
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
            <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
          </div>
          <div className="flex space-x-2 ml-4">
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <ProgressBar progress={project.progress} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{project.insights}</div>
            <div className="text-gray-600">Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{project.sources}</div>
            <div className="text-gray-600">Sources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{project.team.length}</div>
            <div className="text-gray-600">Agents</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{project.deadline}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{project.lastUpdated}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {project.tags.map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const CreateProjectModal = () => (
    <AnimatePresence>
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create New Research Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter research project title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the research objectives and scope..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="market-research">Market Research</option>
                    <option value="competitive-analysis">Competitive Analysis</option>
                    <option value="user-research">User Research</option>
                    <option value="trend-analysis">Trend Analysis</option>
                  </select>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Agents</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Claude', 'GPT-4', 'DeepSeek', 'Gemini', 'WebScraper'].map(agent => (
                    <label key={agent} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">{agent}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Brain className="w-8 h-8 text-blue-600" />
                <span>Research Hub</span>
              </h1>
              <p className="text-gray-600 mt-1">Intelligent research automation and insights discovery</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search research projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Research</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            {/* Quick Insights */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                Quick Insights
              </h3>
              
              <div className="space-y-3">
                {insights.map(insight => (
                  <motion.div
                    key={insight.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-blue-600">{insight.value}</span>
                      <div className={`w-3 h-3 rounded-full ${insight.trend === 'up' ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
                    <p className="text-gray-600 text-xs mt-1">{insight.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">{insight.source}</span>
                      <span className="text-xs font-medium text-blue-600">{insight.confidence}% confidence</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCategory === category.id ? 'bg-blue-200' : 'bg-gray-200'
                      }`}>
                        {category.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-3xl font-bold text-gray-900">{researchProjects.filter(p => p.status === 'active').length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Insights</p>
                  <p className="text-3xl font-bold text-gray-900">{researchProjects.reduce((acc, p) => acc + p.insights, 0)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Data Sources</p>
                  <p className="text-3xl font-bold text-gray-900">{researchProjects.reduce((acc, p) => acc + p.sources, 0)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(researchProjects.reduce((acc, p) => acc + p.progress, 0) / researchProjects.length)}%
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* View Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Research Projects ({filteredProjects.length})
              </h2>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <div className="w-4 h-4 space-y-1">
                    <div className="h-1 bg-current rounded" />
                    <div className="h-1 bg-current rounded" />
                    <div className="h-1 bg-current rounded" />
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Projects Grid */}
          <motion.div 
            layout
            className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
          >
            <AnimatePresence>
              {filteredProjects.map(project => (
                <ResearchProjectCard key={project.id} project={project} />
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No research projects found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Project
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal />
    </div>
  );
};

export default ResearchHub;
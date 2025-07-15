import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

const WebScraperDashboard = () => {
  const [activeTab, setActiveTab] = useState('scrape');
  const [scrapeForm, setScrapeForm] = useState({
    url: '',
    scraperType: 'generic',
    authRequired: false,
    credentials: {
      username: '',
      password: '',
      usernameSelector: '#username',
      passwordSelector: '#password',
      submitSelector: 'button[type="submit"]'
    },
    extractionRules: '',
    captureScreenshot: false,
    analyzeWithClaude: false,
    analysisPrompt: ''
  });
  
  const [queueStats, setQueueStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch queue stats
  const fetchQueueStats = async () => {
    try {
      const response = await fetch('/api/webscraper/queue-stats');
      const data = await response.json();
      if (data.success) {
        setQueueStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch queue stats:', err);
    }
  };

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/webscraper/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  // Check task status
  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/api/webscraper/task-status?taskId=${taskId}`);
      const data = await response.json();
      if (data.success) {
        setTaskStatus(data.task);
        if (data.task.status === 'completed' || data.task.status === 'failed') {
          setCurrentTask(null);
        }
      }
    } catch (err) {
      console.error('Failed to check task status:', err);
    }
  };

  useEffect(() => {
    fetchQueueStats();
    fetchSessions();
    
    const interval = setInterval(() => {
      fetchQueueStats();
      if (currentTask) {
        checkTaskStatus(currentTask);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentTask]);

  // Handle form submission
  const handleScrape = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        ...scrapeForm,
        extractionRules: scrapeForm.extractionRules ? JSON.parse(scrapeForm.extractionRules) : undefined
      };
      
      const response = await fetch('/api/webscraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentTask(data.taskId);
        setTaskStatus(data.task);
        setScrapeForm(prev => ({ ...prev, url: '', extractionRules: '', analysisPrompt: '' }));
      } else {
        setError(data.error || 'Failed to start scraping task');
      }
    } catch (err) {
      setError('Failed to submit scraping request: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (domain) => {
    try {
      const response = await fetch(`/api/webscraper/sessions?domain=${domain}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Web Scraper Dashboard</h1>
        <p className="text-gray-600">Authenticated web scraping with AI analysis</p>
      </div>

      {/* Queue Stats */}
      {queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.queue.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.queue.processing}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agent Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={queueStats.agent.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                {queueStats.agent.status}
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.historical.completedTasks}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scrape">New Scrape</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="tasks">Task History</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* New Scrape Tab */}
        <TabsContent value="scrape">
          <Card>
            <CardHeader>
              <CardTitle>Start New Scraping Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScrape} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="url">Target URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={scrapeForm.url}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scraperType">Scraper Type</Label>
                    <Select value={scrapeForm.scraperType} onValueChange={(value) => setScrapeForm(prev => ({ ...prev, scraperType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">Generic Web Scraper</SelectItem>
                        <SelectItem value="linkedin">LinkedIn Profile</SelectItem>
                        <SelectItem value="gmail">Gmail Messages</SelectItem>
                        <SelectItem value="ecommerce">E-commerce Product</SelectItem>
                        <SelectItem value="news">News Article</SelectItem>
                        <SelectItem value="social">Social Media Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Quick URL Templates */}
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Start Templates</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setScrapeForm(prev => ({ 
                        ...prev, 
                        url: 'https://news.ycombinator.com',
                        scraperType: 'news',
                        extractionRules: JSON.stringify({"title": ".titleline a", "points": ".score", "comments": ".subtext"}, null, 2)
                      }))}
                    >
                      Hacker News
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setScrapeForm(prev => ({ 
                        ...prev, 
                        url: 'https://www.producthunt.com',
                        scraperType: 'generic',
                        extractionRules: JSON.stringify({"products": ".styles_item__Dk_nz", "names": ".styles_name__MvdYg"}, null, 2)
                      }))}
                    >
                      Product Hunt
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setScrapeForm(prev => ({ 
                        ...prev, 
                        url: 'https://example-store.com/products',
                        scraperType: 'ecommerce',
                        extractionRules: JSON.stringify({"title": ".product-title", "price": ".price", "rating": ".rating"}, null, 2)
                      }))}
                    >
                      E-commerce Demo
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="authRequired"
                    checked={scrapeForm.authRequired}
                    onChange={(e) => setScrapeForm(prev => ({ ...prev, authRequired: e.target.checked }))}
                  />
                  <Label htmlFor="authRequired">Requires Authentication</Label>
                </div>

                {scrapeForm.authRequired && (
                  <div className="border p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Authentication Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="username">Username/Email</Label>
                        <Input
                          id="username"
                          value={scrapeForm.credentials.username}
                          onChange={(e) => setScrapeForm(prev => ({
                            ...prev,
                            credentials: { ...prev.credentials, username: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={scrapeForm.credentials.password}
                          onChange={(e) => setScrapeForm(prev => ({
                            ...prev,
                            credentials: { ...prev.credentials, password: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="extractionRules">Extraction Rules (JSON)</Label>
                  <Textarea
                    id="extractionRules"
                    value={scrapeForm.extractionRules}
                    onChange={(e) => setScrapeForm(prev => ({ ...prev, extractionRules: e.target.value }))}
                    placeholder='{"title": "h1", "content": ".main-content", "links": {"selector": "a", "multiple": true}}'
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="captureScreenshot"
                      checked={scrapeForm.captureScreenshot}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, captureScreenshot: e.target.checked }))}
                    />
                    <Label htmlFor="captureScreenshot">Screenshot</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="analyzeWithClaude"
                      checked={scrapeForm.analyzeWithClaude}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, analyzeWithClaude: e.target.checked }))}
                    />
                    <Label htmlFor="analyzeWithClaude">AI Analysis</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="waitForLoad"
                      checked={scrapeForm.waitForLoad || false}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, waitForLoad: e.target.checked }))}
                    />
                    <Label htmlFor="waitForLoad">Wait for JS</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="followRedirects"
                      checked={scrapeForm.followRedirects || true}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, followRedirects: e.target.checked }))}
                    />
                    <Label htmlFor="followRedirects">Follow Redirects</Label>
                  </div>
                </div>

                {scrapeForm.analyzeWithClaude && (
                  <div>
                    <Label htmlFor="analysisPrompt">Analysis Prompt</Label>
                    <Textarea
                      id="analysisPrompt"
                      value={scrapeForm.analysisPrompt}
                      onChange={(e) => setScrapeForm(prev => ({ ...prev, analysisPrompt: e.target.value }))}
                      placeholder="Analyze this data and extract key insights..."
                      rows={3}
                    />
                  </div>
                )}

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Starting Scrape...' : 'Start Scraping'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Task Status */}
          {taskStatus && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Current Task
                  <Badge className={getStatusBadgeColor(taskStatus.status)}>
                    {taskStatus.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>URL:</strong> {taskStatus.url}</p>
                  <p><strong>Type:</strong> {taskStatus.scraperType}</p>
                  <p><strong>Started:</strong> {new Date(taskStatus.timestamp).toLocaleString()}</p>
                  {taskStatus.result && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium mb-2">Results:</h4>
                      <pre className="text-sm overflow-auto max-h-48">
                        {JSON.stringify(taskStatus.result, null, 2)}
                      </pre>
                    </div>
                  )}
                  {taskStatus.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">
                        {taskStatus.error.message || 'Unknown error occurred'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Saved Authentication Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-gray-500">No saved sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.domain} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{session.domain}</div>
                        <div className="text-sm text-gray-500">
                          Last used: {new Date(session.lastModified).toLocaleString()}
                          {session.expired && <span className="ml-2 text-red-500">(Expired)</span>}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSession(session.domain)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task History Tab */}
        <TabsContent value="tasks">
          <div className="space-y-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Task Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="statusFilter">Status</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="typeFilter">Type</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="generic">Generic</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="dateFilter">Date Range</Label>
                    <Select defaultValue="week">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="searchTasks">Search</Label>
                    <Input
                      id="searchTasks"
                      placeholder="Search URLs..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Tasks
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Export List
                    </Button>
                    <Button size="sm" variant="outline">
                      Clear Completed
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueStats?.recentTasks?.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📋</div>
                    <p className="text-gray-500">No recent tasks found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {queueStats?.recentTasks?.map((task, index) => (
                      <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-blue-600 hover:underline cursor-pointer">
                              {task.url || 'Unknown URL'}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Type: {task.scraperType || 'generic'} | 
                              Created: {task.timestamp ? new Date(task.timestamp).toLocaleString() : 'Unknown'}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusBadgeColor(task.status || 'pending')}>
                              {task.status || 'pending'}
                            </Badge>
                            {task.status === 'completed' && (
                              <Button size="sm" variant="outline">
                                View Results
                              </Button>
                            )}
                            {task.status === 'failed' && (
                              <Button size="sm" variant="outline">
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {task.progress && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {task.error && (
                          <Alert className="mt-2 border-red-200 bg-red-50">
                            <AlertDescription className="text-red-700 text-sm">
                              {task.error.message || 'Unknown error'}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing 1-10 of 156 tasks
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" disabled>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline">
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="space-y-6">
            {/* Results Viewer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Scraping Results
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Export CSV
                    </Button>
                    <Button size="sm" variant="outline">
                      Export JSON
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueStats?.recentCompletedTasks?.length > 0 ? (
                  <div className="space-y-4">
                    {queueStats.recentCompletedTasks.map((task, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{task.url}</h4>
                            <p className="text-sm text-gray-500">
                              Completed: {new Date(task.completedAt || task.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        {task.result && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Items Extracted:</span>
                                <span className="ml-2">{Object.keys(task.result).length}</span>
                              </div>
                              <div>
                                <span className="font-medium">Processing Time:</span>
                                <span className="ml-2">{task.processingTime || 'N/A'}</span>
                              </div>
                            </div>
                            
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600 text-sm font-medium">
                                Preview Data
                              </summary>
                              <div className="mt-2 bg-gray-50 rounded p-3">
                                <pre className="text-xs overflow-auto max-h-48">
                                  {JSON.stringify(task.result, null, 2)}
                                </pre>
                              </div>
                            </details>
                            
                            {task.screenshot && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Screenshot:</p>
                                <img 
                                  src={task.screenshot} 
                                  alt="Page screenshot" 
                                  className="max-w-full h-32 object-contain border rounded"
                                />
                              </div>
                            )}
                            
                            {task.claudeAnalysis && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Claude Analysis:</p>
                                <div className="bg-blue-50 p-3 rounded text-sm">
                                  {task.claudeAnalysis}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📊</div>
                    <p className="text-gray-500">No completed results yet.</p>
                    <p className="text-sm text-gray-400">Results will appear here after tasks complete.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">156</div>
                  <div className="text-sm text-gray-600">Total Extractions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">2.4MB</div>
                  <div className="text-sm text-gray-600">Data Collected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">94%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">3.2s</div>
                  <div className="text-sm text-gray-600">Avg Response</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebScraperDashboard;
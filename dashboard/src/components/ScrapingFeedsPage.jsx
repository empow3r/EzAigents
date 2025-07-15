'use client';
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
import WebScraperDashboard from './WebScraperDashboard';

const ScrapingFeedsPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [feeds, setFeeds] = useState([]);
  const [bulkUrls, setBulkUrls] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    frequency: 'daily',
    extractionRules: '',
    enabled: true
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    extractionRules: '',
    scraperType: 'generic'
  });

  // Mock data for demonstration
  useEffect(() => {
    setFeeds([
      {
        id: 1,
        name: 'Tech News RSS',
        url: 'https://techcrunch.com/feed/',
        frequency: 'hourly',
        status: 'active',
        lastRun: new Date().toISOString(),
        itemsCollected: 42
      },
      {
        id: 2,
        name: 'Product Hunt Daily',
        url: 'https://www.producthunt.com',
        frequency: 'daily',
        status: 'paused',
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        itemsCollected: 156
      }
    ]);
    
    setTemplates([
      {
        id: 1,
        name: 'E-commerce Product',
        description: 'Extract product details from e-commerce sites',
        scraperType: 'generic',
        extractionRules: JSON.stringify({
          title: '.product-title',
          price: '.price',
          description: '.product-description',
          images: { selector: '.product-image img', attribute: 'src', multiple: true }
        }, null, 2)
      },
      {
        id: 2,
        name: 'News Articles',
        description: 'Extract article content from news websites',
        scraperType: 'generic',
        extractionRules: JSON.stringify({
          headline: 'h1',
          author: '.author',
          content: '.article-body',
          publishDate: '.publish-date'
        }, null, 2)
      }
    ]);
  }, []);

  const handleCreateFeed = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const feed = {
        id: Date.now(),
        ...newFeed,
        status: 'active',
        lastRun: new Date().toISOString(),
        itemsCollected: 0
      };
      
      setFeeds(prev => [...prev, feed]);
      setNewFeed({ name: '', url: '', frequency: 'daily', extractionRules: '', enabled: true });
    } catch (error) {
      console.error('Failed to create feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkScrape = async () => {
    setLoading(true);
    
    try {
      const urls = bulkUrls.split('\n').filter(url => url.trim());
      
      // Simulate bulk scraping
      for (const url of urls) {
        await fetch('/api/webscraper/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            scraperType: 'generic',
            bulkOperation: true
          })
        });
      }
      
      setBulkUrls('');
      alert(`Started bulk scraping for ${urls.length} URLs`);
    } catch (error) {
      console.error('Bulk scraping failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeedStatus = (feedId) => {
    setFeeds(prev => prev.map(feed => 
      feed.id === feedId 
        ? { ...feed, status: feed.status === 'active' ? 'paused' : 'active' }
        : feed
    ));
  };

  const deleteFeed = (feedId) => {
    setFeeds(prev => prev.filter(feed => feed.id !== feedId));
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    
    const template = {
      id: Date.now(),
      ...newTemplate
    };
    
    setTemplates(prev => [...prev, template]);
    setNewTemplate({ name: '', description: '', extractionRules: '', scraperType: 'generic' });
  };

  const useTemplate = (template) => {
    setNewFeed(prev => ({
      ...prev,
      extractionRules: template.extractionRules
    }));
    setActiveTab('feeds');
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Enhanced Web Scraping</h1>
        <p className="text-gray-600">Comprehensive web scraping, feeds management, and automation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Scraper Dashboard</TabsTrigger>
          <TabsTrigger value="feeds">RSS/Feeds</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Main Scraper Dashboard */}
        <TabsContent value="dashboard">
          <WebScraperDashboard />
        </TabsContent>

        {/* RSS/Feeds Management */}
        <TabsContent value="feeds">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Create RSS/Feed Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateFeed} className="space-y-4">
                  <div>
                    <Label htmlFor="feedName">Feed Name</Label>
                    <Input
                      id="feedName"
                      value={newFeed.name}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Tech News Monitor"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="feedUrl">URL or RSS Feed</Label>
                    <Input
                      id="feedUrl"
                      type="url"
                      value={newFeed.url}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com/feed.xml"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="frequency">Check Frequency</Label>
                    <Select value={newFeed.frequency} onValueChange={(value) => setNewFeed(prev => ({ ...prev, frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="feedRules">Extraction Rules (JSON)</Label>
                    <Textarea
                      id="feedRules"
                      value={newFeed.extractionRules}
                      onChange={(e) => setNewFeed(prev => ({ ...prev, extractionRules: e.target.value }))}
                      placeholder='{"title": "h1", "content": ".content"}'
                      rows={4}
                    />
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Feed Monitor'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Feeds */}
            <Card>
              <CardHeader>
                <CardTitle>Active Feed Monitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feeds.map((feed) => (
                    <div key={feed.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{feed.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadgeColor(feed.status)}>
                            {feed.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFeedStatus(feed.id)}
                          >
                            {feed.status === 'active' ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteFeed(feed.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>URL: {feed.url}</p>
                        <p>Frequency: {feed.frequency}</p>
                        <p>Last run: {new Date(feed.lastRun).toLocaleString()}</p>
                        <p>Items collected: {feed.itemsCollected}</p>
                      </div>
                    </div>
                  ))}
                  {feeds.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No feed monitors created yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bulk Operations */}
        <TabsContent value="bulk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk URL Scraping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulkUrls">URLs (one per line)</Label>
                    <Textarea
                      id="bulkUrls"
                      value={bulkUrls}
                      onChange={(e) => setBulkUrls(e.target.value)}
                      placeholder="https://example1.com\nhttps://example2.com\nhttps://example3.com"
                      rows={10}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleBulkScrape} 
                    disabled={loading || !bulkUrls.trim()}
                    className="w-full"
                  >
                    {loading ? 'Processing...' : `Scrape ${bulkUrls.split('\n').filter(u => u.trim()).length} URLs`}
                  </Button>
                  
                  <Alert>
                    <AlertDescription>
                      Bulk operations will process all URLs in the background. Check the Task History tab for progress.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">Configure automated scraping schedules</p>
                  
                  <Button className="w-full" variant="outline">
                    Create New Schedule
                  </Button>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Active Schedules</h4>
                    <p className="text-sm text-gray-500">No scheduled operations configured yet.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Extraction Template</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createTemplate} className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Blog Post Extractor"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="templateDesc">Description</Label>
                    <Input
                      id="templateDesc"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Extracts title, content, and metadata from blog posts"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="templateType">Scraper Type</Label>
                    <Select value={newTemplate.scraperType} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, scraperType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">Generic</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="gmail">Gmail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="templateRules">Extraction Rules (JSON)</Label>
                    <Textarea
                      id="templateRules"
                      value={newTemplate.extractionRules}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, extractionRules: e.target.value }))}
                      placeholder='{"title": "h1", "content": ".post-content", "author": ".author-name"}'
                      rows={6}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Create Template
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                          <Badge variant="outline" className="mt-1">{template.scraperType}</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => useTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </div>
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-blue-600">View Rules</summary>
                        <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">
                          {template.extractionRules}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Scrapes (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <div className="text-xs text-green-600">+12% from yesterday</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <div className="text-xs text-green-600">+2.1% improvement</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Data Extracted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2GB</div>
                <div className="text-xs text-gray-600">Across all sources</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500">Analytics charts will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScrapingFeedsPage;
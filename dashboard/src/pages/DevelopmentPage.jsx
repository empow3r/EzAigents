'use client';
import React, { useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Badge } from '@/src/components/ui/badge';
import * as Icons from 'lucide-react';

const DevelopmentPage = ({ darkMode, realTimeData = {} }) => {
  const [selectedFile, setSelectedFile] = useState('src/api/auth.js');
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('claude-3-opus');
  const [code, setCode] = useState(`// Authentication Module
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function authenticate(email, password) {
  // TODO: Implement authentication logic
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) {
    throw new Error('Invalid password');
  }
  
  return generateToken(user);
}`);

  const files = [
    { path: 'src/api/auth.js', type: 'javascript', modified: '2m ago' },
    { path: 'src/api/users.js', type: 'javascript', modified: '1h ago' },
    { path: 'src/components/Login.jsx', type: 'react', modified: '3h ago' },
    { path: 'tests/auth.test.js', type: 'test', modified: '1d ago' },
    { path: 'README.md', type: 'markdown', modified: '2d ago' }
  ];

  const enhancements = [
    { id: 1, name: 'Security Layer', status: 'active', impact: 'High' },
    { id: 2, name: 'Performance Optimizer', status: 'pending', impact: 'Medium' },
    { id: 3, name: 'Auto-Documentation', status: 'active', impact: 'Low' },
    { id: 4, name: 'Test Generator', status: 'completed', impact: 'High' }
  ];

  const prompts = [
    { label: 'Refactor for performance', value: 'refactor-performance' },
    { label: 'Add error handling', value: 'add-error-handling' },
    { label: 'Generate unit tests', value: 'generate-tests' },
    { label: 'Add documentation', value: 'add-docs' },
    { label: 'Security review', value: 'security-review' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Development Studio</h2>
        <p className="text-muted-foreground">
          Code editing, prompt management, and enhancement tools
        </p>
      </div>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Code Editor</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Manager</TabsTrigger>
          <TabsTrigger value="enhancements">Enhancements</TabsTrigger>
        </TabsList>

        {/* Code Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            {/* File Explorer */}
            <Card className="p-4 lg:col-span-1">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Icons.FileCode className="h-4 w-4" />
                Files
              </h3>
              <div className="space-y-1">
                {files.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      selectedFile === file.path 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{file.path.split('/').pop()}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>
                    <span className="text-xs opacity-70">{file.modified}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Code Editor */}
            <Card className="p-4 lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icons.Code className="h-4 w-4" />
                  <span className="font-mono text-sm">{selectedFile}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost">
                    <Icons.Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Icons.Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Icons.Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono text-sm min-h-[400px] resize-none"
                  placeholder="// Start coding..."
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button size="sm" variant="secondary">
                    <Icons.Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm">
                    <Icons.PlayCircle className="h-4 w-4 mr-2" />
                    Run
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Prompt Manager Tab */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Create Prompt</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Template
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {prompts.map(prompt => (
                        <SelectItem key={prompt.value} value={prompt.value}>
                          {prompt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Custom Prompt
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want the AI to do..."
                    className="min-h-[200px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Target Agent
                  </label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-opus">Claude (Architecture)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4 (Backend)</SelectItem>
                      <SelectItem value="deepseek-coder">DeepSeek (Testing)</SelectItem>
                      <SelectItem value="command-r-plus">Mistral (Docs)</SelectItem>
                      <SelectItem value="gemini-pro">Gemini (Analysis)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Icons.Send className="h-4 w-4 mr-2" />
                  Send to Agent
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Recent Prompts</h3>
              <div className="space-y-3">
                {[
                  { prompt: 'Refactor auth module for better security', agent: 'Claude', time: '10m ago', status: 'completed' },
                  { prompt: 'Add input validation to API endpoints', agent: 'GPT-4', time: '25m ago', status: 'in-progress' },
                  { prompt: 'Generate tests for user service', agent: 'DeepSeek', time: '1h ago', status: 'completed' },
                  { prompt: 'Document API endpoints', agent: 'Mistral', time: '2h ago', status: 'completed' }
                ].map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium">{item.prompt}</p>
                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.agent}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Enhancements Tab */}
        <TabsContent value="enhancements" className="space-y-4">
          <div className="grid gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icons.Sparkles className="h-5 w-5" />
                  Enhancement Modules
                </h3>
                <Button size="sm">
                  <Icons.RefreshCw className="h-4 w-4 mr-2" />
                  Scan for Updates
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {enhancements.map(enhancement => (
                  <div key={enhancement.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{enhancement.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Impact: <span className={`font-medium ${
                            enhancement.impact === 'High' ? 'text-red-500' :
                            enhancement.impact === 'Medium' ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>{enhancement.impact}</span>
                        </p>
                      </div>
                      <Badge variant={enhancement.status === 'active' ? 'default' : 
                                     enhancement.status === 'completed' ? 'secondary' : 
                                     'outline'}>
                        {enhancement.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Icons.Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="flex-1">
                        {enhancement.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Icons.Terminal className="h-5 w-5" />
                Enhancement Console
              </h3>
              <div className="bg-black/90 rounded-lg p-4 font-mono text-sm text-green-400">
                <div>$ enhancement-dispatcher security-layer</div>
                <div className="opacity-70">Initializing security enhancement module...</div>
                <div className="opacity-70">Scanning codebase for vulnerabilities...</div>
                <div className="opacity-70">Found 3 potential issues</div>
                <div className="opacity-70">Applying security patches...</div>
                <div>✓ Security layer enhancement completed</div>
                <div className="mt-2">$ _</div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevelopmentPage;
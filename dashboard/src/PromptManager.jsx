'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import * as Icons from 'lucide-react';

const AGENT_SPECIALISTS = {
  'claude-3-opus': {
    name: 'Claude - Senior Software Architect',
    identity: 'Senior Software Architect & Refactoring Specialist',
    objective: 'Transform existing code into production-ready, maintainable, and performant solutions',
    specializations: ['Code Architecture', 'Performance Optimization', 'Design Patterns', 'Legacy Code Modernization'],
    badge: '🏗️',
    color: 'bg-blue-500'
  },
  'gpt-4o': {
    name: 'GPT-4 - Senior Backend Engineer',
    identity: 'Senior Backend Engineer & API Architect',
    objective: 'Build robust, scalable backend systems with bulletproof APIs and business logic',
    specializations: ['API Design', 'Database Architecture', 'Authentication & Security', 'Microservices'],
    badge: '⚙️',
    color: 'bg-green-500'
  },
  'deepseek-coder': {
    name: 'DeepSeek - QA & Test Specialist',
    identity: 'Senior QA Engineer & Test Automation Specialist',
    objective: 'Ensure 100% code reliability through comprehensive testing strategies and automation',
    specializations: ['Unit Testing', 'Integration Testing', 'Test Automation', 'Quality Assurance'],
    badge: '🧪',
    color: 'bg-purple-500'
  },
  'command-r-plus': {
    name: 'Mistral - Technical Writer',
    identity: 'Senior Technical Writer & Documentation Architect',
    objective: 'Create comprehensive, developer-friendly documentation that accelerates team productivity',
    specializations: ['API Documentation', 'Developer Guides', 'Architecture Documentation', 'User Manuals'],
    badge: '📚',
    color: 'bg-orange-500'
  },
  'gemini-pro': {
    name: 'Gemini - Security & Performance Analyst',
    identity: 'Senior Security & Performance Analyst',
    objective: 'Identify security vulnerabilities, performance bottlenecks, and optimization opportunities',
    specializations: ['Security Analysis', 'Performance Optimization', 'Code Quality', 'Architecture Review'],
    badge: '🔍',
    color: 'bg-red-500'
  }
};

const SPECIALIST_PROMPT_TEMPLATES = {
  'claude-3-opus': {
    basic: 'Refactor this code following SOLID principles. Add error handling, JSDoc documentation, and optimize for maintainability.',
    advanced: 'Perform comprehensive architectural refactoring. Apply design patterns, optimize performance, ensure type safety, and add comprehensive documentation.',
    security: 'Refactor with security focus. Implement input validation, error handling, and security best practices while maintaining code quality.',
    performance: 'Optimize this code for maximum performance. Identify bottlenecks, improve algorithms, and implement efficient data structures.'
  },
  'gpt-4o': {
    basic: 'Implement robust backend logic with proper error handling, input validation, and structured responses.',
    advanced: 'Design and implement scalable backend architecture with authentication, authorization, database optimization, and comprehensive error handling.',
    security: 'Build secure backend implementation with JWT authentication, input sanitization, SQL injection prevention, and security headers.',
    api: 'Create RESTful API endpoints following OpenAPI standards with proper HTTP status codes, validation, and documentation.'
  },
  'deepseek-coder': {
    basic: 'Create comprehensive unit tests with minimum 90% coverage. Include happy path, edge cases, and error scenarios.',
    advanced: 'Implement complete testing strategy including unit, integration, and e2e tests with mocking, fixtures, and CI/CD integration.',
    automation: 'Set up automated testing pipeline with coverage reporting, performance benchmarking, and quality gates.',
    tdd: 'Apply test-driven development approach. Write tests first, then implement code that passes all tests.'
  },
  'command-r-plus': {
    basic: 'Generate comprehensive documentation with clear explanations, usage examples, and API references.',
    advanced: 'Create complete documentation suite including developer guides, architecture docs, tutorials, and troubleshooting guides.',
    api: 'Document API endpoints with OpenAPI specifications, code samples, authentication details, and error handling.',
    user: 'Write user-friendly documentation with step-by-step guides, screenshots, and video tutorial scripts.'
  },
  'gemini-pro': {
    basic: 'Analyze code for security vulnerabilities, performance bottlenecks, and quality improvements.',
    advanced: 'Perform comprehensive security and performance audit with OWASP compliance, scalability analysis, and detailed recommendations.',
    security: 'Conduct thorough security assessment including vulnerability scanning, penetration testing, and compliance verification.',
    performance: 'Analyze performance metrics, identify optimization opportunities, and provide benchmarking recommendations.'
  }
};

export default function PromptManager({ darkMode = false }) {
  const [tasks, setTasks] = useState({});
  const [newTask, setNewTask] = useState({ file: '', model: '', prompt: '' });
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load tasks from API
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/filemap');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage('Error loading tasks');
    }
  };

  const saveTask = async (taskData) => {
    setLoading(true);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const response = await fetch('/api/filemap', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage(editingTask ? 'Task updated!' : 'Task added!');
        setEditingTask(null);
        setNewTask({ file: '', model: '', prompt: '' });
        loadTasks();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      setMessage('Error saving task');
    }
    setLoading(false);
  };

  const deleteTask = async (file) => {
    setLoading(true);
    try {
      const response = await fetch('/api/filemap', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage('Task deleted!');
        loadTasks();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setMessage('Error deleting task');
    }
    setLoading(false);
  };

  const enqueueTask = async (file, model, prompt) => {
    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, model, prompt })
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage(`Task enqueued to ${AGENT_SPECIALISTS[model]?.name || model}!`);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error enqueuing task:', error);
      setMessage('Error enqueuing task');
    }
  };

  const handleModelChange = (model) => {
    const templates = SPECIALIST_PROMPT_TEMPLATES[model];
    const prompt = templates ? templates.basic : '';
    if (editingTask) {
      setEditingTask({ ...editingTask, model, prompt });
    } else {
      setNewTask({ ...newTask, model, prompt });
    }
  };

  const handleTemplateChange = (template) => {
    const currentModel = editingTask ? editingTask.model : newTask.model;
    if (!currentModel) return;
    
    const templates = SPECIALIST_PROMPT_TEMPLATES[currentModel];
    const prompt = templates ? templates[template] : '';
    
    if (editingTask) {
      setEditingTask({ ...editingTask, prompt });
    } else {
      setNewTask({ ...newTask, prompt });
    }
  };

  const TaskForm = ({ task, onSave, onCancel, isEditing }) => {
    const specialist = task.model ? AGENT_SPECIALISTS[task.model] : null;
    const templates = task.model ? SPECIALIST_PROMPT_TEMPLATES[task.model] : null;
    
    return (
      <Card className={`mb-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader>
          <CardTitle className={darkMode ? 'text-white' : 'text-gray-900'}>{isEditing ? 'Edit Task' : 'Add New Task'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>File Path</label>
            <Input
              value={task.file || ''}
              onChange={(e) => {
                const newFile = e.target.value;
                if (isEditing) {
                  setEditingTask({ ...task, file: newFile });
                } else {
                  setNewTask({ ...task, file: newFile });
                }
              }}
              placeholder="e.g., src/components/Button.jsx"
              className={darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' : ''}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>AI Specialist Agent</label>
            <select 
              value={task.model || ''} 
              onChange={(e) => handleModelChange(e.target.value)}
              className={`w-full p-2 border rounded-md ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="">Select a specialist agent</option>
              {Object.entries(AGENT_SPECIALISTS).map(([key, agent]) => (
                <option key={key} value={key}>
                  {agent.badge} {agent.name}
                </option>
              ))}
            </select>
            
            {specialist && (
              <div className={`mt-3 p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${specialist.color}`}>
                    {specialist.badge} {specialist.identity}
                  </span>
                </div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{specialist.objective}</p>
                <div className="flex flex-wrap gap-1">
                  {specialist.specializations.map((spec, index) => (
                    <span key={index} className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {templates && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Prompt Template</label>
              <select 
                onChange={(e) => handleTemplateChange(e.target.value)}
                className={`w-full p-2 border rounded-md ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">Choose a prompt template</option>
                {Object.entries(templates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Task Instructions & Requirements</label>
            <Textarea
              value={task.prompt || ''}
              onChange={(e) => {
                const newPrompt = e.target.value;
                if (isEditing) {
                  setEditingTask({ ...task, prompt: newPrompt });
                } else {
                  setNewTask({ ...task, prompt: newPrompt });
                }
              }}
              placeholder="Describe what you want the AI agent to do with this file..."
              rows={6}
              className={darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' : ''}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => onSave(task)} 
              disabled={!task.file || !task.model || !task.prompt || loading}
            >
              <Icons.Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update' : 'Save'}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`max-w-4xl mx-auto p-4 min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h1 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Agent Prompt Manager</h1>
      
      {message && (
        <div className={`mb-4 p-3 rounded-md border ${darkMode ? 'bg-blue-900 border-blue-700 text-blue-100' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
          {message}
          <button 
            onClick={() => setMessage('')}
            className={`ml-2 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'}`}
          >
            ×
          </button>
        </div>
      )}
      
      {!editingTask && (
        <TaskForm 
          task={newTask} 
          onSave={saveTask} 
          isEditing={false}
        />
      )}
      
      {editingTask && (
        <TaskForm 
          task={editingTask} 
          onSave={saveTask} 
          onCancel={() => setEditingTask(null)}
          isEditing={true}
        />
      )}
      
      <div className="space-y-4">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Current Tasks</h2>
        
        {Object.entries(tasks).length === 0 ? (
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
            <CardContent className="text-center py-8">
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No tasks configured yet.</p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Add your first task above to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(tasks).map(([file, task]) => {
            const specialist = AGENT_SPECIALISTS[task.model];
            return (
              <Card key={file} className={`border-l-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} style={{ borderLeftColor: specialist ? specialist.color.replace('bg-', '#') : '#gray' }}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{file}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {file.split('/').pop()?.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      
                      {specialist && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${specialist.color}`}>
                            {specialist.badge} {specialist.name}
                          </span>
                        </div>
                      )}
                      
                      <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {specialist?.objective || 'AI Agent Task'}
                      </p>
                      
                      {specialist && (
                        <div className="flex flex-wrap gap-1">
                          {specialist.specializations.slice(0, 3).map((spec, index) => (
                            <span key={index} className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                              {spec}
                            </span>
                          ))}
                          {specialist.specializations.length > 3 && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              +{specialist.specializations.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => enqueueTask(file, task.model, task.prompt)}
                        className="whitespace-nowrap"
                      >
                        <Icons.Send className="w-4 h-4 mr-1" />
                        Enqueue
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingTask({ file, ...task })}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteTask(file)}
                      >
                        <Icons.Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Task Instructions:</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{task.prompt}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
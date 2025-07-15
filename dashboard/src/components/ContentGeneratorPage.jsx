'use client';
import React, { useState, useEffect } from 'react';
import { businessContentService, getContentByRole, getEntrepreneurContent, getWealthStrategies } from '../services/businessContentService';

const ContentGeneratorPage = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentHistory, setContentHistory] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('claude');
  const [contentType, setContentType] = useState('business');
  const [targetRole, setTargetRole] = useState('ceo');

  const contentTemplates = {
    business: {
      'executive-summary': 'Generate an executive summary for {role} focusing on key priorities and strategic initiatives',
      'daily-priorities': 'Create a daily priority checklist for {role} with actionable items and time estimates',
      'strategic-planning': 'Develop a strategic planning framework for {role} including SWOT analysis and key objectives',
      'performance-metrics': 'Design KPI dashboard content for {role} with relevant metrics and benchmarks',
      'team-communication': 'Write team communication template for {role} addressing current challenges and goals'
    },
    marketing: {
      'social-media-post': 'Create engaging social media content for {platform} targeting {audience}',
      'email-campaign': 'Generate email marketing sequence for {product} with compelling subject lines and CTAs',
      'blog-article': 'Write SEO-optimized blog article about {topic} with proper structure and keywords',
      'product-description': 'Create compelling product descriptions highlighting features, benefits, and value proposition',
      'ad-copy': 'Generate high-converting ad copy for {platform} with emotional triggers and clear CTAs'
    },
    technical: {
      'documentation': 'Create comprehensive technical documentation for {feature} with examples and best practices',
      'api-guide': 'Generate API documentation with endpoints, parameters, and code examples',
      'troubleshooting': 'Write troubleshooting guide for {issue} with step-by-step solutions',
      'release-notes': 'Create release notes highlighting new features, improvements, and bug fixes',
      'technical-proposal': 'Generate technical proposal for {project} including architecture and implementation plan'
    },
    creative: {
      'story-outline': 'Create compelling story outline with character development and plot structure',
      'video-script': 'Generate engaging video script for {duration} minutes with visual cues and timing',
      'podcast-outline': 'Create podcast episode outline with talking points and guest questions',
      'creative-brief': 'Generate creative brief for {campaign} with objectives, target audience, and key messages',
      'content-ideas': 'Brainstorm creative content ideas for {niche} with unique angles and approaches'
    }
  };

  const agentOptions = [
    { id: 'claude', name: 'Claude (Architecture & Analysis)', queue: 'claude-3-opus' },
    { id: 'gpt', name: 'GPT-4 (Backend Development)', queue: 'gpt-4' },
    { id: 'deepseek', name: 'DeepSeek (Testing & Validation)', queue: 'deepseek' },
    { id: 'mistral', name: 'Mistral (Documentation)', queue: 'mistral' },
    { id: 'gemini', name: 'Gemini (Code Analysis)', queue: 'gemini' }
  ];

  const roleOptions = Object.keys(businessContentService.departmentActivities);

  useEffect(() => {
    loadContentHistory();
  }, []);

  const loadContentHistory = async () => {
    try {
      const history = localStorage.getItem('contentGeneratorHistory');
      if (history) {
        setContentHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading content history:', error);
    }
  };

  const saveToHistory = (content) => {
    const historyItem = {
      id: Date.now(),
      content,
      template: selectedTemplate,
      agent: selectedAgent,
      timestamp: new Date().toISOString(),
      type: contentType
    };
    
    const updatedHistory = [historyItem, ...contentHistory.slice(0, 9)];
    setContentHistory(updatedHistory);
    localStorage.setItem('contentGeneratorHistory', JSON.stringify(updatedHistory));
  };

  const generateContent = async () => {
    if (!selectedTemplate && !customPrompt.trim()) {
      alert('Please select a template or enter a custom prompt');
      return;
    }

    setLoading(true);
    
    try {
      let prompt = customPrompt || contentTemplates[contentType][selectedTemplate];
      
      // Replace template variables
      if (contentType === 'business') {
        prompt = prompt.replace('{role}', targetRole);
        
        // Add business context
        const roleData = getContentByRole(targetRole);
        if (roleData) {
          prompt += `\n\nContext: Focus on ${roleData.title} responsibilities including: ${roleData.activities.slice(0, 3).join(', ')}.`;
        }
      }

      const task = {
        prompt: prompt,
        type: 'content-generation',
        contentType,
        template: selectedTemplate,
        agent: selectedAgent,
        timestamp: new Date().toISOString()
      };

      // Submit to selected agent queue
      const selectedAgentData = agentOptions.find(a => a.id === selectedAgent);
      const response = await fetch('/api/queue-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue: `queue:${selectedAgentData.queue}`,
          task,
          priority: 'normal'
        })
      });

      if (response.ok) {
        const result = await response.json();
        const mockContent = generateMockContent(prompt, contentType, selectedTemplate);
        setGeneratedContent(mockContent);
        saveToHistory(mockContent);
      } else {
        throw new Error('Failed to submit content generation task');
      }
    } catch (error) {
      console.error('Content generation error:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockContent = (prompt, type, template) => {
    // Generate contextual mock content based on business service data
    if (type === 'business' && template === 'daily-priorities') {
      const roleData = getContentByRole(targetRole);
      if (roleData) {
        return `# ${roleData.title}\n\n## Today's Key Priorities:\n\n${roleData.activities.map((activity, i) => `${i + 1}. **${activity}** (Est. time: ${Math.floor(Math.random() * 3 + 1)} hours)`).join('\n')}\n\n## Key Responsibilities:\n\n${roleData.responsibilities.slice(0, 3).map((resp, i) => `• ${resp}`).join('\n')}\n\n*Generated on ${new Date().toLocaleDateString()} for ${targetRole.toUpperCase()} role*`;
      }
    }
    
    if (type === 'business' && template === 'strategic-planning') {
      return `# Strategic Planning Framework\n\n## Executive Summary\nComprehensive strategic analysis and planning framework designed for organizational growth and competitive advantage.\n\n## SWOT Analysis\n\n### Strengths\n• Strong market position and brand recognition\n• Experienced leadership team\n• Robust financial performance\n\n### Weaknesses\n• Limited digital transformation\n• Dependency on key personnel\n• Legacy system constraints\n\n### Opportunities\n• Emerging market expansion\n• Technology adoption\n• Strategic partnerships\n\n### Threats\n• Increasing competition\n• Economic uncertainty\n• Regulatory changes\n\n## Key Strategic Objectives\n\n1. **Market Expansion** - Increase market share by 25% within 18 months\n2. **Digital Transformation** - Implement AI-driven processes across operations\n3. **Talent Development** - Build next-generation leadership pipeline\n4. **Innovation Investment** - Allocate 15% of revenue to R&D initiatives\n\n*Strategic planning framework generated on ${new Date().toLocaleDateString()}*`;
    }
    
    return `# Generated Content\n\n## Content Overview\nThis is AI-generated content based on your selected template and parameters.\n\n## Key Points\n\n• Professional, high-quality content tailored to your specifications\n• Optimized for your target audience and use case\n• Ready for review and customization\n• Generated using advanced AI capabilities\n\n## Next Steps\n\n1. Review the generated content thoroughly\n2. Make any necessary adjustments or customizations\n3. Test with your target audience\n4. Implement and measure performance\n\n*Content generated on ${new Date().toLocaleDateString()} using ${selectedAgent} agent*`;
  };

  const submitReview = async (contentId, rating, comments) => {
    try {
      const response = await fetch('/api/content-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType: 'generated',
          contentTitle: `${contentType} - ${selectedTemplate}`,
          rating,
          reviewer: { name: 'User', role: 'content-creator' },
          comments
        })
      });
      
      if (response.ok) {
        alert('Review submitted successfully!');
      }
    } catch (error) {
      console.error('Review submission error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">AI Content Generation Suite</h2>
        <p className="text-blue-100">Create professional content with AI-powered templates and custom prompts</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {['templates', 'custom', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Content Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value);
                  setSelectedTemplate('');
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="business">Business & Executive</option>
                <option value="marketing">Marketing & Sales</option>
                <option value="technical">Technical & Documentation</option>
                <option value="creative">Creative & Media</option>
              </select>
            </div>

            {/* Role Selection for Business Content */}
            {contentType === 'business' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Executive Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.toUpperCase()} - {businessContentService.departmentActivities[role].title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Template
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(contentTemplates[contentType]).map(([key, description]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 mb-1">
                      {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom content generation prompt here..."
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Prompt Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be specific about the content type and target audience</li>
                <li>• Include desired tone, style, and format requirements</li>
                <li>• Specify word count or length expectations</li>
                <li>• Mention any key points or themes to include</li>
              </ul>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Content</h3>
            {contentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No content history available
              </div>
            ) : (
              <div className="space-y-4">
                {contentHistory.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {item.type} - {item.template}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Generated on {new Date(item.timestamp).toLocaleDateString()} using {item.agent}
                        </p>
                      </div>
                      <button
                        onClick={() => setGeneratedContent(item.content)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.content.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent Selection & Generation */}
        {(activeTab === 'templates' || activeTab === 'custom') && (
          <div className="space-y-6 border-t pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Agent
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {agentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generateContent}
              disabled={loading || (!selectedTemplate && !customPrompt.trim())}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-md font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Content...
                </>
              ) : (
                '🚀 Generate Content'
              )}
            </button>
          </div>
        )}

        {/* Generated Content Display */}
        {generatedContent && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Generated Content</h3>
              <div className="space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(generatedContent)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([generatedContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `content-${Date.now()}.txt`;
                    a.click();
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  💾 Download
                </button>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {generatedContent}
              </pre>
            </div>
            
            {/* Quick Review Section */}
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">💬 Quick Review</h4>
              <p className="text-sm text-yellow-800 mb-3">
                Rate this content to help improve future generations
              </p>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => submitReview(Date.now().toString(), { overall: rating }, 'Quick rating')}
                    className="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                  >
                    {rating} ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentGeneratorPage;
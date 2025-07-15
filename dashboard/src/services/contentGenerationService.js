// Advanced Content Generation Service
// Provides AI-powered content generation with template management and workflow optimization

export const contentGenerationService = {
  // Content templates organized by category
  templates: {
    business: {
      'executive-summary': {
        title: 'Executive Summary',
        description: 'Generate comprehensive executive summaries for strategic presentations',
        prompt: 'Create a professional executive summary for {role} focusing on {focus_areas}. Include key metrics, strategic priorities, and actionable recommendations.',
        variables: ['role', 'focus_areas', 'company_size', 'industry'],
        estimatedTime: '45 seconds',
        complexity: 'high'
      },
      'daily-priorities': {
        title: 'Daily Priority Checklist',
        description: 'Create actionable daily priority lists for executives',
        prompt: 'Generate a comprehensive daily priority checklist for {role} including time estimates, urgency levels, and strategic alignment.',
        variables: ['role', 'department', 'company_stage', 'current_challenges'],
        estimatedTime: '30 seconds',
        complexity: 'medium'
      },
      'strategic-planning': {
        title: 'Strategic Planning Framework',
        description: 'Develop comprehensive strategic planning documents',
        prompt: 'Create a strategic planning framework for {role} including SWOT analysis, KPIs, and implementation roadmap for {time_horizon}.',
        variables: ['role', 'time_horizon', 'market_focus', 'growth_targets'],
        estimatedTime: '60 seconds',
        complexity: 'high'
      },
      'performance-metrics': {
        title: 'KPI Dashboard Content',
        description: 'Design performance metrics and dashboard content',
        prompt: 'Design KPI dashboard content for {role} with relevant metrics, benchmarks, and performance indicators for {department}.',
        variables: ['role', 'department', 'company_size', 'performance_focus'],
        estimatedTime: '40 seconds',
        complexity: 'medium'
      },
      'team-communication': {
        title: 'Team Communication Templates',
        description: 'Create effective team communication templates',
        prompt: 'Write professional team communication template for {role} addressing {communication_type} with clear action items and next steps.',
        variables: ['role', 'communication_type', 'urgency_level', 'team_size'],
        estimatedTime: '35 seconds',
        complexity: 'medium'
      }
    },
    marketing: {
      'social-media-post': {
        title: 'Social Media Content',
        description: 'Create engaging social media posts for various platforms',
        prompt: 'Create engaging {platform} post about {topic} targeting {audience} with compelling visuals suggestions and optimal hashtags.',
        variables: ['platform', 'topic', 'audience', 'brand_voice', 'call_to_action'],
        estimatedTime: '25 seconds',
        complexity: 'low'
      },
      'email-campaign': {
        title: 'Email Marketing Campaign',
        description: 'Generate complete email marketing sequences',
        prompt: 'Generate email marketing sequence for {product} with {sequence_length} emails including subject lines, CTAs, and personalization.',
        variables: ['product', 'sequence_length', 'target_audience', 'campaign_goal'],
        estimatedTime: '50 seconds',
        complexity: 'high'
      },
      'blog-article': {
        title: 'SEO Blog Article',
        description: 'Write SEO-optimized blog articles with proper structure',
        prompt: 'Write SEO-optimized blog article about {topic} with {word_count} words, proper H-tags, and keyword optimization for {target_keywords}.',
        variables: ['topic', 'word_count', 'target_keywords', 'content_angle'],
        estimatedTime: '75 seconds',
        complexity: 'high'
      },
      'product-description': {
        title: 'Product Description',
        description: 'Create compelling product descriptions that convert',
        prompt: 'Create compelling product description for {product} highlighting features, benefits, and unique value proposition for {target_market}.',
        variables: ['product', 'target_market', 'price_point', 'key_features'],
        estimatedTime: '30 seconds',
        complexity: 'medium'
      },
      'ad-copy': {
        title: 'Advertisement Copy',
        description: 'Generate high-converting ad copy for various platforms',
        prompt: 'Generate high-converting ad copy for {platform} promoting {product} with emotional triggers, social proof, and clear CTAs.',
        variables: ['platform', 'product', 'ad_format', 'target_demographic'],
        estimatedTime: '35 seconds',
        complexity: 'medium'
      }
    },
    technical: {
      'documentation': {
        title: 'Technical Documentation',
        description: 'Create comprehensive technical documentation',
        prompt: 'Create comprehensive technical documentation for {feature} including installation, configuration, usage examples, and troubleshooting.',
        variables: ['feature', 'tech_stack', 'user_level', 'integration_points'],
        estimatedTime: '60 seconds',
        complexity: 'high'
      },
      'api-guide': {
        title: 'API Documentation',
        description: 'Generate complete API documentation with examples',
        prompt: 'Generate API documentation for {api_name} with endpoints, parameters, response examples, and SDK code samples.',
        variables: ['api_name', 'programming_language', 'authentication_type', 'response_format'],
        estimatedTime: '55 seconds',
        complexity: 'high'
      },
      'troubleshooting': {
        title: 'Troubleshooting Guide',
        description: 'Write step-by-step troubleshooting guides',
        prompt: 'Write troubleshooting guide for {issue} with step-by-step solutions, common causes, and prevention strategies.',
        variables: ['issue', 'system_type', 'user_expertise', 'severity_level'],
        estimatedTime: '45 seconds',
        complexity: 'medium'
      },
      'release-notes': {
        title: 'Release Notes',
        description: 'Create detailed release notes for software updates',
        prompt: 'Create release notes for {version} highlighting new features, improvements, bug fixes, and migration instructions.',
        variables: ['version', 'release_type', 'target_audience', 'breaking_changes'],
        estimatedTime: '40 seconds',
        complexity: 'medium'
      },
      'technical-proposal': {
        title: 'Technical Proposal',
        description: 'Generate comprehensive technical proposals',
        prompt: 'Generate technical proposal for {project} including architecture, implementation plan, timeline, and resource requirements.',
        variables: ['project', 'technology_stack', 'project_scope', 'team_size'],
        estimatedTime: '70 seconds',
        complexity: 'high'
      }
    },
    creative: {
      'story-outline': {
        title: 'Story Outline',
        description: 'Create compelling story outlines with character development',
        prompt: 'Create compelling story outline for {genre} with character development, plot structure, and narrative arc over {duration}.',
        variables: ['genre', 'duration', 'target_audience', 'theme'],
        estimatedTime: '50 seconds',
        complexity: 'high'
      },
      'video-script': {
        title: 'Video Script',
        description: 'Generate engaging video scripts with visual cues',
        prompt: 'Generate engaging video script for {video_type} lasting {duration} with visual cues, timing, and call-to-actions.',
        variables: ['video_type', 'duration', 'platform', 'brand_style'],
        estimatedTime: '45 seconds',
        complexity: 'medium'
      },
      'podcast-outline': {
        title: 'Podcast Episode Outline',
        description: 'Create structured podcast episode outlines',
        prompt: 'Create podcast episode outline for {topic} with talking points, guest questions, and segment timing for {duration}.',
        variables: ['topic', 'duration', 'guest_type', 'audience_level'],
        estimatedTime: '40 seconds',
        complexity: 'medium'
      },
      'creative-brief': {
        title: 'Creative Brief',
        description: 'Generate comprehensive creative briefs for campaigns',
        prompt: 'Generate creative brief for {campaign_type} with objectives, target audience, key messages, and creative direction.',
        variables: ['campaign_type', 'brand', 'campaign_goal', 'budget_range'],
        estimatedTime: '45 seconds',
        complexity: 'medium'
      },
      'content-ideas': {
        title: 'Content Ideas Brainstorm',
        description: 'Brainstorm creative content ideas with unique angles',
        prompt: 'Brainstorm {quantity} creative content ideas for {niche} with unique angles, trending topics, and engagement strategies.',
        variables: ['quantity', 'niche', 'content_format', 'seasonal_relevance'],
        estimatedTime: '35 seconds',
        complexity: 'low'
      }
    }
  },

  // AI agent configurations
  agents: {
    claude: {
      id: 'claude',
      name: 'Claude (Architecture & Analysis)',
      queue: 'claude-3-opus',
      strengths: ['Strategic thinking', 'Complex analysis', 'Long-form content'],
      bestFor: ['executive-summary', 'strategic-planning', 'technical-proposal'],
      avgProcessingTime: 45,
      qualityScore: 9.2
    },
    gpt: {
      id: 'gpt',
      name: 'GPT-4 (Backend Development)',
      queue: 'gpt-4',
      strengths: ['Technical content', 'Code examples', 'Structured documentation'],
      bestFor: ['documentation', 'api-guide', 'technical-proposal'],
      avgProcessingTime: 30,
      qualityScore: 8.8
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek (Testing & Validation)',
      queue: 'deepseek',
      strengths: ['Testing strategies', 'Quality assurance', 'Problem-solving'],
      bestFor: ['troubleshooting', 'release-notes', 'performance-metrics'],
      avgProcessingTime: 25,
      qualityScore: 8.5
    },
    mistral: {
      id: 'mistral',
      name: 'Mistral (Documentation)',
      queue: 'mistral',
      strengths: ['Clear documentation', 'User guides', 'Process documentation'],
      bestFor: ['documentation', 'troubleshooting', 'team-communication'],
      avgProcessingTime: 20,
      qualityScore: 8.3
    },
    gemini: {
      id: 'gemini',
      name: 'Gemini (Code Analysis)',
      queue: 'gemini',
      strengths: ['Creative content', 'Marketing copy', 'Analytical thinking'],
      bestFor: ['marketing', 'creative-brief', 'content-ideas'],
      avgProcessingTime: 25,
      qualityScore: 8.6
    }
  },

  // Content quality metrics
  qualityMetrics: {
    business: {
      criteria: ['Strategic alignment', 'Actionability', 'Professional tone', 'Data accuracy'],
      weights: { strategic: 0.3, actionable: 0.25, professional: 0.25, accuracy: 0.2 }
    },
    marketing: {
      criteria: ['Engagement potential', 'Brand alignment', 'Call-to-action clarity', 'Target audience fit'],
      weights: { engagement: 0.35, brand: 0.25, cta: 0.2, audience: 0.2 }
    },
    technical: {
      criteria: ['Technical accuracy', 'Completeness', 'Clarity', 'Usability'],
      weights: { accuracy: 0.4, completeness: 0.25, clarity: 0.2, usability: 0.15 }
    },
    creative: {
      criteria: ['Originality', 'Engagement', 'Brand consistency', 'Emotional impact'],
      weights: { originality: 0.3, engagement: 0.3, brand: 0.2, emotional: 0.2 }
    }
  },

  // Content optimization suggestions
  optimizationRules: {
    lowEngagement: {
      trigger: 'engagement_score < 3',
      suggestions: [
        'Add more compelling headlines',
        'Include questions to engage readers',
        'Use more conversational tone',
        'Add storytelling elements'
      ]
    },
    lowClarity: {
      trigger: 'clarity_score < 3',
      suggestions: [
        'Simplify complex sentences',
        'Add clear transitions',
        'Use bullet points for key information',
        'Include examples and analogies'
      ]
    },
    lowActionability: {
      trigger: 'actionable_score < 3',
      suggestions: [
        'Add specific action items',
        'Include timelines and deadlines',
        'Provide clear next steps',
        'Add measurable outcomes'
      ]
    }
  }
};

// Helper functions
export const getTemplatesByCategory = (category) => {
  return contentGenerationService.templates[category] || {};
};

export const getRecommendedAgent = (templateKey, category) => {
  const template = contentGenerationService.templates[category]?.[templateKey];
  if (!template) return contentGenerationService.agents.claude;

  // Find agent best suited for this template
  const agents = Object.values(contentGenerationService.agents);
  const bestAgent = agents.find(agent => 
    agent.bestFor.includes(templateKey)
  ) || agents.reduce((best, current) => 
    current.qualityScore > best.qualityScore ? current : best
  );

  return bestAgent;
};

export const estimateGenerationTime = (templateKey, category, agentId) => {
  const template = contentGenerationService.templates[category]?.[templateKey];
  const agent = contentGenerationService.agents[agentId];
  
  if (!template || !agent) return '30 seconds';
  
  const complexityMultiplier = {
    low: 0.8,
    medium: 1.0,
    high: 1.3
  };

  const baseTime = agent.avgProcessingTime;
  const adjustedTime = baseTime * (complexityMultiplier[template.complexity] || 1.0);
  
  return `${Math.round(adjustedTime)} seconds`;
};

export const getContentQualityCriteria = (category) => {
  return contentGenerationService.qualityMetrics[category] || contentGenerationService.qualityMetrics.business;
};

export const generateOptimizationSuggestions = (qualityScores) => {
  const suggestions = [];
  
  Object.entries(contentGenerationService.optimizationRules).forEach(([rule, config]) => {
    // Simple rule evaluation (in real implementation, use proper expression parser)
    const shouldTrigger = Object.entries(qualityScores).some(([metric, score]) => {
      if (config.trigger.includes(`${metric}_score < 3`)) {
        return score < 3;
      }
      return false;
    });
    
    if (shouldTrigger) {
      suggestions.push(...config.suggestions);
    }
  });
  
  return [...new Set(suggestions)]; // Remove duplicates
};

export const formatContentTemplate = (templateKey, category, variables = {}) => {
  const template = contentGenerationService.templates[category]?.[templateKey];
  if (!template) return '';
  
  let formattedPrompt = template.prompt;
  
  // Replace template variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return formattedPrompt;
};

export default contentGenerationService;
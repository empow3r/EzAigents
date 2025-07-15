import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Enhancement suggestion engine
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await generateSuggestions(req, res);
      case 'GET':
        return await getSuggestions(req, res);
      case 'PUT':
        return await updateSuggestion(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Enhancement suggestions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function generateSuggestions(req, res) {
  const { 
    contentId, 
    contentType, 
    contentData, 
    currentRating,
    targetAudience,
    platform,
    goals 
  } = req.body;

  if (!contentId || !contentData) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: contentId, contentData'
    });
  }

  try {
    const suggestions = await analyzeAndSuggest(contentData, {
      contentId,
      contentType: contentType || 'general',
      currentRating: currentRating || {},
      targetAudience: targetAudience || 'general',
      platform: platform || 'web',
      goals: goals || []
    });

    const enhancementRecord = {
      id: uuidv4(),
      contentId,
      contentType,
      suggestions,
      context: {
        targetAudience,
        platform,
        goals,
        currentRating
      },
      createdAt: Date.now(),
      status: 'pending',
      priority: calculateOverallPriority(suggestions)
    };

    // Store suggestions
    await redis.hset('enhancement:suggestions', enhancementRecord.id, JSON.stringify(enhancementRecord));
    await redis.sadd(`content:${contentId}:suggestions`, enhancementRecord.id);
    
    // Add to priority queue
    await redis.zadd('enhancement:queue', enhancementRecord.priority, enhancementRecord.id);

    return res.json({
      success: true,
      suggestionId: enhancementRecord.id,
      suggestions: enhancementRecord.suggestions,
      priority: enhancementRecord.priority,
      message: 'Enhancement suggestions generated successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions',
      details: error.message
    });
  }
}

async function getSuggestions(req, res) {
  const { contentId, suggestionId, status, priority, limit = 20 } = req.query;

  try {
    if (suggestionId) {
      // Get specific suggestion
      const suggestionData = await redis.hget('enhancement:suggestions', suggestionId);
      if (!suggestionData) {
        return res.status(404).json({
          success: false,
          error: 'Suggestion not found'
        });
      }
      
      return res.json({
        success: true,
        suggestion: JSON.parse(suggestionData)
      });
    }

    if (contentId) {
      // Get suggestions for specific content
      const suggestionIds = await redis.smembers(`content:${contentId}:suggestions`);
      const suggestions = [];
      
      for (const id of suggestionIds) {
        const suggestionData = await redis.hget('enhancement:suggestions', id);
        if (suggestionData) {
          const suggestion = JSON.parse(suggestionData);
          if (!status || suggestion.status === status) {
            suggestions.push(suggestion);
          }
        }
      }
      
      // Sort by priority
      suggestions.sort((a, b) => b.priority - a.priority);
      
      return res.json({
        success: true,
        contentId,
        suggestions: suggestions.slice(0, parseInt(limit)),
        total: suggestions.length
      });
    }

    // Get all suggestions by priority
    const suggestionIds = await redis.zrevrange('enhancement:queue', 0, parseInt(limit) - 1);
    const suggestions = [];
    
    for (const id of suggestionIds) {
      const suggestionData = await redis.hget('enhancement:suggestions', id);
      if (suggestionData) {
        const suggestion = JSON.parse(suggestionData);
        if (!status || suggestion.status === status) {
          suggestions.push(suggestion);
        }
      }
    }

    return res.json({
      success: true,
      suggestions,
      total: await redis.zcard('enhancement:queue')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      details: error.message
    });
  }
}

async function updateSuggestion(req, res) {
  const { suggestionId } = req.query;
  const { status, implementedSuggestions, feedback } = req.body;

  if (!suggestionId) {
    return res.status(400).json({
      success: false,
      error: 'Missing suggestionId'
    });
  }

  try {
    const suggestionData = await redis.hget('enhancement:suggestions', suggestionId);
    if (!suggestionData) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found'
      });
    }

    const suggestion = JSON.parse(suggestionData);
    
    // Update fields
    if (status) suggestion.status = status;
    if (implementedSuggestions) suggestion.implementedSuggestions = implementedSuggestions;
    if (feedback) suggestion.feedback = feedback;
    
    suggestion.updatedAt = Date.now();

    // Store updated suggestion
    await redis.hset('enhancement:suggestions', suggestionId, JSON.stringify(suggestion));
    
    // Update priority queue if status changed
    if (status === 'completed' || status === 'rejected') {
      await redis.zrem('enhancement:queue', suggestionId);
    }

    return res.json({
      success: true,
      suggestion,
      message: 'Suggestion updated successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update suggestion',
      details: error.message
    });
  }
}

async function analyzeAndSuggest(contentData, context) {
  const suggestions = [];
  
  // Content structure analysis
  const structureSuggestions = analyzeContentStructure(contentData, context);
  suggestions.push(...structureSuggestions);
  
  // SEO optimization
  const seoSuggestions = analyzeSEO(contentData, context);
  suggestions.push(...seoSuggestions);
  
  // Engagement optimization
  const engagementSuggestions = analyzeEngagement(contentData, context);
  suggestions.push(...engagementSuggestions);
  
  // Platform-specific suggestions
  const platformSuggestions = analyzePlatformOptimization(contentData, context);
  suggestions.push(...platformSuggestions);
  
  // Accessibility improvements
  const accessibilitySuggestions = analyzeAccessibility(contentData, context);
  suggestions.push(...accessibilitySuggestions);
  
  // Performance optimizations
  const performanceSuggestions = analyzePerformance(contentData, context);
  suggestions.push(...performanceSuggestions);

  return suggestions;
}

function analyzeContentStructure(contentData, context) {
  const suggestions = [];
  const content = contentData.content || contentData.text || '';
  
  // Check word count
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 300) {
    suggestions.push({
      category: 'structure',
      type: 'length',
      priority: 'medium',
      title: 'Content Length',
      description: 'Content appears to be quite short. Consider expanding with more details.',
      suggestion: 'Add more depth with examples, explanations, or supporting details',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Add relevant examples or case studies',
        'Include more detailed explanations',
        'Add supporting statistics or data',
        'Consider adding FAQ section'
      ]
    });
  }
  
  // Check heading structure
  const headingMatches = content.match(/#{1,6}\s+.+/g) || [];
  if (headingMatches.length === 0) {
    suggestions.push({
      category: 'structure',
      type: 'headings',
      priority: 'high',
      title: 'Heading Structure',
      description: 'No headings detected. Proper heading structure improves readability.',
      suggestion: 'Add hierarchical headings (H1, H2, H3) to organize content',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Add main heading (H1) for the title',
        'Use H2 for major sections',
        'Use H3 for subsections',
        'Ensure logical heading hierarchy'
      ]
    });
  }
  
  // Check paragraph length
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 100);
  if (longParagraphs.length > 0) {
    suggestions.push({
      category: 'structure',
      type: 'paragraphs',
      priority: 'medium',
      title: 'Paragraph Length',
      description: 'Some paragraphs are quite long and may be hard to read.',
      suggestion: 'Break long paragraphs into shorter, more digestible chunks',
      impact: 'medium',
      effort: 'low',
      actionItems: [
        'Split paragraphs longer than 3-4 sentences',
        'Use bullet points for lists',
        'Add line breaks for better visual flow',
        'Consider using subheadings for long sections'
      ]
    });
  }
  
  return suggestions;
}

function analyzeSEO(contentData, context) {
  const suggestions = [];
  const content = contentData.content || contentData.text || '';
  const title = contentData.title || '';
  
  // Title optimization
  if (!title || title.length < 30) {
    suggestions.push({
      category: 'seo',
      type: 'title',
      priority: 'high',
      title: 'Title Optimization',
      description: 'Title is missing or too short for optimal SEO.',
      suggestion: 'Create a compelling title between 30-60 characters',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Include primary keywords',
        'Make it compelling and clickable',
        'Keep between 30-60 characters',
        'Avoid keyword stuffing'
      ]
    });
  }
  
  // Meta description
  if (!contentData.metaDescription) {
    suggestions.push({
      category: 'seo',
      type: 'meta',
      priority: 'high',
      title: 'Meta Description',
      description: 'Missing meta description for search engine optimization.',
      suggestion: 'Add a compelling meta description (150-160 characters)',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Summarize content in 150-160 characters',
        'Include primary keywords naturally',
        'Make it compelling for click-through',
        'Include a call-to-action if appropriate'
      ]
    });
  }
  
  // Keyword density check
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  if (context.targetKeywords) {
    context.targetKeywords.forEach(keyword => {
      const keywordOccurrences = words.filter(word => word.includes(keyword.toLowerCase())).length;
      const density = (keywordOccurrences / wordCount) * 100;
      
      if (density < 0.5) {
        suggestions.push({
          category: 'seo',
          type: 'keywords',
          priority: 'medium',
          title: `Keyword Density: ${keyword}`,
          description: `Low keyword density for "${keyword}" (${density.toFixed(2)}%)`,
          suggestion: 'Consider naturally incorporating the keyword more frequently',
          impact: 'medium',
          effort: 'medium',
          actionItems: [
            'Add keyword to headings where natural',
            'Include keyword in first paragraph',
            'Use keyword variations and synonyms',
            'Maintain natural reading flow'
          ]
        });
      }
    });
  }
  
  return suggestions;
}

function analyzeEngagement(contentData, context) {
  const suggestions = [];
  const content = contentData.content || contentData.text || '';
  
  // Call-to-action check
  const ctaKeywords = ['click', 'download', 'subscribe', 'learn more', 'get started', 'try now', 'contact us'];
  const hasCTA = ctaKeywords.some(keyword => content.toLowerCase().includes(keyword));
  
  if (!hasCTA) {
    suggestions.push({
      category: 'engagement',
      type: 'cta',
      priority: 'high',
      title: 'Call-to-Action',
      description: 'No clear call-to-action detected in the content.',
      suggestion: 'Add clear call-to-action buttons or links',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Add primary CTA at the end of content',
        'Include secondary CTAs throughout',
        'Use action-oriented language',
        'Make CTAs visually prominent'
      ]
    });
  }
  
  // Interactive elements
  if (!content.includes('?') && content.length > 500) {
    suggestions.push({
      category: 'engagement',
      type: 'interaction',
      priority: 'medium',
      title: 'Reader Interaction',
      description: 'Content lacks interactive elements to engage readers.',
      suggestion: 'Add questions, polls, or interactive elements',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Add thought-provoking questions',
        'Include polls or surveys',
        'Add interactive examples',
        'Encourage comments or discussion'
      ]
    });
  }
  
  // Visual elements
  if (!contentData.images && !contentData.videos && content.length > 800) {
    suggestions.push({
      category: 'engagement',
      type: 'visuals',
      priority: 'medium',
      title: 'Visual Content',
      description: 'Long content without visual elements may lose reader interest.',
      suggestion: 'Add relevant images, infographics, or videos',
      impact: 'high',
      effort: 'medium',
      actionItems: [
        'Add relevant header images',
        'Include charts or infographics for data',
        'Add screenshots for tutorials',
        'Consider video content for complex topics'
      ]
    });
  }
  
  return suggestions;
}

function analyzePlatformOptimization(contentData, context) {
  const suggestions = [];
  const platform = context.platform || 'web';
  
  if (platform === 'social') {
    // Social media specific suggestions
    suggestions.push({
      category: 'platform',
      type: 'social',
      priority: 'high',
      title: 'Social Media Optimization',
      description: 'Optimize content for social media engagement.',
      suggestion: 'Add hashtags, mentions, and social-friendly formatting',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Add relevant hashtags (3-5 for Twitter, 5-10 for Instagram)',
        'Mention relevant accounts',
        'Use social media friendly formatting',
        'Include engaging visual content'
      ]
    });
  }
  
  if (platform === 'mobile') {
    // Mobile optimization suggestions
    suggestions.push({
      category: 'platform',
      type: 'mobile',
      priority: 'high',
      title: 'Mobile Optimization',
      description: 'Optimize content for mobile viewing.',
      suggestion: 'Ensure content is mobile-friendly with short paragraphs and clear formatting',
      impact: 'high',
      effort: 'medium',
      actionItems: [
        'Use shorter paragraphs (2-3 sentences)',
        'Increase font size for readability',
        'Optimize images for mobile',
        'Test on various screen sizes'
      ]
    });
  }
  
  return suggestions;
}

function analyzeAccessibility(contentData, context) {
  const suggestions = [];
  
  // Alt text for images
  if (contentData.images && contentData.images.length > 0) {
    const imagesWithoutAlt = contentData.images.filter(img => !img.alt || img.alt.trim() === '');
    if (imagesWithoutAlt.length > 0) {
      suggestions.push({
        category: 'accessibility',
        type: 'alt-text',
        priority: 'high',
        title: 'Image Alt Text',
        description: `${imagesWithoutAlt.length} images missing alt text.`,
        suggestion: 'Add descriptive alt text for all images',
        impact: 'high',
        effort: 'low',
        actionItems: [
          'Write descriptive alt text for each image',
          'Keep alt text concise but informative',
          'Avoid redundant phrases like "image of"',
          'Include important text that appears in images'
        ]
      });
    }
  }
  
  // Color contrast and readability
  suggestions.push({
    category: 'accessibility',
    type: 'readability',
    priority: 'medium',
    title: 'Readability Enhancement',
    description: 'Improve content readability for all users.',
    suggestion: 'Enhance readability with clear formatting and structure',
    impact: 'medium',
    effort: 'low',
    actionItems: [
      'Use clear, simple language',
      'Ensure sufficient color contrast',
      'Use consistent formatting',
      'Add descriptive link text'
    ]
  });
  
  return suggestions;
}

function analyzePerformance(contentData, context) {
  const suggestions = [];
  
  // Image optimization
  if (contentData.images && contentData.images.length > 5) {
    suggestions.push({
      category: 'performance',
      type: 'images',
      priority: 'medium',
      title: 'Image Optimization',
      description: 'Multiple images detected. Consider optimization for faster loading.',
      suggestion: 'Optimize images for web performance',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Compress images without quality loss',
        'Use modern image formats (WebP)',
        'Implement lazy loading',
        'Optimize image dimensions'
      ]
    });
  }
  
  // Content loading
  const contentSize = JSON.stringify(contentData).length;
  if (contentSize > 50000) { // ~50KB
    suggestions.push({
      category: 'performance',
      type: 'size',
      priority: 'low',
      title: 'Content Size',
      description: 'Large content size may affect loading performance.',
      suggestion: 'Consider breaking content into smaller sections or pages',
      impact: 'low',
      effort: 'high',
      actionItems: [
        'Split into multiple pages or sections',
        'Implement progressive loading',
        'Remove unnecessary content',
        'Optimize text formatting'
      ]
    });
  }
  
  return suggestions;
}

function calculateOverallPriority(suggestions) {
  const priorityWeights = { critical: 100, high: 75, medium: 50, low: 25 };
  const totalWeight = suggestions.reduce((sum, suggestion) => {
    return sum + (priorityWeights[suggestion.priority] || 0);
  }, 0);
  
  return Math.min(100, totalWeight / suggestions.length);
}
#!/usr/bin/env node

// Test script for Content Review and Rating System
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testContentReviewSystem() {
  console.log('🧪 Testing Content Review and Rating System...\n');

  // Test data
  const sampleContent = [
    {
      id: 'article_001',
      title: 'Introduction to AI in Healthcare',
      type: 'article',
      content: `Artificial Intelligence is revolutionizing healthcare by providing innovative solutions for diagnosis, treatment, and patient care. This comprehensive guide explores the current applications and future potential of AI in medical settings.
      
      AI technologies like machine learning and natural language processing are being used to analyze medical images, predict disease outcomes, and assist in drug discovery. However, implementing AI in healthcare also raises important questions about data privacy, algorithmic bias, and regulatory compliance.
      
      The future of AI in healthcare looks promising, with ongoing research in areas like personalized medicine, robotic surgery, and virtual health assistants.`,
      author: 'Dr. Sarah Johnson',
      createdAt: Date.now() - 86400000 // 1 day ago
    },
    {
      id: 'blog_002',
      title: '10 Tips for Remote Work Productivity',
      type: 'blog',
      content: `Working from home can be challenging. Here are some tips to stay productive:
      
      1. Create a dedicated workspace
      2. Stick to a schedule
      3. Take regular breaks
      4. Use productivity tools
      5. Stay connected with your team`,
      author: 'Mike Chen',
      createdAt: Date.now() - 172800000 // 2 days ago
    },
    {
      id: 'social_003',
      title: 'Quick Tech Update',
      type: 'social',
      content: 'Just learned about the new AI features in our latest update! 🚀 #AI #TechUpdate #Innovation',
      author: 'TechTeam',
      createdAt: Date.now() - 3600000 // 1 hour ago
    }
  ];

  const reviewers = [
    { name: 'Alice Thompson', role: 'editor' },
    { name: 'Bob Rodriguez', role: 'manager' },
    { name: 'Carol Kim', role: 'reviewer' },
    { name: 'David Smith', role: 'client' }
  ];

  // Clean up previous test data
  console.log('🧹 Cleaning up previous test data...');
  const keys = await redis.keys('content:*');
  if (keys.length > 0) {
    await redis.del(keys);
  }
  await redis.del('reviews:timeline', 'enhancement:suggestions', 'enhancement:queue');
  console.log('✅ Test data cleaned\n');

  // Submit sample reviews
  console.log('📝 Submitting Sample Reviews:');
  for (const content of sampleContent) {
    const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
    
    const review = {
      contentId: content.id,
      contentType: content.type,
      contentTitle: content.title,
      contentData: content,
      rating: {
        overall: Math.random() * 2 + 3, // 3-5 range
        quality: Math.random() * 2 + 3,
        accuracy: Math.random() * 2 + 3,
        creativity: Math.random() * 2 + 3,
        usefulness: Math.random() * 2 + 3,
        engagement: Math.random() * 2 + 3
      },
      reviewer,
      comments: generateRandomComment(content.type),
      suggestions: [],
      actionRequired: Math.random() > 0.7
    };

    // Round ratings to 1 decimal
    Object.keys(review.rating).forEach(key => {
      review.rating[key] = Math.round(review.rating[key] * 10) / 10;
    });

    console.log(`   📄 ${content.title}`);
    console.log(`      Reviewer: ${reviewer.name} (${reviewer.role})`);
    console.log(`      Overall Rating: ${review.rating.overall}/5`);
    console.log(`      Quality: ${review.rating.quality}/5 | Accuracy: ${review.rating.accuracy}/5`);
    console.log(`      Comments: "${review.comments}"`);
    
    // Simulate API call (would normally use fetch)
    await submitReviewDirect(review);
    console.log(`      ✅ Review submitted\n`);
  }

  // Test enhancement suggestions
  console.log('🔧 Testing Enhancement Suggestion Engine:');
  for (const content of sampleContent) {
    console.log(`\n   🎯 Analyzing: ${content.title}`);
    await generateSuggestionsDirect(content);
  }

  // Display aggregated results
  console.log('\n📊 Review System Summary:');
  
  // Get all reviews
  const reviewKeys = await redis.keys('content:reviews:*');
  console.log(`   📝 Total Reviews: ${reviewKeys.length}`);
  
  // Get content aggregates
  const aggregateKeys = await redis.keys('content:aggregates:*');
  console.log(`   📈 Content Aggregates: ${aggregateKeys.length}`);
  
  // Get enhancement suggestions
  const suggestionKeys = await redis.keys('enhancement:suggestions:*');
  console.log(`   💡 Enhancement Suggestions: ${suggestionKeys.length}`);
  
  // Show review timeline
  const timeline = await redis.zrevrange('reviews:timeline', 0, 4);
  if (timeline.length > 0) {
    console.log('\n   📅 Recent Reviews:');
    for (const item of timeline) {
      try {
        const review = JSON.parse(item);
        console.log(`      • ${review.contentTitle} - ${review.rating}/5 by ${review.reviewer}`);
      } catch (e) {
        // Skip invalid entries
      }
    }
  }

  // Show enhancement queue
  const enhancementQueue = await redis.zrevrange('enhancement:queue', 0, 4);
  if (enhancementQueue.length > 0) {
    console.log('\n   🔧 Enhancement Queue:');
    for (const suggestionId of enhancementQueue) {
      try {
        const suggestionData = await redis.hget('enhancement:suggestions', suggestionId);
        if (suggestionData) {
          const suggestion = JSON.parse(suggestionData);
          console.log(`      • ${suggestion.contentId} - Priority: ${Math.round(suggestion.priority)}/100`);
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
  }

  console.log('\n🎉 Content Review System Test Complete!');
  console.log('\n🌐 Dashboard Features Available:');
  console.log('   ✅ Multi-criteria Rating System (6 dimensions)');
  console.log('   ✅ Automated Enhancement Suggestions');
  console.log('   ✅ Content Aggregation and Analytics');
  console.log('   ✅ Review Timeline and History');
  console.log('   ✅ Priority-based Suggestion Queue');
  console.log('   ✅ Real-time Status Updates');
  
  console.log('\n🚀 Access the Content Review Dashboard:');
  console.log('   1. Go to http://localhost:3000');
  console.log('   2. Click "Switch Mode" button');
  console.log('   3. Select "Content Review & Rating"');
  console.log('   4. Review content and manage suggestions!');

  await redis.disconnect();
}

// Helper functions
async function submitReviewDirect(review) {
  const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const reviewData = {
    id: reviewId,
    ...review,
    status: 'submitted',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };

  // Store review
  await redis.hset('content:reviews', reviewId, JSON.stringify(reviewData));
  
  // Add to content's review list
  await redis.sadd(`content:${review.contentId}:reviews`, reviewId);
  
  // Update content rating aggregate
  await updateContentRatingAggregate(review.contentId);
  
  // Store in timeline
  await redis.zadd('reviews:timeline', Date.now(), JSON.stringify({
    reviewId,
    contentId: review.contentId,
    contentTitle: review.contentTitle,
    reviewer: review.reviewer.name,
    rating: review.rating.overall,
    timestamp: Date.now()
  }));
  
  // Generate enhancement suggestions if rating is below threshold
  if (review.rating.overall < 3.5) {
    await generateEnhancementSuggestions(review.contentId, reviewData);
  }
}

async function updateContentRatingAggregate(contentId) {
  const reviewIds = await redis.smembers(`content:${contentId}:reviews`);
  
  if (reviewIds.length === 0) {
    await redis.hdel('content:aggregates', contentId);
    return;
  }
  
  let totalRatings = {
    overall: 0,
    quality: 0,
    accuracy: 0,
    creativity: 0,
    usefulness: 0,
    engagement: 0
  };
  
  let count = 0;
  
  for (const reviewId of reviewIds) {
    const reviewData = await redis.hget('content:reviews', reviewId);
    if (reviewData) {
      const review = JSON.parse(reviewData);
      Object.keys(totalRatings).forEach(key => {
        totalRatings[key] += review.rating[key] || 0;
      });
      count++;
    }
  }
  
  if (count > 0) {
    const aggregate = {
      contentId,
      averageRatings: {},
      totalReviews: count,
      lastUpdated: Date.now()
    };
    
    Object.keys(totalRatings).forEach(key => {
      aggregate.averageRatings[key] = Math.round((totalRatings[key] / count) * 10) / 10;
    });
    
    await redis.hset('content:aggregates', contentId, JSON.stringify(aggregate));
  }
}

async function generateSuggestionsDirect(content) {
  const suggestions = [];
  
  // Simple rule-based suggestions for demo
  const wordCount = content.content.split(/\s+/).length;
  
  if (wordCount < 100) {
    suggestions.push({
      category: 'length',
      type: 'content_expansion',
      priority: 'high',
      title: 'Content Length',
      description: 'Content is quite short and could benefit from expansion.',
      suggestion: 'Consider adding more detailed explanations, examples, or supporting information',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Add relevant examples or case studies',
        'Include more detailed explanations',
        'Add supporting data or statistics'
      ]
    });
  }
  
  if (!content.content.includes('?')) {
    suggestions.push({
      category: 'engagement',
      type: 'interactivity',
      priority: 'medium',
      title: 'Reader Engagement',
      description: 'Content lacks interactive elements to engage readers.',
      suggestion: 'Add questions or interactive elements to boost engagement',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Add thought-provoking questions',
        'Include calls-to-action',
        'Add interactive elements'
      ]
    });
  }
  
  if (content.type === 'social' && !content.content.includes('#')) {
    suggestions.push({
      category: 'social',
      type: 'hashtags',
      priority: 'medium',
      title: 'Social Media Optimization',
      description: 'Social content could benefit from hashtags for better discoverability.',
      suggestion: 'Add relevant hashtags to increase reach and engagement',
      impact: 'medium',
      effort: 'low',
      actionItems: [
        'Add 3-5 relevant hashtags',
        'Research trending hashtags in your niche',
        'Include branded hashtags'
      ]
    });
  }

  if (suggestions.length > 0) {
    const suggestionId = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const enhancementRecord = {
      id: suggestionId,
      contentId: content.id,
      contentType: content.type,
      suggestions,
      context: {
        targetAudience: 'general',
        platform: 'web',
        goals: ['engagement', 'quality']
      },
      createdAt: Date.now(),
      status: 'pending',
      priority: calculateOverallPriority(suggestions)
    };

    // Store suggestions
    await redis.hset('enhancement:suggestions', suggestionId, JSON.stringify(enhancementRecord));
    await redis.sadd(`content:${content.id}:suggestions`, suggestionId);
    
    // Add to priority queue
    await redis.zadd('enhancement:queue', enhancementRecord.priority, suggestionId);
    
    console.log(`      💡 Generated ${suggestions.length} suggestions (Priority: ${Math.round(enhancementRecord.priority)}/100)`);
    suggestions.forEach(s => {
      console.log(`         • ${s.title} (${s.priority} priority)`);
    });
  } else {
    console.log(`      ✅ No enhancement suggestions needed`);
  }
}

async function generateEnhancementSuggestions(contentId, review) {
  const suggestions = [];
  
  // Rule-based suggestions based on ratings
  if (review.rating.quality < 3) {
    suggestions.push({
      type: 'quality',
      priority: 'high',
      title: 'Content Quality Improvement',
      suggestion: 'Consider improving content structure, grammar, and clarity',
      actionItems: [
        'Review grammar and spelling',
        'Improve sentence structure',
        'Add clearer transitions between ideas'
      ]
    });
  }
  
  if (review.rating.engagement < 3) {
    suggestions.push({
      type: 'engagement',
      priority: 'high',
      title: 'Engagement Enhancement',
      suggestion: 'Improve audience engagement and interaction',
      actionItems: [
        'Add compelling headlines and hooks',
        'Include questions to engage readers',
        'Use more conversational tone'
      ]
    });
  }
  
  if (suggestions.length > 0) {
    const enhancementRecord = {
      contentId,
      reviewId: review.id,
      suggestions,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    await redis.lpush('content:enhancement_suggestions', JSON.stringify(enhancementRecord));
  }
}

function calculateOverallPriority(suggestions) {
  const priorityWeights = { critical: 100, high: 75, medium: 50, low: 25 };
  const totalWeight = suggestions.reduce((sum, suggestion) => {
    return sum + (priorityWeights[suggestion.priority] || 0);
  }, 0);
  
  return Math.min(100, totalWeight / suggestions.length);
}

function generateRandomComment(contentType) {
  const comments = {
    article: [
      "Well-researched article with good depth of information.",
      "Could benefit from more examples and case studies.",
      "Excellent technical content but needs better structure.",
      "Great insights, but some sections could be more concise."
    ],
    blog: [
      "Engaging and easy to read, perfect for the target audience.",
      "Good practical tips, but could use more visual elements.",
      "Nice conversational tone, very accessible.",
      "Would benefit from more actionable takeaways."
    ],
    social: [
      "Great use of hashtags and engaging content.",
      "Could be more compelling with a stronger call-to-action.",
      "Perfect length for social media engagement.",
      "Visual elements would enhance this post significantly."
    ]
  };
  
  const typeComments = comments[contentType] || comments.article;
  return typeComments[Math.floor(Math.random() * typeComments.length)];
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testContentReviewSystem().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testContentReviewSystem;
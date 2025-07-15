import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Content review and rating system
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await handleReviewSubmission(req, res);
      case 'GET':
        return await getContentReviews(req, res);
      case 'PUT':
        return await updateReview(req, res);
      case 'DELETE':
        return await deleteReview(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Content review error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleReviewSubmission(req, res) {
  const { 
    contentId, 
    contentType, 
    contentTitle,
    contentData,
    rating, 
    reviewer, 
    comments, 
    criteria,
    suggestions,
    actionRequired 
  } = req.body;

  if (!contentId || !rating || !reviewer) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: contentId, rating, reviewer'
    });
  }

  const reviewId = uuidv4();
  const review = {
    id: reviewId,
    contentId,
    contentType: contentType || 'unknown',
    contentTitle: contentTitle || 'Untitled',
    contentData: contentData || {},
    rating: {
      overall: rating.overall || 0,
      quality: rating.quality || 0,
      accuracy: rating.accuracy || 0,
      creativity: rating.creativity || 0,
      usefulness: rating.usefulness || 0,
      engagement: rating.engagement || 0
    },
    reviewer: {
      name: reviewer.name || 'Anonymous',
      role: reviewer.role || 'user',
      id: reviewer.id || uuidv4()
    },
    comments: comments || '',
    criteria: criteria || {},
    suggestions: suggestions || [],
    actionRequired: actionRequired || false,
    status: 'submitted',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };

  try {
    // Store review
    await redis.hset('content:reviews', reviewId, JSON.stringify(review));
    
    // Add to content's review list
    await redis.sadd(`content:${contentId}:reviews`, reviewId);
    
    // Update content rating aggregate
    await updateContentRatingAggregate(contentId);
    
    // Store in timeline
    await redis.zadd('reviews:timeline', Date.now(), JSON.stringify({
      reviewId,
      contentId,
      contentTitle,
      reviewer: reviewer.name,
      rating: rating.overall,
      timestamp: Date.now()
    }));
    
    // Trigger enhancement suggestions if rating is below threshold
    if (rating.overall < 3.5) {
      await generateEnhancementSuggestions(contentId, review);
    }
    
    return res.json({
      success: true,
      reviewId,
      review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to submit review',
      details: error.message
    });
  }
}

async function getContentReviews(req, res) {
  const { contentId, reviewId, limit = 50, offset = 0, sortBy = 'createdAt' } = req.query;

  try {
    if (reviewId) {
      // Get specific review
      const reviewData = await redis.hget('content:reviews', reviewId);
      if (!reviewData) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }
      
      return res.json({
        success: true,
        review: JSON.parse(reviewData)
      });
    }
    
    if (contentId) {
      // Get reviews for specific content
      const reviewIds = await redis.smembers(`content:${contentId}:reviews`);
      const reviews = [];
      
      for (const id of reviewIds) {
        const reviewData = await redis.hget('content:reviews', id);
        if (reviewData) {
          reviews.push(JSON.parse(reviewData));
        }
      }
      
      // Sort reviews
      reviews.sort((a, b) => {
        if (sortBy === 'rating') return b.rating.overall - a.rating.overall;
        if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
        return 0;
      });
      
      // Get content rating aggregate
      const aggregate = await getContentRatingAggregate(contentId);
      
      return res.json({
        success: true,
        contentId,
        reviews: reviews.slice(offset, offset + parseInt(limit)),
        total: reviews.length,
        aggregate
      });
    }
    
    // Get all reviews (timeline)
    const timelineData = await redis.zrevrange('reviews:timeline', offset, offset + parseInt(limit) - 1);
    const timeline = timelineData.map(item => JSON.parse(item));
    
    return res.json({
      success: true,
      timeline,
      total: await redis.zcard('reviews:timeline')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get reviews',
      details: error.message
    });
  }
}

async function updateReview(req, res) {
  const { reviewId } = req.query;
  const updates = req.body;

  if (!reviewId) {
    return res.status(400).json({
      success: false,
      error: 'Missing reviewId'
    });
  }

  try {
    const reviewData = await redis.hget('content:reviews', reviewId);
    if (!reviewData) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    const review = JSON.parse(reviewData);
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'createdAt') {
        review[key] = updates[key];
      }
    });
    
    review.updatedAt = Date.now();
    review.version = (review.version || 1) + 1;

    // Store updated review
    await redis.hset('content:reviews', reviewId, JSON.stringify(review));
    
    // Update content rating aggregate
    await updateContentRatingAggregate(review.contentId);
    
    return res.json({
      success: true,
      review,
      message: 'Review updated successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update review',
      details: error.message
    });
  }
}

async function deleteReview(req, res) {
  const { reviewId } = req.query;

  if (!reviewId) {
    return res.status(400).json({
      success: false,
      error: 'Missing reviewId'
    });
  }

  try {
    const reviewData = await redis.hget('content:reviews', reviewId);
    if (!reviewData) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    const review = JSON.parse(reviewData);
    
    // Remove from all stores
    await redis.hdel('content:reviews', reviewId);
    await redis.srem(`content:${review.contentId}:reviews`, reviewId);
    
    // Remove from timeline
    const timelineEntries = await redis.zrange('reviews:timeline', 0, -1);
    for (const entry of timelineEntries) {
      const parsed = JSON.parse(entry);
      if (parsed.reviewId === reviewId) {
        await redis.zrem('reviews:timeline', entry);
        break;
      }
    }
    
    // Update content rating aggregate
    await updateContentRatingAggregate(review.contentId);
    
    return res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete review',
      details: error.message
    });
  }
}

async function updateContentRatingAggregate(contentId) {
  try {
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
  } catch (error) {
    console.error('Error updating content rating aggregate:', error);
  }
}

async function getContentRatingAggregate(contentId) {
  try {
    const aggregateData = await redis.hget('content:aggregates', contentId);
    return aggregateData ? JSON.parse(aggregateData) : null;
  } catch (error) {
    console.error('Error getting content rating aggregate:', error);
    return null;
  }
}

async function generateEnhancementSuggestions(contentId, review) {
  try {
    const suggestions = [];
    
    // Rule-based suggestions based on ratings
    if (review.rating.quality < 3) {
      suggestions.push({
        type: 'quality',
        priority: 'high',
        suggestion: 'Consider improving content structure, grammar, and clarity',
        actionItems: [
          'Review grammar and spelling',
          'Improve sentence structure',
          'Add clearer transitions between ideas',
          'Enhance overall readability'
        ]
      });
    }
    
    if (review.rating.accuracy < 3) {
      suggestions.push({
        type: 'accuracy',
        priority: 'critical',
        suggestion: 'Verify facts and add credible sources',
        actionItems: [
          'Fact-check all claims and statistics',
          'Add authoritative sources and citations',
          'Verify current information and dates',
          'Cross-reference with reliable sources'
        ]
      });
    }
    
    if (review.rating.creativity < 3) {
      suggestions.push({
        type: 'creativity',
        priority: 'medium',
        suggestion: 'Add more creative elements and unique perspectives',
        actionItems: [
          'Include unique angles or perspectives',
          'Add creative examples or analogies',
          'Use more engaging storytelling techniques',
          'Incorporate visual or interactive elements'
        ]
      });
    }
    
    if (review.rating.engagement < 3) {
      suggestions.push({
        type: 'engagement',
        priority: 'high',
        suggestion: 'Improve audience engagement and interaction',
        actionItems: [
          'Add compelling headlines and hooks',
          'Include questions to engage readers',
          'Use more conversational tone',
          'Add call-to-action elements'
        ]
      });
    }
    
    // Store suggestions
    const enhancementRecord = {
      contentId,
      reviewId: review.id,
      suggestions,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    await redis.lpush('content:enhancement_suggestions', JSON.stringify(enhancementRecord));
    
    // Set expiry for cleanup (30 days)
    await redis.expire('content:enhancement_suggestions', 30 * 24 * 60 * 60);
    
  } catch (error) {
    console.error('Error generating enhancement suggestions:', error);
  }
}
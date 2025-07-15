import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method } = req;
  
  try {
    switch (method) {
      case 'POST':
        return await assignTask(req, res);
        
      case 'GET':
        return await getTaskAssignments(req, res);
        
      case 'PUT':
        return await updateTaskAssignment(req, res);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in task assignment API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function assignTask(req, res) {
  try {
    const { agentId, task, priority = 'normal', deadline, dependencies } = req.body;
    
    if (!agentId || !task) {
      return res.status(400).json({ error: 'Agent ID and task are required' });
    }

    const taskId = uuidv4();
    const assignmentData = {
      id: taskId,
      agentId,
      task: JSON.stringify(task),
      priority,
      status: 'assigned',
      deadline: deadline || null,
      dependencies: JSON.stringify(dependencies || []),
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDuration: calculateEstimatedDuration(task, priority),
      retryCount: '0'
    };

    // Store the task assignment
    await redis.hmset(`task-assignment:${taskId}`, assignmentData);
    
    // Add to agent's task queue
    await redis.lpush(`agent-tasks:${agentId}`, taskId);
    
    // Update agent status
    await redis.hset(`agent:${agentId}`, 'current_task', task.type || 'assigned');
    await redis.hset(`agent:${agentId}`, 'status', 'working');
    
    // Notify agent via pub/sub
    await redis.publish(`agent:tasks:${agentId}`, JSON.stringify({
      action: 'new_task',
      taskId,
      task,
      priority,
      deadline
    }));

    // Log assignment for analytics
    await redis.lpush('task-assignments-log', JSON.stringify({
      taskId,
      agentId,
      action: 'assigned',
      timestamp: new Date().toISOString(),
      priority,
      taskType: task.type
    }));

    res.status(201).json({
      success: true,
      taskId,
      assignment: assignmentData,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
}

async function getTaskAssignments(req, res) {
  try {
    const { agentId, status, limit = 50 } = req.query;
    
    let assignmentKeys;
    if (agentId) {
      assignmentKeys = await redis.keys(`task-assignment:*`);
      // Filter by agent in memory for simplicity (could be optimized with agent-specific keys)
    } else {
      assignmentKeys = await redis.keys(`task-assignment:*`);
    }

    const assignments = [];
    for (const key of assignmentKeys.slice(0, limit)) {
      const assignmentData = await redis.hgetall(key);
      if (assignmentData.id) {
        const assignment = {
          id: assignmentData.id,
          agentId: assignmentData.agentId,
          task: JSON.parse(assignmentData.task || '{}'),
          priority: assignmentData.priority,
          status: assignmentData.status,
          deadline: assignmentData.deadline,
          dependencies: JSON.parse(assignmentData.dependencies || '[]'),
          assignedAt: assignmentData.assignedAt,
          updatedAt: assignmentData.updatedAt,
          completedAt: assignmentData.completedAt,
          estimatedDuration: assignmentData.estimatedDuration,
          actualDuration: assignmentData.actualDuration,
          retryCount: parseInt(assignmentData.retryCount || '0'),
          result: assignmentData.result ? JSON.parse(assignmentData.result) : null
        };

        // Filter by agentId if specified
        if (!agentId || assignment.agentId === agentId) {
          // Filter by status if specified
          if (!status || assignment.status === status) {
            assignments.push(assignment);
          }
        }
      }
    }

    // Sort by assignment time (most recent first)
    assignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

    res.status(200).json({
      success: true,
      assignments,
      count: assignments.length,
      filters: { agentId, status, limit }
    });
  } catch (error) {
    console.error('Error getting task assignments:', error);
    res.status(500).json({ error: 'Failed to get task assignments' });
  }
}

async function updateTaskAssignment(req, res) {
  try {
    const { taskId, status, result, actualDuration, notes } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const assignmentKey = `task-assignment:${taskId}`;
    const existingAssignment = await redis.hgetall(assignmentKey);
    
    if (!existingAssignment.id) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      
      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
        
        // Calculate actual duration if not provided
        if (!actualDuration && existingAssignment.assignedAt) {
          const assignedTime = new Date(existingAssignment.assignedAt);
          const completedTime = new Date();
          updates.actualDuration = Math.round((completedTime - assignedTime) / 1000); // in seconds
        } else if (actualDuration) {
          updates.actualDuration = actualDuration.toString();
        }
        
        // Update agent status back to idle
        await redis.hset(`agent:${existingAssignment.agentId}`, 'status', 'idle');
        await redis.hset(`agent:${existingAssignment.agentId}`, 'current_task', 'idle');
        
        // Remove from agent's task queue
        await redis.lrem(`agent-tasks:${existingAssignment.agentId}`, 1, taskId);
      } else if (status === 'failed') {
        const retryCount = parseInt(existingAssignment.retryCount || '0') + 1;
        updates.retryCount = retryCount.toString();
        
        // If max retries not reached, mark for retry
        if (retryCount < 3) {
          updates.status = 'retry';
          // Re-add to agent queue for retry
          await redis.lpush(`agent-tasks:${existingAssignment.agentId}`, taskId);
        } else {
          // Max retries reached, mark as permanently failed
          updates.status = 'permanently_failed';
          await redis.hset(`agent:${existingAssignment.agentId}`, 'status', 'idle');
          await redis.hset(`agent:${existingAssignment.agentId}`, 'current_task', 'idle');
        }
      }
    }

    if (result) {
      updates.result = JSON.stringify(result);
    }

    if (notes) {
      updates.notes = notes;
    }

    await redis.hmset(assignmentKey, updates);

    // Log status change for analytics
    await redis.lpush('task-assignments-log', JSON.stringify({
      taskId,
      agentId: existingAssignment.agentId,
      action: 'status_changed',
      oldStatus: existingAssignment.status,
      newStatus: status,
      timestamp: new Date().toISOString()
    }));

    res.status(200).json({
      success: true,
      message: 'Task assignment updated successfully'
    });
  } catch (error) {
    console.error('Error updating task assignment:', error);
    res.status(500).json({ error: 'Failed to update task assignment' });
  }
}

function calculateEstimatedDuration(task, priority) {
  // Simple estimation based on task type and priority
  const baseMinutes = {
    'code-review': 30,
    'content-creation': 45,
    'data-analysis': 60,
    'research': 90,
    'qa-testing': 40,
    'creative-brainstorm': 25,
    'generic': 30
  };

  const priorityMultiplier = {
    'critical': 0.8, // Rush job, might be faster but less thorough
    'high': 1.0,
    'normal': 1.2,
    'low': 1.5
  };

  const base = baseMinutes[task.type] || baseMinutes.generic;
  const multiplier = priorityMultiplier[priority] || 1.0;
  
  return Math.round(base * multiplier * 60); // Return in seconds
}
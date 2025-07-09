import * as tf from '@tensorflow/tfjs';
import * as ml5 from 'ml5';

class MLPredictionService {
  constructor() {
    this.models = new Map();
    this.modelCache = new Map();
    this.trainingHistory = [];
    this.performanceMetrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0
    };
  }

  async initialize() {
    // Load pre-trained models if available
    await this.loadPretrainedModels();
    
    // Initialize feature extractors
    this.featureExtractor = await ml5.featureExtractor('MobileNet', () => {
      console.log('Feature extractor loaded');
    });
    
    // Set up model persistence
    this.setupModelPersistence();
  }

  async loadPretrainedModels() {
    try {
      // Load task completion model
      const taskModel = await tf.loadLayersModel('/models/task-completion/model.json');
      this.models.set('task-completion', taskModel);
      
      // Load resource usage model
      const resourceModel = await tf.loadLayersModel('/models/resource-usage/model.json');
      this.models.set('resource-usage', resourceModel);
      
      // Load anomaly detection model
      const anomalyModel = await tf.loadLayersModel('/models/anomaly-detection/model.json');
      this.models.set('anomaly-detection', anomalyModel);
    } catch (error) {
      console.log('No pre-trained models found, will train from scratch');
    }
  }

  setupModelPersistence() {
    // Auto-save models every hour
    setInterval(async () => {
      await this.saveModels();
    }, 3600000);
  }

  async saveModels() {
    for (const [name, model] of this.models) {
      try {
        await model.save(`indexeddb://ez-aigent-${name}-model`);
        console.log(`Saved model: ${name}`);
      } catch (error) {
        console.error(`Error saving model ${name}:`, error);
      }
    }
  }

  async trainPredictionModel(trainingData, options = {}) {
    const {
      modelType = 'task-completion',
      epochs = 100,
      batchSize = 32,
      validationSplit = 0.2,
      learningRate = 0.001,
      callbacks = {}
    } = options;

    // Prepare data
    const { features, labels, featureNames } = this.prepareTrainingData(trainingData);
    
    // Create or get existing model
    let model = this.models.get(modelType);
    if (!model) {
      model = this.createModel(modelType, features.shape[1]);
    }
    
    // Custom callbacks
    const trainingCallbacks = {
      onEpochEnd: (epoch, logs) => {
        this.trainingHistory.push({ epoch, ...logs });
        if (callbacks.onProgress) {
          callbacks.onProgress({
            epoch,
            loss: logs.loss,
            accuracy: logs.acc || logs.mae,
            validationLoss: logs.val_loss,
            validationAccuracy: logs.val_acc || logs.val_mae
          });
        }
      },
      onTrainEnd: () => {
        this.updatePerformanceMetrics(model, features, labels);
        if (callbacks.onComplete) {
          callbacks.onComplete(this.performanceMetrics);
        }
      }
    };

    // Train model
    const history = await model.fit(features, labels, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: trainingCallbacks,
      shuffle: true
    });

    // Save trained model
    this.models.set(modelType, model);
    await this.saveModels();

    // Cleanup tensors
    features.dispose();
    labels.dispose();

    return {
      model,
      history: history.history,
      metrics: this.performanceMetrics
    };
  }

  createModel(modelType, inputShape) {
    const models = {
      'task-completion': () => this.createTaskCompletionModel(inputShape),
      'resource-usage': () => this.createResourceUsageModel(inputShape),
      'anomaly-detection': () => this.createAnomalyDetectionModel(inputShape),
      'agent-performance': () => this.createAgentPerformanceModel(inputShape)
    };

    const createFn = models[modelType] || models['task-completion'];
    return createFn();
  }

  createTaskCompletionModel(inputShape) {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 128,
          activation: 'relu',
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  createResourceUsageModel(inputShape) {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 64,
          returnSequences: true,
          inputShape: [10, inputShape] // 10 time steps
        }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4, // CPU, Memory, Disk, Network
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    });

    return model;
  }

  createAnomalyDetectionModel(inputShape) {
    // Autoencoder for anomaly detection
    const encoder = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        })
      ]
    });

    const decoder = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [16],
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: inputShape,
          activation: 'sigmoid'
        })
      ]
    });

    const input = tf.input({ shape: [inputShape] });
    const encoded = encoder.apply(input);
    const decoded = decoder.apply(encoded);

    const autoencoder = tf.model({ inputs: input, outputs: decoded });

    autoencoder.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return autoencoder;
  }

  createAgentPerformanceModel(inputShape) {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 5, // Performance categories
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  prepareTrainingData(rawData) {
    // Extract features and labels
    const features = [];
    const labels = [];
    const featureNames = [];

    rawData.forEach(item => {
      const featureVector = this.extractFeatures(item);
      const label = this.extractLabel(item);
      
      if (featureVector && label !== null) {
        features.push(featureVector);
        labels.push(label);
      }
    });

    // Convert to tensors
    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor2d(labels.map(l => [l]));

    // Normalize features
    const { normalized, mean, variance } = this.normalizeFeatures(featureTensor);
    
    // Cache normalization parameters
    this.modelCache.set('normalization', { mean, variance });

    return {
      features: normalized,
      labels: labelTensor,
      featureNames: this.getFeatureNames()
    };
  }

  extractFeatures(item) {
    return [
      item.agentType || 0,
      item.taskComplexity || 0,
      item.queueDepth || 0,
      item.cpuUsage || 0,
      item.memoryUsage || 0,
      item.networkLatency || 0,
      item.timeOfDay || 0,
      item.dayOfWeek || 0,
      item.previousTaskTime || 0,
      item.agentExperience || 0,
      item.concurrentTasks || 0,
      item.errorRate || 0,
      item.successRate || 0,
      item.avgResponseTime || 0,
      item.taskPriority || 0
    ];
  }

  extractLabel(item) {
    return item.completionTime || item.resourceUsage || item.performanceScore || 0;
  }

  getFeatureNames() {
    return [
      'agentType',
      'taskComplexity',
      'queueDepth',
      'cpuUsage',
      'memoryUsage',
      'networkLatency',
      'timeOfDay',
      'dayOfWeek',
      'previousTaskTime',
      'agentExperience',
      'concurrentTasks',
      'errorRate',
      'successRate',
      'avgResponseTime',
      'taskPriority'
    ];
  }

  normalizeFeatures(features) {
    const mean = features.mean(0);
    const variance = features.sub(mean).square().mean(0);
    const std = variance.sqrt();
    
    const normalized = features.sub(mean).div(std.add(1e-8));
    
    return { normalized, mean, variance };
  }

  async predictTaskCompletion(taskData) {
    const model = this.models.get('task-completion');
    if (!model) {
      throw new Error('Task completion model not loaded');
    }

    const features = this.extractFeatures(taskData);
    const featureTensor = tf.tensor2d([features]);
    
    // Normalize using cached parameters
    const { mean, variance } = this.modelCache.get('normalization') || {};
    let normalizedFeatures = featureTensor;
    
    if (mean && variance) {
      const std = variance.sqrt();
      normalizedFeatures = featureTensor.sub(mean).div(std.add(1e-8));
    }

    const prediction = await model.predict(normalizedFeatures);
    const result = await prediction.data();
    
    // Calculate confidence interval
    const confidence = this.calculatePredictionConfidence(taskData, result[0]);
    
    // Cleanup
    featureTensor.dispose();
    normalizedFeatures.dispose();
    prediction.dispose();

    return {
      predictedTime: result[0],
      confidence,
      factors: this.identifyKeyFactors(taskData, model),
      recommendation: this.generateRecommendation(result[0], taskData)
    };
  }

  calculatePredictionConfidence(taskData, prediction) {
    let confidence = 85; // Base confidence
    
    // Adjust based on data quality
    const dataCompleteness = Object.values(taskData).filter(v => v !== null).length / Object.keys(taskData).length;
    confidence *= dataCompleteness;
    
    // Adjust based on prediction range
    if (prediction < 0 || prediction > 3600) {
      confidence *= 0.7; // Reduce confidence for extreme predictions
    }
    
    // Adjust based on model performance
    confidence *= this.performanceMetrics.accuracy || 0.8;
    
    return Math.max(0, Math.min(100, confidence));
  }

  identifyKeyFactors(taskData, model) {
    const factors = [];
    const featureImportance = this.calculateFeatureImportance(taskData, model);
    
    featureImportance.forEach((importance, index) => {
      const featureName = this.getFeatureNames()[index];
      const value = this.extractFeatures(taskData)[index];
      
      if (importance > 0.1) {
        factors.push({
          factor: featureName,
          value,
          importance,
          impact: importance > 0 ? 'positive' : 'negative'
        });
      }
    });
    
    return factors.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance)).slice(0, 5);
  }

  calculateFeatureImportance(taskData, model) {
    // Simple gradient-based feature importance
    const features = this.extractFeatures(taskData);
    const importance = new Array(features.length).fill(0);
    
    // This is a simplified version - in production, use SHAP or LIME
    features.forEach((value, index) => {
      const perturbedFeatures = [...features];
      perturbedFeatures[index] *= 1.1; // 10% perturbation
      
      const originalPred = this.getPrediction(features, model);
      const perturbedPred = this.getPrediction(perturbedFeatures, model);
      
      importance[index] = (perturbedPred - originalPred) / (0.1 * value + 1e-8);
    });
    
    return importance;
  }

  getPrediction(features, model) {
    const tensor = tf.tensor2d([features]);
    const pred = model.predictSync(tensor);
    const result = pred.dataSync()[0];
    tensor.dispose();
    pred.dispose();
    return result;
  }

  generateRecommendation(predictedTime, taskData) {
    const recommendations = [];
    
    if (predictedTime > 300) {
      recommendations.push('Consider breaking down the task into smaller subtasks');
    }
    
    if (taskData.queueDepth > 50) {
      recommendations.push('Scale up agent pool to reduce queue depth');
    }
    
    if (taskData.cpuUsage > 80) {
      recommendations.push('Optimize CPU-intensive operations or add compute resources');
    }
    
    if (taskData.errorRate > 0.05) {
      recommendations.push('Investigate and fix error sources to improve reliability');
    }
    
    return recommendations.join('. ');
  }

  async updateModelWithFeedback(taskId, actualTime, predictedTime) {
    // Store feedback for online learning
    const feedback = {
      taskId,
      actualTime,
      predictedTime,
      error: Math.abs(actualTime - predictedTime),
      timestamp: new Date().toISOString()
    };
    
    // Add to training buffer
    this.trainingHistory.push(feedback);
    
    // Trigger retraining if enough feedback accumulated
    if (this.trainingHistory.length >= 100) {
      await this.retrainWithFeedback();
    }
  }

  async retrainWithFeedback() {
    console.log('Retraining model with accumulated feedback...');
    // Implementation for online learning
    // This would incrementally update the model with new data
  }

  updatePerformanceMetrics(model, features, labels) {
    const predictions = model.predict(features);
    const actual = labels.dataSync();
    const predicted = predictions.dataSync();
    
    // Calculate metrics
    const mse = tf.losses.meanSquaredError(labels, predictions).dataSync()[0];
    const mae = tf.metrics.meanAbsoluteError(labels, predictions).dataSync()[0];
    
    this.performanceMetrics = {
      accuracy: 1 - (mae / (actual.reduce((a, b) => a + b) / actual.length)),
      mse,
      mae,
      r2Score: this.calculateR2Score(actual, predicted)
    };
    
    predictions.dispose();
  }

  calculateR2Score(actual, predicted) {
    const actualMean = actual.reduce((a, b) => a + b) / actual.length;
    const totalSS = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSS = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    
    return 1 - (residualSS / totalSS);
  }

  getModelMetrics() {
    return {
      ...this.performanceMetrics,
      trainingHistory: this.trainingHistory.slice(-100),
      modelCount: this.models.size,
      lastTrainingDate: this.trainingHistory[this.trainingHistory.length - 1]?.timestamp
    };
  }

  async exportModel(modelType, format = 'tfjs') {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }

    if (format === 'tfjs') {
      await model.save('downloads://ez-aigent-' + modelType);
    } else if (format === 'onnx') {
      // Convert to ONNX format for interoperability
      console.log('ONNX export not yet implemented');
    }
  }

  dispose() {
    // Clean up all models and tensors
    for (const model of this.models.values()) {
      model.dispose();
    }
    this.models.clear();
    this.modelCache.clear();
  }
}

// Singleton instance
let mlPredictionService = null;

export function getMLPredictionService() {
  if (!mlPredictionService) {
    mlPredictionService = new MLPredictionService();
    mlPredictionService.initialize();
  }
  return mlPredictionService;
}

// React hook
export function usePredictionService() {
  const service = getMLPredictionService();
  
  return {
    trainPredictionModel: service.trainPredictionModel.bind(service),
    predictTaskCompletion: service.predictTaskCompletion.bind(service),
    updateModelWithFeedback: service.updateModelWithFeedback.bind(service),
    getModelMetrics: service.getModelMetrics.bind(service),
    exportModel: service.exportModel.bind(service)
  };
}
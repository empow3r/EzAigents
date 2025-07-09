import { useState, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

export function useAnomalyDetection() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [detectionThreshold, setDetectionThreshold] = useState(0.95);
  
  const modelsRef = useRef({
    isolation: null,
    autoencoder: null,
    lstm: null
  });
  
  const historyRef = useRef({
    metrics: [],
    anomalies: [],
    patterns: new Map()
  });

  // Initialize anomaly detection models
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      // Initialize Isolation Forest equivalent
      modelsRef.current.isolation = await createIsolationForest();
      
      // Initialize Autoencoder for pattern detection
      modelsRef.current.autoencoder = await createAutoencoder();
      
      // Initialize LSTM for time series anomalies
      modelsRef.current.lstm = await createLSTMModel();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize anomaly detection:', error);
    }
  }, [isInitialized]);

  // Create Isolation Forest-like model
  const createIsolationForest = async () => {
    // Simplified random forest for anomaly detection
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [15],
          units: 64,
          activation: 'relu',
          kernelInitializer: 'randomNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  };

  // Create Autoencoder for pattern anomalies
  const createAutoencoder = async () => {
    const encoder = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [20],
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4,
          activation: 'relu'
        })
      ]
    });

    const decoder = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [4],
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 20,
          activation: 'sigmoid'
        })
      ]
    });

    const input = tf.input({ shape: [20] });
    const encoded = encoder.apply(input);
    const decoded = decoder.apply(encoded);
    
    const autoencoder = tf.model({
      inputs: input,
      outputs: decoded
    });

    autoencoder.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return autoencoder;
  };

  // Create LSTM for time series anomalies
  const createLSTMModel = async () => {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [10, 5] // 10 time steps, 5 features
        }),
        tf.layers.lstm({
          units: 25,
          returnSequences: false
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  };

  // Main anomaly detection function
  const detectAnomalies = useCallback(async (metrics) => {
    if (!isInitialized) await initialize();
    
    const anomalies = [];
    
    // Statistical anomaly detection
    const statisticalAnomalies = detectStatisticalAnomalies(metrics);
    anomalies.push(...statisticalAnomalies);
    
    // Pattern-based anomaly detection
    if (modelsRef.current.autoencoder) {
      const patternAnomalies = await detectPatternAnomalies(metrics);
      anomalies.push(...patternAnomalies);
    }
    
    // Time series anomaly detection
    if (historyRef.current.metrics.length >= 10) {
      const timeSeriesAnomalies = await detectTimeSeriesAnomalies(metrics);
      anomalies.push(...timeSeriesAnomalies);
    }
    
    // Update history
    historyRef.current.metrics.push(metrics);
    if (historyRef.current.metrics.length > 1000) {
      historyRef.current.metrics = historyRef.current.metrics.slice(-1000);
    }
    
    // Deduplicate and prioritize anomalies
    const uniqueAnomalies = deduplicateAnomalies(anomalies);
    const prioritizedAnomalies = prioritizeAnomalies(uniqueAnomalies);
    
    historyRef.current.anomalies.push(...prioritizedAnomalies);
    
    return prioritizedAnomalies;
  }, [isInitialized, initialize]);

  // Statistical anomaly detection using z-score
  const detectStatisticalAnomalies = (metrics) => {
    const anomalies = [];
    const history = historyRef.current.metrics;
    
    if (history.length < 30) return anomalies;
    
    // Calculate statistics for each metric
    const metricKeys = Object.keys(metrics).filter(key => typeof metrics[key] === 'number');
    
    metricKeys.forEach(key => {
      const values = history.map(m => m[key]).filter(v => v !== undefined);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );
      
      const zScore = Math.abs((metrics[key] - mean) / (std || 1));
      
      if (zScore > 3) {
        anomalies.push({
          type: 'statistical',
          metric: key,
          value: metrics[key],
          expected: mean,
          deviation: zScore,
          severity: zScore > 4 ? 'high' : 'medium',
          description: `${key} is ${zScore.toFixed(1)} standard deviations from mean`
        });
      }
    });
    
    return anomalies;
  };

  // Pattern-based anomaly detection using autoencoder
  const detectPatternAnomalies = async (metrics) => {
    const features = extractFeatures(metrics);
    const inputTensor = tf.tensor2d([features]);
    
    const reconstruction = await modelsRef.current.autoencoder.predict(inputTensor);
    const reconstructionData = await reconstruction.data();
    
    // Calculate reconstruction error
    const error = features.reduce((sum, val, idx) => {
      return sum + Math.pow(val - reconstructionData[idx], 2);
    }, 0) / features.length;
    
    inputTensor.dispose();
    reconstruction.dispose();
    
    const anomalies = [];
    if (error > detectionThreshold) {
      anomalies.push({
        type: 'pattern',
        score: error,
        severity: error > detectionThreshold * 1.5 ? 'high' : 'medium',
        description: 'Unusual pattern detected in system metrics',
        affectedMetrics: identifyAffectedMetrics(features, reconstructionData)
      });
    }
    
    return anomalies;
  };

  // Time series anomaly detection using LSTM
  const detectTimeSeriesAnomalies = async (currentMetrics) => {
    const history = historyRef.current.metrics.slice(-10);
    const timeSeriesData = history.map(m => [
      m.cpuUsage || 0,
      m.memoryUsage || 0,
      m.queueDepth || 0,
      m.errorRate || 0,
      m.throughput || 0
    ]);
    
    const inputTensor = tf.tensor3d([timeSeriesData]);
    const prediction = await modelsRef.current.lstm.predict(inputTensor);
    const anomalyScore = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    const anomalies = [];
    if (anomalyScore[0] > 0.8) {
      anomalies.push({
        type: 'timeseries',
        score: anomalyScore[0],
        severity: anomalyScore[0] > 0.9 ? 'high' : 'medium',
        description: 'Time series anomaly detected in recent metrics',
        trend: identifyTrend(history)
      });
    }
    
    return anomalies;
  };

  // Extract features for ML models
  const extractFeatures = (metrics) => {
    return [
      metrics.cpuUsage || 0,
      metrics.memoryUsage || 0,
      metrics.diskUsage || 0,
      metrics.networkLatency || 0,
      metrics.queueDepth || 0,
      metrics.errorRate || 0,
      metrics.successRate || 0,
      metrics.avgResponseTime || 0,
      metrics.throughput || 0,
      metrics.activeAgents || 0,
      metrics.failedTasks || 0,
      metrics.pendingTasks || 0,
      metrics.taskCompletionRate || 0,
      new Date().getHours(), // Time of day
      new Date().getDay(), // Day of week
      metrics.apiCalls || 0,
      metrics.cacheHitRate || 0,
      metrics.dbConnections || 0,
      metrics.gcPauseTime || 0,
      metrics.heapUsage || 0
    ];
  };

  // Identify which metrics are affected
  const identifyAffectedMetrics = (original, reconstructed) => {
    const metricNames = [
      'cpuUsage', 'memoryUsage', 'diskUsage', 'networkLatency',
      'queueDepth', 'errorRate', 'successRate', 'avgResponseTime'
    ];
    
    const affected = [];
    original.forEach((val, idx) => {
      const diff = Math.abs(val - reconstructed[idx]);
      if (diff > 0.2 && idx < metricNames.length) {
        affected.push({
          metric: metricNames[idx],
          expected: reconstructed[idx],
          actual: val,
          difference: diff
        });
      }
    });
    
    return affected;
  };

  // Identify trend in time series
  const identifyTrend = (history) => {
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = {
      cpu: average(recent.map(m => m.cpuUsage || 0)),
      memory: average(recent.map(m => m.memoryUsage || 0)),
      errors: average(recent.map(m => m.errorRate || 0))
    };
    
    const olderAvg = {
      cpu: average(older.map(m => m.cpuUsage || 0)),
      memory: average(older.map(m => m.memoryUsage || 0)),
      errors: average(older.map(m => m.errorRate || 0))
    };
    
    return {
      cpu: recentAvg.cpu > olderAvg.cpu * 1.2 ? 'increasing' : 'stable',
      memory: recentAvg.memory > olderAvg.memory * 1.2 ? 'increasing' : 'stable',
      errors: recentAvg.errors > olderAvg.errors * 1.5 ? 'increasing' : 'stable'
    };
  };

  // Analyze pattern in anomalies
  const analyzePattern = useCallback(async (anomaly) => {
    const similarAnomalies = historyRef.current.anomalies.filter(a => 
      a.type === anomaly.type && 
      Math.abs(a.score - anomaly.score) < 0.1
    );
    
    const pattern = {
      frequency: similarAnomalies.length,
      lastOccurrence: similarAnomalies[similarAnomalies.length - 1]?.timestamp,
      periodicity: calculatePeriodicity(similarAnomalies),
      correlation: await findCorrelations(anomaly)
    };
    
    historyRef.current.patterns.set(anomaly.type, pattern);
    
    return pattern;
  }, []);

  // Calculate periodicity of anomalies
  const calculatePeriodicity = (anomalies) => {
    if (anomalies.length < 3) return null;
    
    const timestamps = anomalies.map(a => new Date(a.timestamp).getTime());
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const avgInterval = average(intervals);
    const stdInterval = Math.sqrt(
      intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length
    );
    
    if (stdInterval / avgInterval < 0.3) {
      return {
        type: 'periodic',
        interval: avgInterval,
        unit: avgInterval < 60000 ? 'seconds' : avgInterval < 3600000 ? 'minutes' : 'hours',
        confidence: 1 - (stdInterval / avgInterval)
      };
    }
    
    return { type: 'sporadic' };
  };

  // Find correlations with other metrics
  const findCorrelations = async (anomaly) => {
    const correlations = [];
    const window = 5; // Look at 5 data points before and after
    
    const anomalyIndex = historyRef.current.metrics.findIndex(m => 
      Math.abs(new Date(m.timestamp).getTime() - new Date(anomaly.timestamp).getTime()) < 1000
    );
    
    if (anomalyIndex === -1) return correlations;
    
    const start = Math.max(0, anomalyIndex - window);
    const end = Math.min(historyRef.current.metrics.length, anomalyIndex + window);
    const relevantMetrics = historyRef.current.metrics.slice(start, end);
    
    // Check for correlated spikes
    const metricKeys = Object.keys(relevantMetrics[0]).filter(k => typeof relevantMetrics[0][k] === 'number');
    
    metricKeys.forEach(key => {
      const values = relevantMetrics.map(m => m[key]);
      const correlation = calculateCorrelation(values, anomalyIndex - start);
      
      if (Math.abs(correlation) > 0.7) {
        correlations.push({
          metric: key,
          correlation,
          type: correlation > 0 ? 'positive' : 'negative'
        });
      }
    });
    
    return correlations;
  };

  // Calculate correlation coefficient
  const calculateCorrelation = (values, targetIndex) => {
    const n = values.length;
    const target = values[targetIndex];
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
      sumY2 += values[i] * values[i];
    }
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return correlation;
  };

  // Get root cause analysis
  const getRootCause = useCallback(async (anomaly) => {
    const pattern = await analyzePattern(anomaly);
    const correlations = pattern.correlation || [];
    
    const rootCauses = [];
    
    // Check for resource exhaustion
    if (anomaly.metric === 'cpuUsage' && anomaly.value > 90) {
      rootCauses.push({
        cause: 'CPU exhaustion',
        confidence: 0.9,
        recommendation: 'Scale compute resources or optimize CPU-intensive operations'
      });
    }
    
    // Check for cascading failures
    if (correlations.some(c => c.metric === 'errorRate' && c.correlation > 0.8)) {
      rootCauses.push({
        cause: 'Cascading failure from errors',
        confidence: 0.85,
        recommendation: 'Implement circuit breakers and improve error handling'
      });
    }
    
    // Check for memory leaks
    if (anomaly.metric === 'memoryUsage' && pattern.frequency > 5) {
      rootCauses.push({
        cause: 'Possible memory leak',
        confidence: 0.75,
        recommendation: 'Profile memory usage and check for unreleased resources'
      });
    }
    
    // Check for external dependencies
    if (anomaly.metric === 'networkLatency' && anomaly.value > 1000) {
      rootCauses.push({
        cause: 'External service degradation',
        confidence: 0.8,
        recommendation: 'Check external service health and implement fallbacks'
      });
    }
    
    return rootCauses.sort((a, b) => b.confidence - a.confidence)[0]?.cause || 'Unknown';
  }, [analyzePattern]);

  // Calculate anomaly score
  const getAnomalyScore = useCallback((anomaly) => {
    let score = 0;
    
    // Base score from severity
    const severityScores = { high: 1.0, medium: 0.6, low: 0.3 };
    score = severityScores[anomaly.severity] || 0.5;
    
    // Adjust for type
    const typeMultipliers = {
      statistical: 0.8,
      pattern: 1.0,
      timeseries: 0.9
    };
    score *= typeMultipliers[anomaly.type] || 1.0;
    
    // Adjust for frequency
    const pattern = historyRef.current.patterns.get(anomaly.type);
    if (pattern && pattern.frequency > 10) {
      score *= 0.7; // Reduce score for frequent anomalies
    }
    
    // Adjust for impact
    if (anomaly.affectedMetrics && anomaly.affectedMetrics.length > 3) {
      score *= 1.2; // Increase score for wide impact
    }
    
    return Math.min(1.0, Math.max(0, score));
  }, []);

  // Utility functions
  const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  const deduplicateAnomalies = (anomalies) => {
    const unique = new Map();
    
    anomalies.forEach(anomaly => {
      const key = `${anomaly.type}-${anomaly.metric || 'general'}`;
      if (!unique.has(key) || unique.get(key).score < anomaly.score) {
        unique.set(key, anomaly);
      }
    });
    
    return Array.from(unique.values());
  };
  
  const prioritizeAnomalies = (anomalies) => {
    return anomalies.sort((a, b) => {
      const scoreA = getAnomalyScore(a);
      const scoreB = getAnomalyScore(b);
      return scoreB - scoreA;
    });
  };

  return {
    detectAnomalies,
    analyzePattern,
    getRootCause,
    getAnomalyScore,
    setDetectionThreshold,
    isInitialized
  };
}
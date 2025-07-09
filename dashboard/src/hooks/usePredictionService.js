import { useEffect, useRef } from 'react';
import { getMLPredictionService } from '../services/ml-prediction-service';

export function usePredictionService() {
  const serviceRef = useRef(null);

  useEffect(() => {
    serviceRef.current = getMLPredictionService();
  }, []);

  return {
    trainPredictionModel: (...args) => serviceRef.current?.trainPredictionModel(...args),
    predictTaskCompletion: (...args) => serviceRef.current?.predictTaskCompletion(...args),
    updateModelWithFeedback: (...args) => serviceRef.current?.updateModelWithFeedback(...args),
    getModelMetrics: () => serviceRef.current?.getModelMetrics(),
    exportModel: (...args) => serviceRef.current?.exportModel(...args)
  };
}
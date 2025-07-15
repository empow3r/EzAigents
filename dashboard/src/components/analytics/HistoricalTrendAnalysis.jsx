'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Cell
} from 'recharts';
import { format, subDays, startOfDay, addDays, differenceInDays } from 'date-fns';

const HistoricalTrendAnalysis = ({ refreshInterval = 60000 }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [trendMetrics, setTrendMetrics] = useState({});
  const [forecastData, setForecastData] = useState([]);
  const [anomalyData, setAnomalyData] = useState([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('throughput');
  const [showForecast, setShowForecast] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [loading, setLoading] = useState(true);

  const metrics = {
    throughput: { 
      name: 'Task Throughput', 
      color: '#3B82F6', 
      unit: 'tasks/day',
      baseline: 2000 
    },
    success_rate: { 
      name: 'Success Rate', 
      color: '#10B981', 
      unit: '%',
      baseline: 95 
    },
    response_time: { 
      name: 'Response Time', 
      color: '#F59E0B', 
      unit: 'ms',
      baseline: 250 
    },
    agent_utilization: { 
      name: 'Agent Utilization', 
      color: '#8B5CF6', 
      unit: '%',
      baseline: 75 
    },
    error_rate: { 
      name: 'Error Rate', 
      color: '#EF4444', 
      unit: '%',
      baseline: 2 
    }
  };

  // Generate comprehensive historical data
  const generateHistoricalData = useMemo(() => {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = subDays(startOfDay(now), days);
    
    const data = [];
    const trendsData = {};
    const forecastData = [];
    const anomalies = [];

    // Initialize trend calculations
    Object.keys(metrics).forEach(metricKey => {
      trendsData[metricKey] = {
        current: 0,
        previous: 0,
        trend: 0,
        volatility: 0,
        correlation: 0,
        seasonality: 0
      };
    });

    // Generate daily data points
    for (let i = 0; i <= days; i++) {
      const date = addDays(startDate, i);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const dayOfMonth = date.getDate();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Seasonal patterns
      const weeklyPattern = isWeekend ? 0.6 : 1.0;
      const monthlyPattern = Math.sin((dayOfMonth / 30) * Math.PI) * 0.2 + 1.0;
      const trendPattern = (i / days) * 0.3 + 1.0; // Gradual improvement over time
      
      const entry = {
        date: format(date, 'yyyy-MM-dd'),
        displayDate: format(date, 'MMM dd'),
        timestamp: date.toISOString(),
        dayOfWeek,
        isWeekend
      };

      // Generate realistic metric values with patterns
      Object.entries(metrics).forEach(([metricKey, metricConfig]) => {
        const baseline = metricConfig.baseline;
        const randomVariation = (Math.random() - 0.5) * 0.3;
        
        let value;
        switch (metricKey) {
          case 'throughput':
            value = baseline * weeklyPattern * monthlyPattern * trendPattern * (1 + randomVariation);
            break;
          case 'success_rate':
            value = Math.min(100, baseline + (randomVariation * 5) + (trendPattern - 1) * 2);
            break;
          case 'response_time':
            value = baseline / (weeklyPattern * trendPattern) * (1 + Math.abs(randomVariation));
            break;
          case 'agent_utilization':
            value = baseline * weeklyPattern * (1 + randomVariation * 0.4);
            break;
          case 'error_rate':
            value = Math.max(0, (baseline / trendPattern) * (1 + randomVariation * 2));
            break;
          default:
            value = baseline * (1 + randomVariation);
        }

        entry[metricKey] = Math.round(value * 100) / 100;

        // Detect anomalies (values outside 2 standard deviations)
        const isAnomaly = Math.abs(randomVariation) > 0.25;
        if (isAnomaly && Math.random() > 0.9) { // 10% chance of anomaly
          anomalies.push({
            date: entry.date,
            metric: metricKey,
            value: entry[metricKey],
            expected: baseline,
            severity: Math.abs(randomVariation) > 0.3 ? 'high' : 'medium',
            type: randomVariation > 0 ? 'spike' : 'drop'
          });
        }
      });

      data.push(entry);
    }

    // Calculate trend metrics
    const recentData = data.slice(-7); // Last 7 days
    const previousData = data.slice(-14, -7); // Previous 7 days

    Object.keys(metrics).forEach(metricKey => {
      const recentAvg = recentData.reduce((sum, d) => sum + d[metricKey], 0) / recentData.length;
      const previousAvg = previousData.reduce((sum, d) => sum + d[metricKey], 0) / previousData.length;
      const trend = ((recentAvg - previousAvg) / previousAvg) * 100;
      
      // Calculate volatility (standard deviation)
      const recentValues = recentData.map(d => d[metricKey]);
      const mean = recentAvg;
      const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
      const volatility = Math.sqrt(variance);

      trendsData[metricKey] = {
        current: recentAvg,
        previous: previousAvg,
        trend,
        volatility,
        correlation: Math.random() * 0.6 + 0.2, // Mock correlation
        seasonality: isWeekend ? 'weekend_pattern' : 'weekday_pattern'
      };
    });

    // Generate forecast data (next 7 days)
    if (showForecast) {
      for (let i = 1; i <= 7; i++) {
        const futureDate = addDays(now, i);
        const dayOfWeek = futureDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weeklyPattern = isWeekend ? 0.6 : 1.0;
        
        const forecastEntry = {
          date: format(futureDate, 'yyyy-MM-dd'),
          displayDate: format(futureDate, 'MMM dd'),
          timestamp: futureDate.toISOString(),
          isForecast: true
        };

        Object.entries(metrics).forEach(([metricKey, metricConfig]) => {
          const baseline = metricConfig.baseline;
          const trend = trendsData[metricKey].trend;
          const volatility = trendsData[metricKey].volatility;
          
          // Apply trend and seasonal patterns to forecast
          const forecastValue = baseline * weeklyPattern * (1 + trend/100) * (1 + (Math.random() - 0.5) * 0.1);
          forecastEntry[metricKey] = Math.round(forecastValue * 100) / 100;
          forecastEntry[`${metricKey}_upper`] = forecastEntry[metricKey] + volatility;
          forecastEntry[`${metricKey}_lower`] = Math.max(0, forecastEntry[metricKey] - volatility);
        });

        forecastData.push(forecastEntry);
      }
    }

    return {
      historical: data,
      trends: trendsData,
      forecast: forecastData,
      anomalies
    };
  }, [timeRange, showForecast]);

  useEffect(() => {
    const mockData = generateHistoricalData;
    setHistoricalData(mockData.historical);
    setTrendMetrics(mockData.trends);
    setForecastData(mockData.forecast);
    setAnomalyData(mockData.anomalies);
    setLoading(false);

    const interval = setInterval(() => {
      const newMockData = generateHistoricalData;
      setHistoricalData(newMockData.historical);
      setTrendMetrics(newMockData.trends);
      setForecastData(newMockData.forecast);
      setAnomalyData(newMockData.anomalies);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [generateHistoricalData, refreshInterval]);

  const combinedData = [...historicalData, ...forecastData];
  const selectedMetric = metrics[metric];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isForecast = data.isForecast;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {label} {isForecast && '(Forecast)'}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? 
                entry.value.toFixed(2) : entry.value} {selectedMetric.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Historical Trend Analysis</h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(metrics).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showForecast}
                  onChange={(e) => setShowForecast(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Show Forecast</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showAnomalies}
                  onChange={(e) => setShowAnomalies(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Show Anomalies</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Value</p>
              <p className="text-2xl font-bold text-blue-600">
                {trendMetrics[metric]?.current?.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">{selectedMetric.unit}</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">7-Day Trend</p>
              <p className={`text-2xl font-bold ${
                (trendMetrics[metric]?.trend || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(trendMetrics[metric]?.trend || 0) >= 0 ? '+' : ''}
                {trendMetrics[metric]?.trend?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">vs previous week</p>
            </div>
            <div className="text-3xl">
              {(trendMetrics[metric]?.trend || 0) >= 0 ? '📈' : '📉'}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Volatility</p>
              <p className="text-2xl font-bold text-purple-600">
                {trendMetrics[metric]?.volatility?.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">standard deviation</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Anomalies</p>
              <p className="text-2xl font-bold text-orange-600">
                {anomalyData.filter(a => a.metric === metric).length}
              </p>
              <p className="text-xs text-gray-500">in selected period</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">
          {selectedMetric.name} Trend Analysis
        </h3>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Historical data */}
            <Line
              type="monotone"
              dataKey={metric}
              stroke={selectedMetric.color}
              strokeWidth={2}
              dot={(props) => {
                const { payload } = props;
                return payload.isForecast ? null : <dot {...props} r={3} />;
              }}
              connectNulls={false}
              name={`${selectedMetric.name} (Historical)`}
            />
            
            {/* Forecast data */}
            {showForecast && (
              <>
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={selectedMetric.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={(props) => {
                    const { payload } = props;
                    return payload.isForecast ? <dot {...props} r={3} /> : null;
                  }}
                  connectNulls={false}
                  name={`${selectedMetric.name} (Forecast)`}
                />
                
                <Area
                  type="monotone"
                  dataKey={`${metric}_upper`}
                  stroke="none"
                  fill={selectedMetric.color}
                  fillOpacity={0.1}
                  name="Forecast Range"
                />
                
                <Area
                  type="monotone"
                  dataKey={`${metric}_lower`}
                  stroke="none"
                  fill={selectedMetric.color}
                  fillOpacity={0.1}
                />
              </>
            )}
            
            {/* Baseline reference */}
            <ReferenceLine 
              y={selectedMetric.baseline} 
              stroke="#94A3B8" 
              strokeDasharray="3 3"
              label={{ value: "Baseline", position: "topRight" }}
            />
            
            {/* Anomaly markers */}
            {showAnomalies && anomalyData
              .filter(a => a.metric === metric)
              .map((anomaly, index) => (
                <ReferenceLine
                  key={index}
                  x={format(new Date(anomaly.date), 'MMM dd')}
                  stroke={anomaly.severity === 'high' ? '#EF4444' : '#F59E0B'}
                  strokeWidth={2}
                  label={{ 
                    value: anomaly.type === 'spike' ? '↑' : '↓', 
                    position: 'top' 
                  }}
                />
              ))
            }
            
            <Brush 
              dataKey="displayDate" 
              height={30} 
              stroke={selectedMetric.color}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly Detection Results */}
      {showAnomalies && anomalyData.length > 0 && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Detected Anomalies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observed Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deviation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {anomalyData.slice(-10).map((anomaly, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(anomaly.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics[anomaly.metric]?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        anomaly.type === 'spike' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {anomaly.type === 'spike' ? '↑ Spike' : '↓ Drop'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        anomaly.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.value.toFixed(2)} {metrics[anomaly.metric]?.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.expected.toFixed(2)} {metrics[anomaly.metric]?.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((anomaly.value - anomaly.expected) / anomaly.expected * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalTrendAnalysis;
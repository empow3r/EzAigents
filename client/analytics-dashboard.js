// Enterprise Analytics Dashboard
class AnalyticsDashboard {
    constructor() {
        // Determine server URL
        this.baseUrl = window.location.protocol === 'file:' 
            ? 'http://localhost:3001' 
            : window.location.origin;
        
        this.wsUrl = window.location.protocol === 'file:'
            ? 'ws://localhost:3001/ws'
            : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
        
        this.ws = null;
        this.charts = {};
        this.analyticsData = {};
        this.performanceData = [];
        this.anomalies = [];
        this.traces = [];
        this.activeAlerts = [];
        
        this.initializeElements();
        this.initializeCharts();
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadData();
        this.startAutoRefresh();
    }
    
    initializeElements() {
        // Status elements
        this.connectionStatus = document.getElementById('connection-status');
        this.lastUpdated = document.getElementById('last-updated');
        
        // Controls
        this.refreshBtn = document.getElementById('refresh-btn');
        this.timeRange = document.getElementById('time-range');
        this.autoRefresh = document.getElementById('auto-refresh');
        this.enableAlerts = document.getElementById('enable-alerts');
        
        // KPI elements
        this.kpiElements = {
            totalEvents: document.getElementById('kpi-total-events'),
            activeAgents: document.getElementById('kpi-active-agents'),
            errorRate: document.getElementById('kpi-error-rate'),
            avgResponse: document.getElementById('kpi-avg-response'),
            activeSessions: document.getElementById('kpi-active-sessions'),
            alerts: document.getElementById('kpi-alerts')
        };
        
        this.trendElements = {
            totalEvents: document.getElementById('trend-total-events'),
            activeAgents: document.getElementById('trend-active-agents'),
            errorRate: document.getElementById('trend-error-rate'),
            avgResponse: document.getElementById('trend-avg-response'),
            activeSessions: document.getElementById('trend-active-sessions'),
            alerts: document.getElementById('trend-alerts')
        };
        
        // Containers
        this.performanceTableBody = document.getElementById('performance-table-body');
        this.anomaliesContainer = document.getElementById('anomalies-container');
        this.tracesContainer = document.getElementById('traces-container');
        this.alertBanner = document.getElementById('alert-banner');
        this.alertContent = document.getElementById('alert-content');
    }
    
    initializeCharts() {
        // Event Volume Chart
        this.charts.volume = new Chart(document.getElementById('volume-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Events per Hour',
                    data: [],
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Error Rate Chart
        this.charts.error = new Chart(document.getElementById('error-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Error Rate %',
                    data: [],
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        // Agent Performance Chart
        this.charts.performance = new Chart(document.getElementById('performance-chart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Events/Hour',
                    data: [],
                    backgroundColor: '#2196f3'
                }, {
                    label: 'Errors/Hour',
                    data: [],
                    backgroundColor: '#f44336'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Response Time Distribution
        this.charts.responseTime = new Chart(document.getElementById('response-time-chart'), {
            type: 'histogram',
            data: {
                labels: ['0-100ms', '100-500ms', '500ms-1s', '1-5s', '5s+'],
                datasets: [{
                    label: 'Requests',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#4caf50',
                        '#8bc34a',
                        '#ffc107',
                        '#ff9800',
                        '#f44336'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    setupEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.loadData());
        this.timeRange.addEventListener('change', () => this.loadData());
        this.enableAlerts.addEventListener('change', () => this.toggleAlerts());
    }
    
    connectWebSocket() {
        console.log('Connecting to WebSocket:', this.wsUrl);
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connectionStatus.textContent = '🟢 Connected';
            this.connectionStatus.className = 'status-connected';
            
            // Subscribe to alerts
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channels: ['alerts', 'analytics']
            }));
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.connectionStatus.textContent = '⚫ Disconnected';
            this.connectionStatus.className = 'status-disconnected';
            
            // Attempt to reconnect
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'alert':
                this.handleAlert(data.data);
                break;
            case 'event':
                // Real-time event updates
                this.updateRealTimeMetrics(data.data);
                break;
            case 'analytics_update':
                // Periodic analytics updates
                this.updateAnalytics(data.data);
                break;
        }
    }
    
    handleAlert(alertData) {
        this.activeAlerts.push(alertData);
        this.updateAlertBanner();
        this.updateKPI('alerts', this.activeAlerts.length);
        
        // Show notification
        this.showNotification(`⚠️ Alert: ${alertData.rule} triggered`, 'warning');
    }
    
    async loadData() {
        try {
            // Load analytics data
            const analyticsResponse = await fetch(`${this.baseUrl}/analytics`);
            this.analyticsData = await analyticsResponse.json();
            
            // Load traces
            const tracesResponse = await fetch(`${this.baseUrl}/traces`);
            this.traces = await tracesResponse.json();
            
            // Update all displays
            this.updateKPIs();
            this.updateCharts();
            this.updatePerformanceTable();
            this.updateAnomalies();
            this.updateTraces();
            
            this.lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Failed to load analytics data', 'error');
        }
    }
    
    updateKPIs() {
        const overview = this.analyticsData.overview || {};
        
        this.updateKPI('totalEvents', overview.total_events || 0);
        this.updateKPI('activeAgents', overview.unique_apps || 0);
        this.updateKPI('activeSessions', overview.unique_sessions || 0);
        
        const errorRate = overview.total_events > 0 
            ? ((overview.error_count || 0) / overview.total_events * 100).toFixed(1)
            : 0;
        this.updateKPI('errorRate', errorRate + '%');
        
        const avgResponse = overview.avg_duration 
            ? Math.round(overview.avg_duration * 1000) + 'ms'
            : '0ms';
        this.updateKPI('avgResponse', avgResponse);
    }
    
    updateKPI(kpi, value, trend = null) {
        if (this.kpiElements[kpi]) {
            this.kpiElements[kpi].textContent = value;
        }
        
        if (trend && this.trendElements[kpi]) {
            this.trendElements[kpi].textContent = trend;
            this.trendElements[kpi].className = 'kpi-trend ' + this.getTrendClass(trend);
        }
    }
    
    getTrendClass(trend) {
        if (trend.includes('↑') || trend.includes('+')) return 'trend-up';
        if (trend.includes('↓') || trend.includes('-')) return 'trend-down';
        return 'trend-neutral';
    }
    
    updateCharts() {
        this.updateVolumeChart();
        this.updateErrorChart();
        this.updatePerformanceChart();
        this.updateResponseTimeChart();
    }
    
    updateVolumeChart() {
        // Generate hourly data for the last 24 hours
        const now = new Date();
        const labels = [];
        const data = [];
        
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(hour.toLocaleTimeString('en-US', { hour: '2-digit' }));
            
            // Simulate data based on performance metrics
            const events = this.performanceData.reduce((sum, agent) => sum + agent.event_count, 0);
            data.push(Math.round(events / 24 + Math.random() * 10 - 5));
        }
        
        this.charts.volume.data.labels = labels;
        this.charts.volume.data.datasets[0].data = data;
        this.charts.volume.update();
    }
    
    updateErrorChart() {
        // Generate error rate data
        const labels = [];
        const data = [];
        
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(Date.now() - i * 60 * 60 * 1000);
            labels.push(hour.toLocaleTimeString('en-US', { hour: '2-digit' }));
            
            // Calculate error rate based on performance data
            const totalEvents = this.performanceData.reduce((sum, agent) => sum + agent.event_count, 0);
            const totalErrors = this.performanceData.reduce((sum, agent) => sum + agent.error_count, 0);
            const errorRate = totalEvents > 0 ? (totalErrors / totalEvents * 100) : 0;
            
            data.push(Math.max(0, errorRate + (Math.random() - 0.5) * 2));
        }
        
        this.charts.error.data.labels = labels;
        this.charts.error.data.datasets[0].data = data;
        this.charts.error.update();
    }
    
    updatePerformanceChart() {
        if (!this.analyticsData.performance) return;
        
        const agents = this.analyticsData.performance.slice(0, 10); // Top 10 agents
        const labels = agents.map(agent => agent.app);
        const eventData = agents.map(agent => agent.event_count);
        const errorData = agents.map(agent => agent.error_count);
        
        this.charts.performance.data.labels = labels;
        this.charts.performance.data.datasets[0].data = eventData;
        this.charts.performance.data.datasets[1].data = errorData;
        this.charts.performance.update();
    }
    
    updateResponseTimeChart() {
        // Simulate response time distribution
        const performance = this.analyticsData.performance || [];
        const buckets = [0, 0, 0, 0, 0];
        
        performance.forEach(agent => {
            const responseTime = agent.avg_response_time || 0;
            if (responseTime < 100) buckets[0]++;
            else if (responseTime < 500) buckets[1]++;
            else if (responseTime < 1000) buckets[2]++;
            else if (responseTime < 5000) buckets[3]++;
            else buckets[4]++;
        });
        
        this.charts.responseTime.data.datasets[0].data = buckets;
        this.charts.responseTime.update();
    }
    
    updatePerformanceTable() {
        if (!this.analyticsData.performance) return;
        
        this.performanceData = this.analyticsData.performance;
        
        this.performanceTableBody.innerHTML = '';
        
        this.performanceData.forEach(agent => {
            const row = document.createElement('tr');
            const errorRate = agent.event_count > 0 
                ? ((agent.error_count / agent.event_count) * 100).toFixed(1)
                : '0.0';
            
            const status = agent.error_count === 0 ? '🟢 Healthy' :
                          errorRate > 10 ? '🔴 Critical' :
                          errorRate > 5 ? '🟡 Warning' : '🟢 Healthy';
            
            row.innerHTML = `
                <td>${agent.app}</td>
                <td>${agent.event_count}</td>
                <td>${agent.error_count}</td>
                <td>${errorRate}%</td>
                <td>${agent.avg_response_time ? Math.round(agent.avg_response_time) + 'ms' : 'N/A'}</td>
                <td>${agent.active_sessions}</td>
                <td>${status}</td>
            `;
            
            this.performanceTableBody.appendChild(row);
        });
    }
    
    updateAnomalies() {
        this.anomalies = this.analyticsData.anomalies || [];
        
        if (this.anomalies.length === 0) {
            this.anomaliesContainer.innerHTML = '<p>No anomalies detected in the current time range.</p>';
            return;
        }
        
        this.anomaliesContainer.innerHTML = '';
        
        this.anomalies.forEach(anomaly => {
            const anomalyDiv = document.createElement('div');
            anomalyDiv.className = 'anomaly-item';
            
            const typeLabel = {
                'spike': '📈 Event Spike',
                'drop': '📉 Event Drop',
                'error_spike': '🚨 Error Spike'
            }[anomaly.anomaly_type] || anomaly.anomaly_type;
            
            anomalyDiv.innerHTML = `
                <div class="anomaly-type">${typeLabel}</div>
                <div>Agent: ${anomaly.app}</div>
                <div>Time: ${new Date(anomaly.hour).toLocaleString()}</div>
                <div>Events: ${anomaly.event_count} (avg: ${Math.round(anomaly.avg_events)})</div>
                ${anomaly.error_count ? `<div>Errors: ${anomaly.error_count}</div>` : ''}
            `;
            
            this.anomaliesContainer.appendChild(anomalyDiv);
        });
    }
    
    updateTraces() {
        if (this.traces.length === 0) {
            this.tracesContainer.innerHTML = '<p>No traces available.</p>';
            return;
        }
        
        this.tracesContainer.innerHTML = '';
        
        this.traces.slice(0, 10).forEach(trace => {
            const traceDiv = document.createElement('div');
            traceDiv.className = 'trace-item';
            
            const duration = trace.duration ? `${trace.duration}ms` : 'In Progress';
            const status = trace.status === 'completed' ? '✅' : 
                          trace.status === 'error' ? '❌' : '⏳';
            
            traceDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>${status} ${trace.operation_name}</span>
                    <span class="trace-duration">${duration}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    Service: ${trace.service_name || 'Unknown'} | 
                    Started: ${new Date(trace.start_time).toLocaleTimeString()}
                </div>
            `;
            
            traceDiv.addEventListener('click', () => this.showTraceDetails(trace.trace_id));
            this.tracesContainer.appendChild(traceDiv);
        });
    }
    
    updateAlertBanner() {
        if (!this.enableAlerts.checked || this.activeAlerts.length === 0) {
            this.alertBanner.classList.remove('active');
            return;
        }
        
        this.alertBanner.classList.add('active');
        this.alertContent.innerHTML = this.activeAlerts.map(alert => `
            <div>⚠️ ${alert.rule}: ${alert.condition} (${alert.timestamp})</div>
        `).join('');
    }
    
    toggleAlerts() {
        this.updateAlertBanner();
    }
    
    showTraceDetails(traceId) {
        // In a real implementation, this would show a detailed trace view
        this.showNotification(`Trace details for ${traceId} (feature coming soon)`, 'info');
    }
    
    updateRealTimeMetrics(event) {
        // Update real-time metrics when new events arrive
        const currentTotal = parseInt(this.kpiElements.totalEvents.textContent) + 1;
        this.updateKPI('totalEvents', currentTotal);
        
        if (event.event_type === 'error') {
            const currentErrors = parseInt(this.kpiElements.alerts.textContent) + 1;
            this.updateKPI('alerts', currentErrors);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
    
    startAutoRefresh() {
        setInterval(() => {
            if (this.autoRefresh.checked) {
                this.loadData();
            }
        }, 30000); // Refresh every 30 seconds
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsDashboard = new AnalyticsDashboard();
});
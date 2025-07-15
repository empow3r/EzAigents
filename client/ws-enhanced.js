// Enhanced WebSocket Client for Observability Dashboard
class ObservabilityDashboard {
    constructor() {
        this.ws = null;
        this.events = [];
        this.metrics = {
            total: 0,
            apps: new Set(),
            sessions: new Set(),
            eventTypes: {},
            errorCount: 0,
            eventRate: []
        };
        this.charts = {};
        this.isPaused = false;
        this.startTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;
        
        this.initializeDOMElements();
        this.initializeCharts();
        this.setupEventListeners();
        this.connect();
        this.startMetricsUpdater();
    }
    
    initializeDOMElements() {
        // Status elements
        this.connectionStatus = document.getElementById('connection-status');
        this.eventCount = document.getElementById('event-count');
        this.eventRate = document.getElementById('event-rate');
        this.uptimeEl = document.getElementById('uptime');
        
        // Metric cards
        this.metricTotal = document.getElementById('metric-total');
        this.metricApps = document.getElementById('metric-apps');
        this.metricSessions = document.getElementById('metric-sessions');
        this.metricErrors = document.getElementById('metric-errors');
        
        // Trends
        this.trendTotal = document.getElementById('trend-total');
        this.trendApps = document.getElementById('trend-apps');
        this.trendSessions = document.getElementById('trend-sessions');
        this.trendErrors = document.getElementById('trend-errors');
        
        // Controls
        this.clearBtn = document.getElementById('clear-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.exportCsvBtn = document.getElementById('export-csv-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.pauseBtn = document.getElementById('pause-stream');
        
        // Filters
        this.searchInput = document.getElementById('search');
        this.appFilter = document.getElementById('app-filter');
        this.typeFilter = document.getElementById('type-filter');
        this.sessionFilter = document.getElementById('session-filter');
        this.timeRange = document.getElementById('time-range');
        
        // Checkboxes
        this.autoScrollCheckbox = document.getElementById('auto-scroll');
        this.showSummariesCheckbox = document.getElementById('show-summaries');
        this.groupSessionsCheckbox = document.getElementById('group-sessions');
        
        // Containers
        this.eventsContainer = document.getElementById('events-container');
        
        // Counters
        this.visibleCount = document.getElementById('visible-count');
        this.totalCount = document.getElementById('total-count');
    }
    
    initializeCharts() {
        // Timeline chart
        this.charts.timeline = new Chart(document.getElementById('timeline-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Events per minute',
                    data: [],
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4
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
        
        // Event types chart
        this.charts.types = new Chart(document.getElementById('type-chart'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        // Apps chart
        this.charts.apps = new Chart(document.getElementById('apps-chart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Events',
                    data: [],
                    backgroundColor: '#2196f3'
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
        
        // Session activity chart
        this.charts.sessions = new Chart(document.getElementById('session-chart'), {
            type: 'radar',
            data: {
                labels: ['Pre Tool', 'Post Tool', 'Errors', 'Stops', 'Other'],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    setupEventListeners() {
        this.clearBtn.addEventListener('click', () => this.clearEvents());
        this.exportBtn.addEventListener('click', () => this.exportJSON());
        this.exportCsvBtn.addEventListener('click', () => this.exportCSV());
        this.refreshBtn.addEventListener('click', () => this.refreshStats());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        // Filters
        this.searchInput.addEventListener('input', () => this.filterEvents());
        this.appFilter.addEventListener('change', () => this.filterEvents());
        this.typeFilter.addEventListener('change', () => this.filterEvents());
        this.sessionFilter.addEventListener('change', () => this.filterEvents());
        this.timeRange.addEventListener('change', () => this.handleTimeRangeChange());
        
        // Checkboxes
        this.showSummariesCheckbox.addEventListener('change', () => this.rerenderEvents());
        this.groupSessionsCheckbox.addEventListener('change', () => this.rerenderEvents());
    }
    
    connect() {
        this.ws = new WebSocket('ws://localhost:3001/ws');
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connectionStatus.textContent = '🟢 Connected';
            this.connectionStatus.className = 'status-connected';
            this.reconnectAttempts = 0;
            this.eventsContainer.innerHTML = '';
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.connectionStatus.textContent = '⚫ Disconnected';
            this.connectionStatus.className = 'status-disconnected';
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'init':
                this.handleInit(data);
                break;
            case 'event':
                if (!this.isPaused) {
                    this.handleNewEvent(data.data);
                }
                break;
            case 'stats':
                this.updateStats(data.stats);
                break;
            case 'pong':
                this.lastPing = Date.now() - data.timestamp;
                break;
        }
    }
    
    handleInit(data) {
        this.events = data.events || [];
        this.updateMetrics();
        this.updateCharts();
        this.rerenderEvents();
        this.updateFilters();
        
        if (data.stats) {
            this.updateStats(data.stats);
        }
    }
    
    handleNewEvent(event) {
        this.events.push(event);
        this.updateMetricsForEvent(event);
        this.updateCharts();
        
        if (this.matchesFilters(event)) {
            this.renderEvent(event, true);
            this.updateCounters();
        }
        
        // Check for alerts
        this.checkAlerts(event);
    }
    
    updateMetricsForEvent(event) {
        this.metrics.total++;
        this.metrics.apps.add(event.app);
        this.metrics.sessions.add(event.session_id);
        
        if (!this.metrics.eventTypes[event.event_type]) {
            this.metrics.eventTypes[event.event_type] = 0;
        }
        this.metrics.eventTypes[event.event_type]++;
        
        if (event.event_type === 'error' || event.payload?.error) {
            this.metrics.errorCount++;
        }
        
        // Update event rate
        const now = Date.now();
        this.metrics.eventRate.push(now);
        this.metrics.eventRate = this.metrics.eventRate.filter(t => t > now - 60000);
        
        this.updateMetricDisplays();
    }
    
    updateMetricDisplays() {
        // Update metric values
        this.metricTotal.textContent = this.metrics.total;
        this.metricApps.textContent = this.metrics.apps.size;
        this.metricSessions.textContent = this.metrics.sessions.size;
        
        const errorRate = this.metrics.total > 0 
            ? ((this.metrics.errorCount / this.metrics.total) * 100).toFixed(1)
            : 0;
        this.metricErrors.textContent = `${errorRate}%`;
        
        // Update event rate
        const rate = this.metrics.eventRate.length;
        this.eventRate.textContent = `${rate}/min`;
        
        // Update trends (simplified for demo)
        this.trendTotal.textContent = `↑ ${rate > 0 ? '+' + rate : '0'}`;
        this.trendApps.textContent = `→ ${this.metrics.apps.size}`;
        this.trendSessions.textContent = `→ ${this.metrics.sessions.size}`;
        this.trendErrors.textContent = errorRate > 5 ? `↑ ${errorRate}%` : `↓ ${errorRate}%`;
    }
    
    updateCharts() {
        // Update timeline chart
        const timelineData = this.getTimelineData();
        this.charts.timeline.data.labels = timelineData.labels;
        this.charts.timeline.data.datasets[0].data = timelineData.data;
        this.charts.timeline.update();
        
        // Update event types chart
        const typeData = this.getEventTypeData();
        this.charts.types.data.labels = typeData.labels;
        this.charts.types.data.datasets[0].data = typeData.data;
        this.charts.types.update();
        
        // Update apps chart
        const appData = this.getAppData();
        this.charts.apps.data.labels = appData.labels;
        this.charts.apps.data.datasets[0].data = appData.data;
        this.charts.apps.update();
    }
    
    getTimelineData() {
        const now = Date.now();
        const buckets = new Array(10).fill(0);
        const labels = [];
        
        for (let i = 9; i >= 0; i--) {
            const time = new Date(now - i * 60000);
            labels.push(time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        }
        
        this.events.forEach(event => {
            const eventTime = new Date(event.timestamp).getTime();
            const bucketIndex = Math.floor((now - eventTime) / 60000);
            if (bucketIndex >= 0 && bucketIndex < 10) {
                buckets[9 - bucketIndex]++;
            }
        });
        
        return { labels, data: buckets };
    }
    
    getEventTypeData() {
        const types = {};
        this.events.forEach(event => {
            types[event.event_type] = (types[event.event_type] || 0) + 1;
        });
        
        return {
            labels: Object.keys(types),
            data: Object.values(types)
        };
    }
    
    getAppData() {
        const apps = {};
        this.events.forEach(event => {
            apps[event.app] = (apps[event.app] || 0) + 1;
        });
        
        const sorted = Object.entries(apps)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        return {
            labels: sorted.map(([app]) => app),
            data: sorted.map(([, count]) => count)
        };
    }
    
    renderEvent(event, isNew = false) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event ${isNew ? 'new' : ''} ${event.event_type === 'error' ? 'error' : ''}`;
        eventDiv.dataset.eventId = event.id;
        
        const timestamp = new Date(event.timestamp).toLocaleString();
        const payloadId = `payload-${event.id || Date.now()}`;
        
        const showSummary = this.showSummariesCheckbox.checked && event.summary;
        
        eventDiv.innerHTML = `
            <div class="event-header">
                <div class="event-badges">
                    <span class="event-badge badge-app">${event.app}</span>
                    <span class="event-badge badge-session">${event.session_id}</span>
                    <span class="event-badge badge-type-${event.event_type}">${event.event_type}</span>
                </div>
                <span class="event-timestamp">${timestamp}</span>
            </div>
            ${showSummary ? `<div class="event-summary">${event.summary}</div>` : ''}
            <div class="event-actions">
                <span class="event-action" onclick="dashboard.togglePayload('${payloadId}')">
                    ▶ Show payload
                </span>
                <span class="event-action" onclick="dashboard.copyEvent('${event.id}')">
                    📋 Copy
                </span>
                <span class="event-action" onclick="dashboard.shareEvent('${event.id}')">
                    🔗 Share
                </span>
            </div>
            <pre id="${payloadId}" class="event-payload hidden">${JSON.stringify(event.payload, null, 2)}</pre>
        `;
        
        this.eventsContainer.appendChild(eventDiv);
        
        if (this.autoScrollCheckbox.checked && isNew) {
            eventDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
    
    togglePayload(id) {
        const payload = document.getElementById(id);
        const toggle = payload.previousElementSibling.querySelector('.event-action');
        
        if (payload.classList.contains('hidden')) {
            payload.classList.remove('hidden');
            toggle.textContent = '▼ Hide payload';
        } else {
            payload.classList.add('hidden');
            toggle.textContent = '▶ Show payload';
        }
    }
    
    copyEvent(eventId) {
        const event = this.events.find(e => e.id == eventId);
        if (event) {
            navigator.clipboard.writeText(JSON.stringify(event, null, 2));
            this.showNotification('Event copied to clipboard');
        }
    }
    
    shareEvent(eventId) {
        const event = this.events.find(e => e.id == eventId);
        if (event) {
            const url = `${window.location.origin}${window.location.pathname}?event=${eventId}`;
            navigator.clipboard.writeText(url);
            this.showNotification('Share link copied to clipboard');
        }
    }
    
    showNotification(message) {
        // Simple notification (can be enhanced with a toast library)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196f3;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    matchesFilters(event) {
        const search = this.searchInput.value.toLowerCase();
        const app = this.appFilter.value;
        const type = this.typeFilter.value;
        const session = this.sessionFilter.value;
        
        if (search) {
            const searchable = [
                event.app,
                event.session_id,
                event.event_type,
                event.summary || '',
                JSON.stringify(event.payload)
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(search)) return false;
        }
        
        if (app && event.app !== app) return false;
        if (type && event.event_type !== type) return false;
        if (session && event.session_id !== session) return false;
        
        return true;
    }
    
    filterEvents() {
        this.rerenderEvents();
    }
    
    rerenderEvents() {
        this.eventsContainer.innerHTML = '';
        
        const filtered = this.events.filter(e => this.matchesFilters(e));
        
        if (this.groupSessionsCheckbox.checked) {
            const grouped = this.groupBySession(filtered);
            Object.entries(grouped).forEach(([session, events]) => {
                this.renderSessionGroup(session, events);
            });
        } else {
            filtered.forEach(event => this.renderEvent(event, false));
        }
        
        this.updateCounters();
    }
    
    groupBySession(events) {
        return events.reduce((acc, event) => {
            if (!acc[event.session_id]) {
                acc[event.session_id] = [];
            }
            acc[event.session_id].push(event);
            return acc;
        }, {});
    }
    
    renderSessionGroup(session, events) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'session-group';
        groupDiv.innerHTML = `
            <h3>Session: ${session} (${events.length} events)</h3>
        `;
        
        events.forEach(event => {
            const eventEl = this.renderEvent(event, false);
        });
    }
    
    updateCounters() {
        const visible = this.eventsContainer.querySelectorAll('.event').length;
        this.visibleCount.textContent = visible;
        this.totalCount.textContent = this.events.length;
        this.eventCount.textContent = `${this.events.length} events`;
    }
    
    updateFilters() {
        // Update app filter
        const apps = new Set(this.events.map(e => e.app));
        this.updateSelectOptions(this.appFilter, Array.from(apps));
        
        // Update type filter
        const types = new Set(this.events.map(e => e.event_type));
        this.updateSelectOptions(this.typeFilter, Array.from(types));
        
        // Update session filter
        const sessions = new Set(this.events.map(e => e.session_id));
        this.updateSelectOptions(this.sessionFilter, Array.from(sessions));
    }
    
    updateSelectOptions(select, options) {
        const current = select.value;
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        options.sort().forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
        
        select.value = current;
    }
    
    clearEvents() {
        this.eventsContainer.innerHTML = '';
        this.events = [];
        this.updateMetrics();
        this.updateCharts();
        this.updateCounters();
    }
    
    exportJSON() {
        const data = JSON.stringify(this.events, null, 2);
        this.downloadFile(data, 'application/json', `events-${Date.now()}.json`);
    }
    
    exportCSV() {
        window.location.href = 'http://localhost:3001/export/csv';
    }
    
    downloadFile(content, type, filename) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    refreshStats() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'get_stats' }));
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
    }
    
    handleTimeRangeChange() {
        const range = this.timeRange.value;
        // Implement time range filtering
        console.log('Time range changed to:', range);
    }
    
    checkAlerts(event) {
        // Simple alert checking (can be enhanced)
        if (event.event_type === 'error') {
            this.showNotification(`⚠️ Error event from ${event.app}`);
        }
    }
    
    startMetricsUpdater() {
        // Update uptime
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            
            this.uptimeEl.textContent = `Uptime: ${hours}h ${minutes}m ${seconds}s`;
        }, 1000);
        
        // Ping WebSocket
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 30000);
    }
    
    updateMetrics() {
        this.metrics.total = this.events.length;
        this.metrics.apps = new Set(this.events.map(e => e.app));
        this.metrics.sessions = new Set(this.events.map(e => e.session_id));
        this.metrics.eventTypes = {};
        this.metrics.errorCount = 0;
        
        this.events.forEach(event => {
            if (!this.metrics.eventTypes[event.event_type]) {
                this.metrics.eventTypes[event.event_type] = 0;
            }
            this.metrics.eventTypes[event.event_type]++;
            
            if (event.event_type === 'error' || event.payload?.error) {
                this.metrics.errorCount++;
            }
        });
        
        this.updateMetricDisplays();
    }
    
    updateStats(stats) {
        console.log('Received stats:', stats);
    }
}

// Initialize dashboard
const dashboard = new ObservabilityDashboard();
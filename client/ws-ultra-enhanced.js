/**
 * Ultra-Enhanced Claude Code Observability Dashboard
 * Real-time WebSocket-based monitoring with advanced features
 */

class UltraEnhancedDashboard {
    constructor() {
        // Connection settings with dynamic URL detection
        this.baseUrl = this.detectBaseUrl();
        this.wsUrl = this.detectWebSocketUrl();
        
        // Core state
        this.ws = null;
        this.events = [];
        this.filteredEvents = [];
        this.agents = new Map();
        this.sessions = new Map();
        this.isConnected = false;
        this.isPaused = false;
        this.currentView = 'events';
        
        // Filter state
        this.filters = {
            timeRange: 'live',
            quickFilter: 'all',
            apps: [],
            types: [],
            severity: '',
            traceId: '',
            searchTerm: ''
        };
        
        // Settings
        this.settings = {
            theme: 'dark',
            animationSpeed: 'normal',
            refreshInterval: 5000,
            soundNotifications: true,
            browserNotifications: true,
            maxEvents: 1000,
            autoScroll: true,
            showDetails: true,
            groupBySession: false
        };
        
        // Charts and visualizations
        this.charts = {};
        this.network = null;
        this.timeline = null;
        
        // Performance tracking
        this.stats = {
            total: 0,
            agents: 0,
            errors: 0,
            sessions: 0,
            avgResponse: 0,
            eventRate: 0
        };
        
        this.init();
    }
    
    detectBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3001';
        }
        return window.location.origin;
    }
    
    detectWebSocketUrl() {
        if (window.location.protocol === 'file:') {
            return 'ws://localhost:3001/ws';
        }
        
        // For localhost development, always use the specific port
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ws://localhost:3001/ws';
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || '3001';
        return `${protocol}//${host}:${port}/ws`;
    }
    
    async init() {
        console.log('🚀 Initializing Ultra-Enhanced Dashboard');
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize UI elements
        this.initElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize charts
        this.initCharts();
        
        // Connect to WebSocket
        this.connectWebSocket();
        
        // Load initial data
        await this.loadInitialData();
        
        // Apply theme
        this.applyTheme();
        
        // Start update intervals
        this.startUpdateIntervals();
        
        console.log('✅ Dashboard initialized successfully');
    }
    
    initElements() {
        // Main UI elements
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            menuToggle: document.getElementById('menu-toggle'),
            connectionStatus: document.getElementById('connection-status'),
            eventRate: document.getElementById('event-rate'),
            globalSearch: document.getElementById('global-search'),
            searchSuggestions: document.getElementById('search-suggestions'),
            
            // View buttons
            viewButtons: document.querySelectorAll('.view-btn'),
            viewContainers: document.querySelectorAll('.view-container'),
            
            // Events view
            pauseBtn: document.getElementById('pause-btn'),
            eventsContainer: document.getElementById('events-container'),
            flowVisualization: document.getElementById('events-flow-visualization'),
            autoScrollCheckbox: document.getElementById('auto-scroll'),
            showDetailsCheckbox: document.getElementById('show-details'),
            groupBySessionCheckbox: document.getElementById('group-by-session'),
            
            // Stats
            statElements: {
                total: document.getElementById('stat-total'),
                agents: document.getElementById('stat-agents'),
                errors: document.getElementById('stat-errors'),
                response: document.getElementById('stat-response'),
                sessions: document.getElementById('stat-sessions')
            },
            
            // Timeline
            timelineContainer: document.getElementById('timeline-container'),
            timelineSvg: document.getElementById('timeline-svg'),
            
            // Network
            networkContainer: document.getElementById('network-container'),
            networkLayout: document.getElementById('network-layout'),
            
            // Analytics charts
            volumeChart: document.getElementById('volume-analytics-chart'),
            typesChart: document.getElementById('types-analytics-chart'),
            performanceChart: document.getElementById('performance-analytics-chart'),
            sessionsChart: document.getElementById('sessions-analytics-chart'),
            
            // Modals
            shortcutsModal: document.getElementById('shortcuts-modal'),
            eventDetailsModal: document.getElementById('event-details-modal'),
            eventDetailsContent: document.getElementById('event-details-content'),
            settingsModal: document.getElementById('settings-modal'),
            
            // Filter controls
            filterChips: document.querySelectorAll('.filter-chip'),
            timeButtons: document.querySelectorAll('.time-btn'),
            advancedAppFilter: document.getElementById('advanced-app-filter'),
            advancedTypeFilter: document.getElementById('advanced-type-filter'),
            severityFilter: document.getElementById('severity-filter'),
            traceFilter: document.getElementById('trace-filter'),
            
            // Settings
            themeSelector: document.getElementById('theme-selector'),
            animationSpeed: document.getElementById('animation-speed'),
            refreshInterval: document.getElementById('refresh-interval'),
            soundNotifications: document.getElementById('sound-notifications'),
            browserNotifications: document.getElementById('browser-notifications'),
            maxEvents: document.getElementById('max-events'),
            
            // FAB
            mainFab: document.getElementById('main-fab'),
            fabMenu: document.getElementById('fab-menu'),
            
            // Notifications
            notificationsContainer: document.getElementById('notifications-container'),
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
        
        // Sidebar toggle
        this.elements.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.elements.menuToggle?.addEventListener('click', () => this.toggleSidebar());
        
        // View switching
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
        
        // Search
        this.elements.globalSearch?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.elements.globalSearch?.addEventListener('focus', () => this.showSearchSuggestions());
        this.elements.globalSearch?.addEventListener('blur', () => {
            setTimeout(() => this.hideSearchSuggestions(), 200);
        });
        
        // Events controls
        this.elements.pauseBtn?.addEventListener('click', () => this.togglePause());
        this.elements.autoScrollCheckbox?.addEventListener('change', (e) => {
            this.settings.autoScroll = e.target.checked;
            this.saveSettings();
        });
        this.elements.showDetailsCheckbox?.addEventListener('change', (e) => {
            this.settings.showDetails = e.target.checked;
            this.saveSettings();
            this.renderEvents();
        });
        this.elements.groupBySessionCheckbox?.addEventListener('change', (e) => {
            this.settings.groupBySession = e.target.checked;
            this.saveSettings();
            this.renderEvents();
        });
        
        // Filter controls
        this.elements.filterChips.forEach(chip => {
            chip.addEventListener('click', () => this.setQuickFilter(chip.dataset.filter));
        });
        
        this.elements.timeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setTimeRange(btn.dataset.range));
        });
        
        // Advanced filters
        this.elements.severityFilter?.addEventListener('change', (e) => {
            this.filters.severity = e.target.value;
            this.applyFilters();
        });
        
        this.elements.traceFilter?.addEventListener('input', (e) => {
            this.filters.traceId = e.target.value;
            this.applyFilters();
        });
        
        // Timeline controls
        document.querySelector('[onclick="zoomTimelineIn()"]')?.addEventListener('click', () => this.zoomTimelineIn());
        document.querySelector('[onclick="zoomTimelineOut()"]')?.addEventListener('click', () => this.zoomTimelineOut());
        document.querySelector('[onclick="resetTimelineZoom()"]')?.addEventListener('click', () => this.resetTimelineZoom());
        
        // Network controls
        document.querySelector('[onclick="centerNetwork()"]')?.addEventListener('click', () => this.centerNetwork());
        document.querySelector('[onclick="fitNetwork()"]')?.addEventListener('click', () => this.fitNetwork());
        this.elements.networkLayout?.addEventListener('change', (e) => this.changeNetworkLayout(e.target.value));
        
        // Settings
        this.elements.themeSelector?.addEventListener('change', (e) => this.changeTheme(e.target.value));
        
        // FAB
        this.elements.mainFab?.addEventListener('click', () => this.toggleFabMenu());
        
        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }
    
    handleKeyboardShortcut(e) {
        // Don't handle shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') {
                e.target.blur();
                this.hideSearchSuggestions();
            }
            return;
        }
        
        switch (e.key) {
            case '?':
                e.preventDefault();
                this.showShortcuts();
                break;
            case '/':
                e.preventDefault();
                this.elements.globalSearch?.focus();
                break;
            case 'Escape':
                this.closeAllModals();
                this.elements.globalSearch.value = '';
                this.handleSearch('');
                break;
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
            case '1':
                e.preventDefault();
                this.switchView('events');
                break;
            case '2':
                e.preventDefault();
                this.switchView('timeline');
                break;
            case '3':
                e.preventDefault();
                this.switchView('network');
                break;
            case '4':
                e.preventDefault();
                this.switchView('analytics');
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                this.refreshAllData();
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.clearEvents();
                break;
            case 'e':
            case 'E':
                e.preventDefault();
                this.exportAllData();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleSidebar();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                this.toggleTheme();
                break;
            case 's':
            case 'S':
                e.preventDefault();
                this.openSettings();
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                this.elements.autoScrollCheckbox.checked = !this.elements.autoScrollCheckbox.checked;
                this.settings.autoScroll = this.elements.autoScrollCheckbox.checked;
                this.saveSettings();
                break;
        }
    }
    
    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }
        
        console.log('🔌 Connecting to WebSocket:', this.wsUrl);
        
        // Test HTTP connectivity first
        fetch(`${this.baseUrl}/health`)
            .then(response => response.json())
            .then(data => {
                console.log('✅ Server health check passed:', data);
                this.attemptWebSocketConnection();
            })
            .catch(error => {
                console.error('❌ Server health check failed:', error);
                this.showNotification('Server not reachable. Check if server is running.', 'error');
                // Still try WebSocket connection after delay
                setTimeout(() => this.attemptWebSocketConnection(), 3000);
            });
    }
    
    attemptWebSocketConnection() {
        this.ws = new WebSocket(this.wsUrl);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
            console.log('⏱️ WebSocket connection timeout');
            this.ws.close();
            this.showNotification('Connection timeout. Retrying...', 'error');
        }, 10000);
        
        this.ws.onopen = () => {
            clearTimeout(connectionTimeout);
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus();
            this.showNotification('Connected to observability server', 'success');
            
            // Send initial ping
            this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        };
        
        this.ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            console.log('❌ WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
            this.isConnected = false;
            this.updateConnectionStatus();
            
            if (event.code !== 1000) { // Not a normal closure
                this.showNotification('Connection lost. Reconnecting...', 'error');
                // Reconnect with exponential backoff
                const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts || 0), 30000);
                setTimeout(() => {
                    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
                    this.connectWebSocket();
                }, delay);
            }
        };
        
        this.ws.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('🚨 WebSocket error:', error);
            this.showNotification('WebSocket connection error - check server status', 'error');
        };
        
        this.ws.onmessage = (event) => {
            // Reset reconnect attempts on successful message
            this.reconnectAttempts = 0;
            
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('📨 Error parsing WebSocket message:', error);
                console.log('Raw message:', event.data);
            }
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'init':
                this.events = data.events || [];
                this.applyFilters();
                this.updateAllViews();
                break;
                
            case 'event':
                if (!this.isPaused) {
                    this.addEvent(data.data);
                }
                break;
                
            case 'stats':
                this.updateStats(data.data);
                break;
                
            case 'alert':
                this.showAlert(data.data);
                break;
        }
    }
    
    addEvent(event) {
        // Add to events array
        this.events.unshift(event);
        
        // Limit events in memory
        if (this.events.length > this.settings.maxEvents) {
            this.events = this.events.slice(0, this.settings.maxEvents);
        }
        
        // Update agent tracking
        this.updateAgentStats(event);
        
        // Apply filters and update display
        this.applyFilters();
        this.updateRealTimeStats();
        
        // Show notification for errors
        if (event.event_type === 'error' && this.settings.browserNotifications) {
            this.showNotification(`Error in ${event.app}: ${event.summary}`, 'error');
        }
        
        // Play sound notification
        if (this.settings.soundNotifications && event.event_type === 'error') {
            this.playNotificationSound();
        }
        
        // Update flow visualization
        this.updateFlowVisualization(event);
    }
    
    updateAgentStats(event) {
        if (!this.agents.has(event.app)) {
            this.agents.set(event.app, {
                name: event.app,
                events: 0,
                errors: 0,
                lastSeen: event.timestamp,
                sessions: new Set()
            });
        }
        
        const agent = this.agents.get(event.app);
        agent.events++;
        agent.lastSeen = event.timestamp;
        agent.sessions.add(event.session_id);
        
        if (event.event_type === 'error') {
            agent.errors++;
        }
    }
    
    applyFilters() {
        let filtered = [...this.events];
        
        // Time range filter
        if (this.filters.timeRange !== 'live') {
            const now = Date.now();
            let cutoff;
            
            switch (this.filters.timeRange) {
                case '1h':
                    cutoff = now - 3600000;
                    break;
                case '24h':
                    cutoff = now - 86400000;
                    break;
                case '7d':
                    cutoff = now - 604800000;
                    break;
            }
            
            if (cutoff) {
                filtered = filtered.filter(e => new Date(e.timestamp).getTime() > cutoff);
            }
        }
        
        // Quick filters
        switch (this.filters.quickFilter) {
            case 'errors':
                filtered = filtered.filter(e => e.event_type === 'error');
                break;
            case 'warnings':
                filtered = filtered.filter(e => e.event_type === 'warning');
                break;
            case 'recent':
                const fiveMinAgo = Date.now() - 300000;
                filtered = filtered.filter(e => new Date(e.timestamp).getTime() > fiveMinAgo);
                break;
        }
        
        // Advanced filters
        if (this.filters.apps.length > 0) {
            filtered = filtered.filter(e => this.filters.apps.includes(e.app));
        }
        
        if (this.filters.types.length > 0) {
            filtered = filtered.filter(e => this.filters.types.includes(e.event_type));
        }
        
        if (this.filters.severity) {
            const severityNum = parseInt(this.filters.severity);
            filtered = filtered.filter(e => (e.severity || 1) >= severityNum);
        }
        
        if (this.filters.traceId) {
            filtered = filtered.filter(e => e.trace_id && e.trace_id.includes(this.filters.traceId));
        }
        
        // Search filter
        if (this.filters.searchTerm) {
            const term = this.filters.searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                e.app.toLowerCase().includes(term) ||
                e.event_type.toLowerCase().includes(term) ||
                (e.summary && e.summary.toLowerCase().includes(term)) ||
                e.payload.toLowerCase().includes(term)
            );
        }
        
        this.filteredEvents = filtered;
        this.updateCurrentView();
    }
    
    updateCurrentView() {
        switch (this.currentView) {
            case 'events':
                this.renderEvents();
                break;
            case 'timeline':
                this.renderTimeline();
                break;
            case 'network':
                this.renderNetwork();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }
    
    renderEvents() {
        if (!this.elements.eventsContainer) return;
        
        const events = this.settings.groupBySession ? this.groupEventsBySession() : this.filteredEvents;
        
        if (events.length === 0) {
            this.elements.eventsContainer.innerHTML = '<div class="loading">No events match current filters</div>';
            return;
        }
        
        const eventsHtml = events.slice(0, 100).map(event => this.renderEventCard(event)).join('');
        this.elements.eventsContainer.innerHTML = eventsHtml;
        
        // Auto-scroll to top if enabled
        if (this.settings.autoScroll && this.filteredEvents.length > 0) {
            this.elements.eventsContainer.scrollTop = 0;
        }
        
        // Add click handlers for event details
        this.elements.eventsContainer.querySelectorAll('.event').forEach((el, index) => {
            el.addEventListener('click', () => this.showEventDetails(this.filteredEvents[index]));
        });
    }
    
    renderEventCard(event) {
        const time = new Date(event.timestamp).toLocaleString();
        const eventClasses = ['event'];
        
        if (event.event_type === 'error') eventClasses.push('error');
        if (event.event_type === 'warning') eventClasses.push('warning');
        
        // Check if event is new (within last 5 seconds)
        if (Date.now() - new Date(event.timestamp).getTime() < 5000) {
            eventClasses.push('new');
        }
        
        const badges = [
            `<span class="event-badge badge-app">${event.app}</span>`,
            `<span class="event-badge badge-session">${event.session_id.substring(0, 8)}</span>`,
            `<span class="event-badge badge-type-${event.event_type}">${event.event_type}</span>`
        ];
        
        if (event.trace_id) {
            badges.push(`<span class="event-badge">🔗 ${event.trace_id.substring(0, 8)}</span>`);
        }
        
        const summary = event.summary || 'No summary available';
        const payload = this.settings.showDetails ? 
            `<div class="event-payload">${JSON.stringify(JSON.parse(event.payload), null, 2)}</div>` : '';
        
        const actions = [
            '<span class="event-action" onclick="event.stopPropagation()">📋 Copy</span>',
            '<span class="event-action" onclick="event.stopPropagation()">⭐ Bookmark</span>',
            '<span class="event-action" onclick="event.stopPropagation()">🔗 Trace</span>'
        ];
        
        return `
            <div class="${eventClasses.join(' ')}" data-event-id="${event.id || Date.now()}">
                <div class="event-header">
                    <div class="event-badges">${badges.join('')}</div>
                    <div class="event-timestamp">${time}</div>
                </div>
                <div class="event-summary">${summary}</div>
                <div class="event-actions">${actions.join('')}</div>
                ${payload}
            </div>
        `;
    }
    
    groupEventsBySession() {
        const sessions = new Map();
        
        this.filteredEvents.forEach(event => {
            if (!sessions.has(event.session_id)) {
                sessions.set(event.session_id, []);
            }
            sessions.get(event.session_id).push(event);
        });
        
        // Flatten and sort by most recent session activity
        return Array.from(sessions.entries())
            .sort((a, b) => new Date(b[1][0].timestamp) - new Date(a[1][0].timestamp))
            .flatMap(([sessionId, events]) => events);
    }
    
    initCharts() {
        // Volume Analytics Chart
        if (this.elements.volumeChart) {
            this.charts.volume = new Chart(this.elements.volumeChart, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Events',
                        data: [],
                        borderColor: '#2196f3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: true,
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
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        }
                    }
                }
            });
        }
        
        // Types Analytics Chart
        if (this.elements.typesChart) {
            this.charts.types = new Chart(this.elements.typesChart, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#2196f3', '#4caf50', '#ff9800', '#f44336', 
                            '#9c27b0', '#00bcd4', '#795548', '#607d8b'
                        ],
                        borderColor: '#141414',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#e0e0e0' }
                        }
                    }
                }
            });
        }
        
        // Performance Analytics Chart
        if (this.elements.performanceChart) {
            this.charts.performance = new Chart(this.elements.performanceChart, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [],
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        borderColor: '#4caf50',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        }
                    }
                }
            });
        }
        
        // Sessions Analytics Chart
        if (this.elements.sessionsChart) {
            this.charts.sessions = new Chart(this.elements.sessionsChart, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Active Sessions',
                        data: [],
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
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
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#a0a0a0' }
                        }
                    }
                }
            });
        }
    }
    
    renderAnalytics() {
        this.updateVolumeChart();
        this.updateTypesChart();
        this.updatePerformanceChart();
        this.updateSessionsChart();
    }
    
    updateVolumeChart() {
        if (!this.charts.volume) return;
        
        // Generate hourly data for last 24 hours
        const now = Date.now();
        const labels = [];
        const data = [];
        
        for (let i = 23; i >= 0; i--) {
            const hourStart = now - i * 3600000;
            const hourEnd = hourStart + 3600000;
            const hourLabel = new Date(hourStart).getHours() + ':00';
            
            const eventsInHour = this.filteredEvents.filter(e => {
                const eventTime = new Date(e.timestamp).getTime();
                return eventTime >= hourStart && eventTime < hourEnd;
            }).length;
            
            labels.push(hourLabel);
            data.push(eventsInHour);
        }
        
        this.charts.volume.data.labels = labels;
        this.charts.volume.data.datasets[0].data = data;
        this.charts.volume.update('none');
    }
    
    updateTypesChart() {
        if (!this.charts.types) return;
        
        const typeCounts = new Map();
        this.filteredEvents.forEach(event => {
            typeCounts.set(event.event_type, (typeCounts.get(event.event_type) || 0) + 1);
        });
        
        const labels = Array.from(typeCounts.keys());
        const data = Array.from(typeCounts.values());
        
        this.charts.types.data.labels = labels;
        this.charts.types.data.datasets[0].data = data;
        this.charts.types.update('none');
    }
    
    updatePerformanceChart() {
        if (!this.charts.performance) return;
        
        const agentPerformance = new Map();
        
        this.agents.forEach((agent, name) => {
            const errorRate = agent.events > 0 ? (agent.errors / agent.events * 100) : 0;
            agentPerformance.set(name, errorRate);
        });
        
        const labels = Array.from(agentPerformance.keys()).slice(0, 10);
        const data = labels.map(label => agentPerformance.get(label));
        
        this.charts.performance.data.labels = labels;
        this.charts.performance.data.datasets[0].data = data;
        this.charts.performance.update('none');
    }
    
    updateSessionsChart() {
        if (!this.charts.sessions) return;
        
        // Generate session count over time
        const now = Date.now();
        const labels = [];
        const data = [];
        
        for (let i = 11; i >= 0; i--) {
            const periodStart = now - i * 300000; // 5-minute intervals
            const periodEnd = periodStart + 300000;
            const periodLabel = new Date(periodStart).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const sessionsInPeriod = new Set(
                this.filteredEvents
                    .filter(e => {
                        const eventTime = new Date(e.timestamp).getTime();
                        return eventTime >= periodStart && eventTime < periodEnd;
                    })
                    .map(e => e.session_id)
            ).size;
            
            labels.push(periodLabel);
            data.push(sessionsInPeriod);
        }
        
        this.charts.sessions.data.labels = labels;
        this.charts.sessions.data.datasets[0].data = data;
        this.charts.sessions.update('none');
    }
    
    renderTimeline() {
        if (!this.elements.timelineSvg) return;
        
        // Clear previous timeline
        d3.select(this.elements.timelineSvg).selectAll('*').remove();
        
        const container = this.elements.timelineContainer;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const svg = d3.select(this.elements.timelineSvg)
            .attr('width', width)
            .attr('height', height);
        
        if (this.filteredEvents.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('fill', '#a0a0a0')
                .text('No events to display');
            return;
        }
        
        // Create timeline scales
        const timeExtent = d3.extent(this.filteredEvents, d => new Date(d.timestamp));
        const xScale = d3.scaleTime()
            .domain(timeExtent)
            .range([50, width - 50]);
        
        const yScale = d3.scaleBand()
            .domain([...new Set(this.filteredEvents.map(d => d.app))])
            .range([50, height - 50])
            .padding(0.1);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')))
            .style('color', '#a0a0a0');
        
        svg.append('g')
            .attr('transform', 'translate(50, 0)')
            .call(d3.axisLeft(yScale))
            .style('color', '#a0a0a0');
        
        // Add event points
        svg.selectAll('.timeline-event')
            .data(this.filteredEvents.slice(0, 500)) // Limit for performance
            .enter()
            .append('circle')
            .attr('class', 'timeline-event')
            .attr('cx', d => xScale(new Date(d.timestamp)))
            .attr('cy', d => yScale(d.app) + yScale.bandwidth() / 2)
            .attr('r', 4)
            .style('fill', d => this.getEventColor(d.event_type))
            .style('opacity', 0.8)
            .on('mouseover', (event, d) => this.showTimelineTooltip(event, d))
            .on('mouseout', () => this.hideTimelineTooltip())
            .on('click', (event, d) => this.showEventDetails(d));
    }
    
    getEventColor(eventType) {
        const colors = {
            'error': '#f44336',
            'warning': '#ff9800',
            'info': '#2196f3',
            'debug': '#4caf50',
            'llm_request': '#9c27b0',
            'llm_response': '#00bcd4',
            'tool_use': '#795548'
        };
        return colors[eventType] || '#607d8b';
    }
    
    renderNetwork() {
        if (!this.elements.networkContainer) return;
        
        // Create network graph using vis-network
        const nodes = [];
        const edges = [];
        const nodeIds = new Set();
        
        // Add agent nodes
        this.agents.forEach((agent, name) => {
            if (!nodeIds.has(name)) {
                nodes.push({
                    id: name,
                    label: name,
                    group: 'agent',
                    size: Math.min(20 + agent.events / 10, 50),
                    color: {
                        background: '#2196f3',
                        border: '#1976d2'
                    }
                });
                nodeIds.add(name);
            }
        });
        
        // Add session nodes and connections
        const sessionMap = new Map();
        this.filteredEvents.forEach(event => {
            const sessionId = event.session_id;
            if (!sessionMap.has(sessionId)) {
                sessionMap.set(sessionId, new Set());
            }
            sessionMap.get(sessionId).add(event.app);
        });
        
        sessionMap.forEach((agents, sessionId) => {
            if (agents.size > 1) { // Only show sessions with multiple agents
                const sessionNodeId = `session_${sessionId}`;
                if (!nodeIds.has(sessionNodeId)) {
                    nodes.push({
                        id: sessionNodeId,
                        label: `Session ${sessionId.substring(0, 8)}`,
                        group: 'session',
                        size: 15,
                        color: {
                            background: '#ff9800',
                            border: '#f57c00'
                        }
                    });
                    nodeIds.add(sessionNodeId);
                }
                
                // Connect agents to session
                agents.forEach(agentName => {
                    edges.push({
                        from: agentName,
                        to: sessionNodeId,
                        color: { color: '#666' },
                        width: 1
                    });
                });
            }
        });
        
        const data = { nodes, edges };
        const options = {
            physics: {
                enabled: this.elements.networkLayout?.value === 'physics'
            },
            layout: {
                hierarchical: this.elements.networkLayout?.value === 'hierarchical' ? {
                    direction: 'UD',
                    sortMethod: 'directed'
                } : false
            },
            interaction: {
                hover: true,
                selectConnectedEdges: false
            },
            nodes: {
                font: { color: '#e0e0e0' }
            }
        };
        
        if (this.network) {
            this.network.destroy();
        }
        
        this.network = new vis.Network(this.elements.networkContainer, data, options);
        
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (nodeId.startsWith('session_')) {
                    const sessionId = nodeId.replace('session_', '');
                    this.filterBySession(sessionId);
                } else {
                    this.filterByAgent(nodeId);
                }
            }
        });
    }
    
    // Utility methods for UI interactions
    switchView(viewName) {
        this.currentView = viewName;
        
        // Update view buttons
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        // Update view containers
        this.elements.viewContainers.forEach(container => {
            container.classList.toggle('active', container.id === `${viewName}-view`);
        });
        
        // Render the selected view
        this.updateCurrentView();
    }
    
    toggleSidebar() {
        this.elements.sidebar?.classList.toggle('collapsed');
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.elements.pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸ Pause';
        this.elements.pauseBtn.classList.toggle('btn-primary', !this.isPaused);
        
        this.showNotification(
            this.isPaused ? 'Event stream paused' : 'Event stream resumed',
            'info'
        );
    }
    
    setQuickFilter(filter) {
        this.filters.quickFilter = filter;
        
        // Update UI
        this.elements.filterChips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });
        
        this.applyFilters();
    }
    
    setTimeRange(range) {
        this.filters.timeRange = range;
        
        // Update UI
        this.elements.timeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        this.applyFilters();
    }
    
    handleSearch(term) {
        this.filters.searchTerm = term;
        this.applyFilters();
        
        if (term) {
            this.updateSearchSuggestions(term);
        } else {
            this.hideSearchSuggestions();
        }
    }
    
    updateSearchSuggestions(term) {
        const suggestions = [];
        const termLower = term.toLowerCase();
        
        // Add app suggestions
        const apps = [...new Set(this.events.map(e => e.app))]
            .filter(app => app.toLowerCase().includes(termLower))
            .slice(0, 3);
        apps.forEach(app => suggestions.push({ type: 'app', value: app }));
        
        // Add event type suggestions
        const types = [...new Set(this.events.map(e => e.event_type))]
            .filter(type => type.toLowerCase().includes(termLower))
            .slice(0, 3);
        types.forEach(type => suggestions.push({ type: 'type', value: type }));
        
        this.renderSearchSuggestions(suggestions);
    }
    
    renderSearchSuggestions(suggestions) {
        if (!this.elements.searchSuggestions || suggestions.length === 0) {
            this.hideSearchSuggestions();
            return;
        }
        
        const html = suggestions.map(suggestion => 
            `<div class="suggestion-item" data-value="${suggestion.value}">
                <span class="suggestion-type">${suggestion.type}</span>
                <span class="suggestion-value">${suggestion.value}</span>
            </div>`
        ).join('');
        
        this.elements.searchSuggestions.innerHTML = html;
        this.elements.searchSuggestions.style.display = 'block';
        
        // Add click handlers
        this.elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.elements.globalSearch.value = item.dataset.value;
                this.handleSearch(item.dataset.value);
                this.hideSearchSuggestions();
            });
        });
    }
    
    showSearchSuggestions() {
        if (this.elements.globalSearch?.value) {
            this.updateSearchSuggestions(this.elements.globalSearch.value);
        }
    }
    
    hideSearchSuggestions() {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.style.display = 'none';
        }
    }
    
    showEventDetails(event) {
        if (!this.elements.eventDetailsModal || !this.elements.eventDetailsContent) return;
        
        let payload;
        try {
            payload = JSON.stringify(JSON.parse(event.payload), null, 2);
        } catch (e) {
            payload = event.payload;
        }
        
        const content = `
            <div class="event-detail-section">
                <h4>📋 Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item"><strong>App:</strong> ${event.app}</div>
                    <div class="detail-item"><strong>Type:</strong> ${event.event_type}</div>
                    <div class="detail-item"><strong>Session:</strong> ${event.session_id}</div>
                    <div class="detail-item"><strong>Timestamp:</strong> ${new Date(event.timestamp).toLocaleString()}</div>
                    ${event.trace_id ? `<div class="detail-item"><strong>Trace ID:</strong> ${event.trace_id}</div>` : ''}
                    ${event.span_id ? `<div class="detail-item"><strong>Span ID:</strong> ${event.span_id}</div>` : ''}
                </div>
            </div>
            
            ${event.summary ? `
                <div class="event-detail-section">
                    <h4>📝 Summary</h4>
                    <div class="detail-content">${event.summary}</div>
                </div>
            ` : ''}
            
            <div class="event-detail-section">
                <h4>📦 Payload</h4>
                <pre class="detail-payload">${payload}</pre>
            </div>
        `;
        
        this.elements.eventDetailsContent.innerHTML = content;
        this.showModal('event-details-modal');
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        });
    }
    
    showShortcuts() {
        this.showModal('shortcuts-modal');
    }
    
    openSettings() {
        this.showModal('settings-modal');
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        this.settings.theme = theme;
        this.saveSettings();
        this.applyTheme();
        
        if (this.elements.themeSelector) {
            this.elements.themeSelector.value = theme;
        }
    }
    
    applyTheme() {
        if (this.settings.theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', this.settings.theme);
        }
    }
    
    updateConnectionStatus() {
        if (!this.elements.connectionStatus) return;
        
        if (this.isConnected) {
            this.elements.connectionStatus.classList.remove('status-disconnected');
            this.elements.connectionStatus.classList.add('status-connected');
            this.elements.connectionStatus.querySelector('.status-text').textContent = 'Connected';
        } else {
            this.elements.connectionStatus.classList.remove('status-connected');
            this.elements.connectionStatus.classList.add('status-disconnected');
            this.elements.connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
        }
    }
    
    updateRealTimeStats() {
        // Calculate current stats
        const now = Date.now();
        const last5min = this.events.filter(e => 
            now - new Date(e.timestamp).getTime() < 5 * 60 * 1000
        );
        
        this.stats = {
            total: this.events.length,
            agents: this.agents.size,
            errors: this.events.filter(e => e.event_type === 'error').length,
            sessions: new Set(this.events.map(e => e.session_id)).size,
            avgResponse: this.calculateAverageResponseTime(),
            eventRate: Math.round(last5min.length / 5 * 60) // events per minute
        };
        
        // Update UI
        if (this.elements.statElements.total) {
            this.elements.statElements.total.textContent = this.stats.total;
        }
        if (this.elements.statElements.agents) {
            this.elements.statElements.agents.textContent = this.stats.agents;
        }
        if (this.elements.statElements.errors) {
            const errorRate = this.stats.total > 0 ? 
                Math.round(this.stats.errors / this.stats.total * 100) : 0;
            this.elements.statElements.errors.textContent = `${errorRate}%`;
        }
        if (this.elements.statElements.sessions) {
            this.elements.statElements.sessions.textContent = this.stats.sessions;
        }
        if (this.elements.statElements.response) {
            this.elements.statElements.response.textContent = `${this.stats.avgResponse}ms`;
        }
        if (this.elements.eventRate) {
            this.elements.eventRate.querySelector('.status-text').textContent = `${this.stats.eventRate}/min`;
        }
    }
    
    calculateAverageResponseTime() {
        const responseTimes = [];
        
        this.events.forEach(event => {
            try {
                const payload = JSON.parse(event.payload);
                if (payload.duration) {
                    responseTimes.push(payload.duration);
                }
            } catch (e) {
                // Ignore parse errors
            }
        });
        
        if (responseTimes.length === 0) return 0;
        
        const sum = responseTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / responseTimes.length);
    }
    
    updateFlowVisualization(event) {
        // Simple real-time flow visualization
        if (!this.elements.flowVisualization) return;
        
        const flowItem = document.createElement('div');
        flowItem.className = 'flow-item';
        flowItem.style.cssText = `
            width: 100%;
            height: 20px;
            background: ${this.getEventColor(event.event_type)};
            margin-bottom: 2px;
            border-radius: 2px;
            animation: slideIn 0.3s ease-out;
            opacity: 0.8;
            font-size: 10px;
            line-height: 20px;
            padding: 0 5px;
            color: white;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
        `;
        flowItem.textContent = `${event.app}: ${event.event_type}`;
        
        this.elements.flowVisualization.insertBefore(flowItem, this.elements.flowVisualization.firstChild);
        
        // Remove old items
        const items = this.elements.flowVisualization.children;
        if (items.length > 20) {
            this.elements.flowVisualization.removeChild(items[items.length - 1]);
        }
        
        // Fade out after 5 seconds
        setTimeout(() => {
            if (flowItem.parentNode) {
                flowItem.style.opacity = '0.2';
            }
        }, 5000);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${type.toUpperCase()}</div>
            <div>${message}</div>
        `;
        
        this.elements.notificationsContainer?.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    playNotificationSound() {
        // Create a simple beep sound
        if (typeof AudioContext !== 'undefined') {
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    }
    
    // Settings persistence
    saveSettings() {
        localStorage.setItem('observability-settings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('observability-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
    
    // Data management
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data from:', `${this.baseUrl}/events?limit=200`);
            const response = await fetch(`${this.baseUrl}/events?limit=200`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const events = await response.json();
            console.log('✅ Loaded', events.length, 'initial events');
            
            this.events = events || [];
            this.applyFilters();
            this.updateAllViews();
            
            // Show some demo data if no events exist
            if (this.events.length === 0) {
                this.addDemoData();
            }
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            this.showNotification(`Failed to load data: ${error.message}`, 'error');
            
            // Show demo data as fallback
            this.addDemoData();
        }
    }
    
    addDemoData() {
        console.log('📝 Adding demo data for testing');
        const demoEvents = [
            {
                id: 1,
                timestamp: new Date().toISOString(),
                app: 'Claude-Agent',
                session_id: 'demo-session-1',
                event_type: 'llm_request',
                summary: 'User requested code analysis',
                payload: JSON.stringify({
                    model: 'claude-3-opus',
                    tokens: 1234,
                    duration: 850
                })
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 30000).toISOString(),
                app: 'GPT-Agent',
                session_id: 'demo-session-2',
                event_type: 'tool_use',
                summary: 'File read operation completed',
                payload: JSON.stringify({
                    tool: 'file_reader',
                    file_path: '/src/api.js',
                    duration: 150
                })
            },
            {
                id: 3,
                timestamp: new Date(Date.now() - 60000).toISOString(),
                app: 'DeepSeek-Agent',
                session_id: 'demo-session-1',
                event_type: 'error',
                summary: 'Rate limit exceeded',
                payload: JSON.stringify({
                    error_code: 'RATE_LIMIT',
                    retry_after: 60,
                    requests_per_minute: 60
                })
            }
        ];
        
        this.events = demoEvents;
        this.applyFilters();
        this.updateAllViews();
        this.showNotification('Demo data loaded - connect to server for live events', 'info');
    }
    
    updateAllViews() {
        this.updateRealTimeStats();
        this.updateCurrentView();
        
        // Update filter options
        this.updateFilterOptions();
    }
    
    updateFilterOptions() {
        // Update app filter options
        if (this.elements.advancedAppFilter) {
            const apps = [...new Set(this.events.map(e => e.app))];
            this.elements.advancedAppFilter.innerHTML = apps.map(app => 
                `<option value="${app}">${app}</option>`
            ).join('');
        }
        
        // Update type filter options
        if (this.elements.advancedTypeFilter) {
            const types = [...new Set(this.events.map(e => e.event_type))];
            this.elements.advancedTypeFilter.innerHTML = types.map(type => 
                `<option value="${type}">${type}</option>`
            ).join('');
        }
    }
    
    startUpdateIntervals() {
        // Update stats every second
        setInterval(() => {
            if (!this.isPaused) {
                this.updateRealTimeStats();
            }
        }, 1000);
        
        // Update analytics every 30 seconds
        setInterval(() => {
            if (this.currentView === 'analytics') {
                this.renderAnalytics();
            }
        }, 30000);
    }
    
    // Action methods for UI buttons
    clearEvents() {
        if (confirm('Are you sure you want to clear all events?')) {
            this.events = [];
            this.filteredEvents = [];
            this.agents.clear();
            this.sessions.clear();
            this.updateAllViews();
            this.showNotification('All events cleared', 'info');
        }
    }
    
    async exportEvents() {
        const data = {
            events: this.filteredEvents,
            stats: this.stats,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `observability-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Events exported successfully', 'success');
    }
    
    async refreshAllData() {
        this.showLoadingOverlay('Refreshing data...');
        await this.loadInitialData();
        this.hideLoadingOverlay();
        this.showNotification('Data refreshed', 'success');
    }
    
    async exportAllData() {
        try {
            const response = await fetch(`${this.baseUrl}/events/export`);
            const blob = await response.blob();
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `observability-full-export-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Full export completed', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed', 'error');
        }
    }
    
    toggleFabMenu() {
        this.elements.fabMenu?.classList.toggle('hidden');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    shareCurrentView() {
        const url = new URL(window.location);
        url.searchParams.set('view', this.currentView);
        url.searchParams.set('filters', JSON.stringify(this.filters));
        
        if (navigator.share) {
            navigator.share({
                title: 'Claude Code Observability Dashboard',
                url: url.toString()
            });
        } else {
            navigator.clipboard.writeText(url.toString());
            this.showNotification('Share URL copied to clipboard', 'success');
        }
    }
    
    showLoadingOverlay(text = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.querySelector('.loading-text').textContent = text;
            this.elements.loadingOverlay.classList.remove('hidden');
        }
    }
    
    hideLoadingOverlay() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }
    
    // Timeline controls
    zoomTimelineIn() {
        // Implementation for timeline zoom
        this.showNotification('Timeline zoomed in', 'info');
    }
    
    zoomTimelineOut() {
        // Implementation for timeline zoom
        this.showNotification('Timeline zoomed out', 'info');
    }
    
    resetTimelineZoom() {
        this.renderTimeline();
        this.showNotification('Timeline zoom reset', 'info');
    }
    
    // Network controls
    centerNetwork() {
        if (this.network) {
            this.network.focus();
        }
    }
    
    fitNetwork() {
        if (this.network) {
            this.network.fit();
        }
    }
    
    changeNetworkLayout(layout) {
        this.renderNetwork();
    }
    
    // Filter helpers
    filterByAgent(agentName) {
        this.filters.apps = [agentName];
        this.applyFilters();
        this.switchView('events');
        this.showNotification(`Filtered by agent: ${agentName}`, 'info');
    }
    
    filterBySession(sessionId) {
        this.filters.searchTerm = sessionId;
        this.applyFilters();
        this.switchView('events');
        this.showNotification(`Filtered by session: ${sessionId.substring(0, 8)}`, 'info');
    }
    
    applyCustomTimeRange() {
        const startTime = document.getElementById('start-time')?.value;
        const endTime = document.getElementById('end-time')?.value;
        
        if (startTime && endTime) {
            this.filters.customTimeRange = { startTime, endTime };
            this.applyFilters();
            this.showNotification('Custom time range applied', 'info');
        }
    }
    
    saveCurrentSearch() {
        const searchName = prompt('Enter a name for this search:');
        if (searchName) {
            const savedSearches = JSON.parse(localStorage.getItem('saved-searches') || '[]');
            savedSearches.push({
                name: searchName,
                filters: { ...this.filters },
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('saved-searches', JSON.stringify(savedSearches));
            this.showNotification(`Search "${searchName}" saved`, 'success');
        }
    }
    
    clearAllData() {
        if (confirm('This will clear ALL data including settings. Continue?')) {
            localStorage.clear();
            this.events = [];
            this.filteredEvents = [];
            this.agents.clear();
            this.sessions.clear();
            this.settings = {
                theme: 'dark',
                animationSpeed: 'normal',
                refreshInterval: 5000,
                soundNotifications: true,
                browserNotifications: true,
                maxEvents: 1000,
                autoScroll: true,
                showDetails: true,
                groupBySession: false
            };
            this.updateAllViews();
            this.showNotification('All data cleared', 'info');
        }
    }
}

// Global functions for onclick handlers
window.showShortcuts = function() {
    window.dashboard?.showShortcuts();
};

window.toggleTheme = function() {
    window.dashboard?.toggleTheme();
};

window.openSettings = function() {
    window.dashboard?.openSettings();
};

window.closeModal = function(modalId) {
    window.dashboard?.closeModal(modalId);
};

window.clearEvents = function() {
    window.dashboard?.clearEvents();
};

window.exportEvents = function() {
    window.dashboard?.exportEvents();
};

window.refreshAllData = function() {
    window.dashboard?.refreshAllData();
};

window.exportAllData = function() {
    window.dashboard?.exportAllData();
};

window.toggleFullscreen = function() {
    window.dashboard?.toggleFullscreen();
};

window.shareCurrentView = function() {
    window.dashboard?.shareCurrentView();
};

window.applyCustomTimeRange = function() {
    window.dashboard?.applyCustomTimeRange();
};

window.saveCurrentSearch = function() {
    window.dashboard?.saveCurrentSearch();
};

window.clearAllData = function() {
    window.dashboard?.clearAllData();
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Starting Ultra-Enhanced Observability Dashboard');
    window.dashboard = new UltraEnhancedDashboard();
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (window.dashboard) {
        if (document.hidden) {
            console.log('📵 Dashboard paused (page hidden)');
        } else {
            console.log('📱 Dashboard resumed (page visible)');
            window.dashboard.loadInitialData();
        }
    }
});
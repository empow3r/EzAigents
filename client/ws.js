// State
let ws = null;
let events = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 2000;

// DOM elements
const eventsContainer = document.getElementById('events-container');
const connectionStatus = document.getElementById('connection-status');
const eventCount = document.getElementById('event-count');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const searchInput = document.getElementById('search');
const appFilter = document.getElementById('app-filter');
const typeFilter = document.getElementById('type-filter');
const autoScrollCheckbox = document.getElementById('auto-scroll');

// Unique apps and types tracking
const uniqueApps = new Set();

// Connect to WebSocket
function connect() {
    // Dynamic WebSocket URL detection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '3001';
    
    let wsUrl;
    if (window.location.protocol === 'file:') {
        // If accessing via file://, default to localhost:3001
        wsUrl = 'ws://localhost:3001/ws';
    } else {
        // Use the same host and port as the current page
        wsUrl = `${protocol}//${host}:${port}/ws`;
    }
    
    console.log('Connecting to WebSocket:', wsUrl);
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        connectionStatus.textContent = '🟢 Connected';
        connectionStatus.className = 'status-connected';
        reconnectAttempts = 0;
        eventsContainer.innerHTML = '';
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        connectionStatus.textContent = '⚫ Disconnected';
        connectionStatus.className = 'status-disconnected';
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(connect, reconnectDelay);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'history') {
                // Load historical events
                data.events.forEach(evt => {
                    const parsedEvent = {
                        ...evt,
                        payload: JSON.parse(evt.payload)
                    };
                    events.push(parsedEvent);
                    renderEvent(parsedEvent, false);
                });
                updateFilters();
                updateEventCount();
            } else {
                // New event
                events.push(data);
                renderEvent(data, true);
                updateFilters();
                updateEventCount();
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };
}

// Render event
function renderEvent(event, isNew = false) {
    // Track unique apps
    if (event.app) {
        uniqueApps.add(event.app);
    }
    
    // Check filters
    if (!matchesFilters(event)) {
        return;
    }
    
    const eventDiv = document.createElement('div');
    eventDiv.className = `event ${isNew ? 'new' : ''}`;
    eventDiv.dataset.eventId = event.id;
    
    const timestamp = new Date(event.timestamp).toLocaleString();
    const payloadId = `payload-${event.id || Date.now()}`;
    
    eventDiv.innerHTML = `
        <div class="event-header">
            <div class="event-meta">
                <span class="event-badge badge-app">${event.app}</span>
                <span class="event-badge badge-session">${event.session_id}</span>
                <span class="event-badge badge-type-${event.event_type}">${event.event_type}</span>
            </div>
            <span class="event-timestamp">${timestamp}</span>
        </div>
        ${event.summary ? `<div class="event-summary">${event.summary}</div>` : ''}
        <div class="event-payload-toggle" onclick="togglePayload('${payloadId}')">
            ▶ Show payload
        </div>
        <pre id="${payloadId}" class="event-payload hidden">${JSON.stringify(event.payload, null, 2)}</pre>
    `;
    
    eventsContainer.appendChild(eventDiv);
    
    // Auto-scroll
    if (autoScrollCheckbox.checked && isNew) {
        eventDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

// Toggle payload visibility
window.togglePayload = (id) => {
    const payload = document.getElementById(id);
    const toggle = payload.previousElementSibling;
    
    if (payload.classList.contains('hidden')) {
        payload.classList.remove('hidden');
        toggle.textContent = '▼ Hide payload';
    } else {
        payload.classList.add('hidden');
        toggle.textContent = '▶ Show payload';
    }
};

// Filter events
function matchesFilters(event) {
    const searchTerm = searchInput.value.toLowerCase();
    const appFilterValue = appFilter.value;
    const typeFilterValue = typeFilter.value;
    
    // Search filter
    if (searchTerm) {
        const searchableText = [
            event.app,
            event.session_id,
            event.event_type,
            event.summary || '',
            JSON.stringify(event.payload)
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
            return false;
        }
    }
    
    // App filter
    if (appFilterValue && event.app !== appFilterValue) {
        return false;
    }
    
    // Type filter
    if (typeFilterValue && event.event_type !== typeFilterValue) {
        return false;
    }
    
    return true;
}

// Update filters
function updateFilters() {
    // Update app filter options
    const currentApp = appFilter.value;
    appFilter.innerHTML = '<option value="">All Apps</option>';
    
    Array.from(uniqueApps).sort().forEach(app => {
        const option = document.createElement('option');
        option.value = app;
        option.textContent = app;
        appFilter.appendChild(option);
    });
    
    appFilter.value = currentApp;
}

// Re-render all events
function rerenderEvents() {
    eventsContainer.innerHTML = '';
    events.forEach(event => renderEvent(event, false));
}

// Update event count
function updateEventCount() {
    const visibleCount = document.querySelectorAll('.event').length;
    eventCount.textContent = `${visibleCount} events`;
}

// Event listeners
clearBtn.addEventListener('click', () => {
    eventsContainer.innerHTML = '';
    events = [];
    updateEventCount();
});

exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', `claude-events-${Date.now()}.json`);
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
});

searchInput.addEventListener('input', () => {
    rerenderEvents();
    updateEventCount();
});

appFilter.addEventListener('change', () => {
    rerenderEvents();
    updateEventCount();
});

typeFilter.addEventListener('change', () => {
    rerenderEvents();
    updateEventCount();
});

// Initialize
connect();
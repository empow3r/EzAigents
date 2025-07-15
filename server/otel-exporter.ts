import { Database } from "bun:sqlite";

/**
 * OpenTelemetry Exporter for Agent Observability
 * Exports traces and metrics in OTLP format
 */

interface OTelSpan {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    kind: number;
    startTimeUnixNano: string;
    endTimeUnixNano: string;
    attributes: { key: string; value: { stringValue?: string; intValue?: number; doubleValue?: number } }[];
    status: { code: number; message?: string };
}

interface OTelTrace {
    resourceSpans: {
        resource: {
            attributes: { key: string; value: { stringValue: string } }[];
        };
        scopeSpans: {
            scope: { name: string; version: string };
            spans: OTelSpan[];
        }[];
    }[];
}

interface OTelMetric {
    name: string;
    description: string;
    unit: string;
    gauge?: {
        dataPoints: {
            attributes: { key: string; value: { stringValue?: string; intValue?: number } }[];
            timeUnixNano: string;
            asDouble?: number;
            asInt?: number;
        }[];
    };
    sum?: {
        dataPoints: {
            attributes: { key: string; value: { stringValue?: string; intValue?: number } }[];
            startTimeUnixNano: string;
            timeUnixNano: string;
            asDouble?: number;
            asInt?: number;
        }[];
        aggregationTemporality: number;
        isMonotonic: boolean;
    };
}

export class OpenTelemetryExporter {
    private db: Database;
    
    constructor(dbPath: string = "./db/events.db") {
        this.db = new Database(dbPath);
    }
    
    /**
     * Export traces in OpenTelemetry format
     */
    async exportTraces(startTime?: string, endTime?: string): Promise<OTelTrace> {
        const timeFilter = startTime && endTime 
            ? `WHERE timestamp BETWEEN '${startTime}' AND '${endTime}'`
            : `WHERE timestamp > datetime('now', '-1 hour')`;
        
        // Get events grouped by trace_id
        const traces = this.db.prepare(`
            SELECT 
                trace_id,
                span_id,
                parent_span_id,
                app,
                session_id,
                event_type,
                timestamp,
                payload,
                summary
            FROM events 
            ${timeFilter}
            AND trace_id IS NOT NULL
            ORDER BY trace_id, timestamp
        `).all() as any[];
        
        // Group events by trace_id
        const traceGroups = new Map<string, any[]>();
        traces.forEach(event => {
            if (!traceGroups.has(event.trace_id)) {
                traceGroups.set(event.trace_id, []);
            }
            traceGroups.get(event.trace_id)!.push(event);
        });
        
        const resourceSpans = Array.from(traceGroups.entries()).map(([traceId, events]) => {
            const spans: OTelSpan[] = events.map(event => {
                const startTime = new Date(event.timestamp).getTime() * 1000000; // Convert to nanoseconds
                const endTime = startTime + 1000000; // Assume 1ms duration if not provided
                
                let payload: any = {};
                try {
                    payload = JSON.parse(event.payload);
                } catch (e) {
                    // Ignore parse errors
                }
                
                return {
                    traceId: this.formatTraceId(event.trace_id),
                    spanId: this.formatSpanId(event.span_id || this.generateSpanId()),
                    parentSpanId: event.parent_span_id ? this.formatSpanId(event.parent_span_id) : undefined,
                    name: event.summary || event.event_type,
                    kind: this.getSpanKind(event.event_type),
                    startTimeUnixNano: startTime.toString(),
                    endTimeUnixNano: endTime.toString(),
                    attributes: this.createAttributes({
                        'app.name': event.app,
                        'session.id': event.session_id,
                        'event.type': event.event_type,
                        'agent.type': payload.agent_type || 'unknown',
                        ...payload
                    }),
                    status: {
                        code: event.event_type === 'error' ? 2 : 1, // ERROR : OK
                        message: event.event_type === 'error' ? event.summary : undefined
                    }
                };
            });
            
            return {
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: 'agent-observability' } },
                        { key: 'service.version', value: { stringValue: '1.0.0' } },
                        { key: 'telemetry.sdk.name', value: { stringValue: 'claude-observability' } },
                        { key: 'telemetry.sdk.version', value: { stringValue: '1.0.0' } }
                    ]
                },
                scopeSpans: [{
                    scope: {
                        name: 'agent-observability',
                        version: '1.0.0'
                    },
                    spans
                }]
            };
        });
        
        return { resourceSpans };
    }
    
    /**
     * Export metrics in OpenTelemetry format
     */
    async exportMetrics(startTime?: string, endTime?: string): Promise<{ resourceMetrics: any[] }> {
        const timeFilter = startTime && endTime 
            ? `WHERE timestamp BETWEEN '${startTime}' AND '${endTime}'`
            : `WHERE timestamp > datetime('now', '-1 hour')`;
        
        // Get aggregated metrics
        const stats = this.db.prepare(`
            SELECT 
                app,
                event_type,
                COUNT(*) as count,
                COUNT(CASE WHEN event_type = 'error' THEN 1 END) as error_count,
                AVG(CASE WHEN payload LIKE '%duration%' THEN 
                    CAST(json_extract(payload, '$.duration') AS REAL) END) as avg_duration
            FROM events 
            ${timeFilter}
            GROUP BY app, event_type
        `).all() as any[];
        
        const now = Date.now() * 1000000; // Convert to nanoseconds
        
        const metrics: OTelMetric[] = [
            // Event count metric
            {
                name: 'agent_events_total',
                description: 'Total number of agent events',
                unit: '1',
                sum: {
                    dataPoints: stats.map(stat => ({
                        attributes: [
                            { key: 'app', value: { stringValue: stat.app } },
                            { key: 'event_type', value: { stringValue: stat.event_type } }
                        ],
                        startTimeUnixNano: (now - 3600000000000).toString(), // 1 hour ago
                        timeUnixNano: now.toString(),
                        asInt: stat.count
                    })),
                    aggregationTemporality: 2, // CUMULATIVE
                    isMonotonic: true
                }
            },
            
            // Error count metric
            {
                name: 'agent_errors_total',
                description: 'Total number of agent errors',
                unit: '1',
                sum: {
                    dataPoints: stats.filter(stat => stat.error_count > 0).map(stat => ({
                        attributes: [
                            { key: 'app', value: { stringValue: stat.app } }
                        ],
                        startTimeUnixNano: (now - 3600000000000).toString(),
                        timeUnixNano: now.toString(),
                        asInt: stat.error_count
                    })),
                    aggregationTemporality: 2,
                    isMonotonic: true
                }
            },
            
            // Response time metric
            {
                name: 'agent_response_time_seconds',
                description: 'Average response time of agent operations',
                unit: 's',
                gauge: {
                    dataPoints: stats.filter(stat => stat.avg_duration).map(stat => ({
                        attributes: [
                            { key: 'app', value: { stringValue: stat.app } },
                            { key: 'event_type', value: { stringValue: stat.event_type } }
                        ],
                        timeUnixNano: now.toString(),
                        asDouble: stat.avg_duration
                    }))
                }
            }
        ];
        
        return {
            resourceMetrics: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: 'agent-observability' } },
                        { key: 'service.version', value: { stringValue: '1.0.0' } }
                    ]
                },
                scopeMetrics: [{
                    scope: {
                        name: 'agent-observability',
                        version: '1.0.0'
                    },
                    metrics
                }]
            }]
        };
    }
    
    /**
     * Export logs in OpenTelemetry format
     */
    async exportLogs(startTime?: string, endTime?: string): Promise<{ resourceLogs: any[] }> {
        const timeFilter = startTime && endTime 
            ? `WHERE timestamp BETWEEN '${startTime}' AND '${endTime}'`
            : `WHERE timestamp > datetime('now', '-1 hour')`;
        
        const logs = this.db.prepare(`
            SELECT 
                trace_id,
                span_id,
                app,
                session_id,
                event_type,
                timestamp,
                payload,
                summary,
                severity
            FROM events 
            ${timeFilter}
            ORDER BY timestamp
        `).all() as any[];
        
        const logRecords = logs.map(log => {
            const timeUnixNano = new Date(log.timestamp).getTime() * 1000000;
            
            let payload: any = {};
            try {
                payload = JSON.parse(log.payload);
            } catch (e) {
                // Ignore parse errors
            }
            
            return {
                timeUnixNano: timeUnixNano.toString(),
                severityNumber: this.getSeverityNumber(log.severity || 1),
                severityText: this.getSeverityText(log.severity || 1),
                body: {
                    stringValue: log.summary || JSON.stringify(payload)
                },
                attributes: this.createAttributes({
                    'app.name': log.app,
                    'session.id': log.session_id,
                    'event.type': log.event_type,
                    'agent.type': payload.agent_type || 'unknown'
                }),
                traceId: log.trace_id ? this.formatTraceId(log.trace_id) : undefined,
                spanId: log.span_id ? this.formatSpanId(log.span_id) : undefined
            };
        });
        
        return {
            resourceLogs: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: 'agent-observability' } },
                        { key: 'service.version', value: { stringValue: '1.0.0' } }
                    ]
                },
                scopeLogs: [{
                    scope: {
                        name: 'agent-observability',
                        version: '1.0.0'
                    },
                    logRecords
                }]
            }]
        };
    }
    
    /**
     * Export all telemetry data
     */
    async exportAll(startTime?: string, endTime?: string) {
        const [traces, metrics, logs] = await Promise.all([
            this.exportTraces(startTime, endTime),
            this.exportMetrics(startTime, endTime),
            this.exportLogs(startTime, endTime)
        ]);
        
        return {
            traces,
            metrics,
            logs,
            exportedAt: new Date().toISOString()
        };
    }
    
    // Helper methods
    private formatTraceId(traceId: string): string {
        // Ensure trace ID is 32 hex characters (16 bytes)
        return traceId.padEnd(32, '0').substring(0, 32);
    }
    
    private formatSpanId(spanId: string): string {
        // Ensure span ID is 16 hex characters (8 bytes)
        return spanId.padEnd(16, '0').substring(0, 16);
    }
    
    private generateSpanId(): string {
        return Math.random().toString(16).substring(2, 10);
    }
    
    private getSpanKind(eventType: string): number {
        // OpenTelemetry span kinds
        switch (eventType) {
            case 'llm_request':
            case 'function_call_start':
                return 3; // CLIENT
            case 'llm_response':
            case 'function_call_complete':
                return 4; // SERVER
            case 'tool_use':
                return 5; // CONSUMER
            default:
                return 0; // UNSPECIFIED
        }
    }
    
    private getSeverityNumber(severity: number): number {
        // OpenTelemetry severity numbers
        switch (severity) {
            case 1: return 9;  // INFO
            case 2: return 13; // WARN
            case 3: return 17; // ERROR
            default: return 5; // DEBUG
        }
    }
    
    private getSeverityText(severity: number): string {
        switch (severity) {
            case 1: return 'INFO';
            case 2: return 'WARN';
            case 3: return 'ERROR';
            default: return 'DEBUG';
        }
    }
    
    private createAttributes(data: Record<string, any>) {
        return Object.entries(data)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => ({
                key,
                value: this.createAttributeValue(value)
            }));
    }
    
    private createAttributeValue(value: any) {
        if (typeof value === 'string') {
            return { stringValue: value };
        } else if (typeof value === 'number') {
            return Number.isInteger(value) 
                ? { intValue: value }
                : { doubleValue: value };
        } else if (typeof value === 'boolean') {
            return { stringValue: value.toString() };
        } else {
            return { stringValue: JSON.stringify(value) };
        }
    }
}

// Export endpoint handler
export function createOTelEndpoints(db: Database) {
    const exporter = new OpenTelemetryExporter();
    
    return {
        // OTLP traces endpoint
        async traces(req: Request) {
            const url = new URL(req.url);
            const startTime = url.searchParams.get('start_time');
            const endTime = url.searchParams.get('end_time');
            
            const traces = await exporter.exportTraces(startTime, endTime);
            
            return new Response(JSON.stringify(traces), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        },
        
        // OTLP metrics endpoint
        async metrics(req: Request) {
            const url = new URL(req.url);
            const startTime = url.searchParams.get('start_time');
            const endTime = url.searchParams.get('end_time');
            
            const metrics = await exporter.exportMetrics(startTime, endTime);
            
            return new Response(JSON.stringify(metrics), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        },
        
        // OTLP logs endpoint
        async logs(req: Request) {
            const url = new URL(req.url);
            const startTime = url.searchParams.get('start_time');
            const endTime = url.searchParams.get('end_time');
            
            const logs = await exporter.exportLogs(startTime, endTime);
            
            return new Response(JSON.stringify(logs), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        },
        
        // Combined export endpoint
        async all(req: Request) {
            const url = new URL(req.url);
            const startTime = url.searchParams.get('start_time');
            const endTime = url.searchParams.get('end_time');
            
            const data = await exporter.exportAll(startTime, endTime);
            
            return new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    };
}
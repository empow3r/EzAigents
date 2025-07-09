# Enhancement Testing Guide

## Overview
This guide provides comprehensive testing procedures for each enhancement to ensure quality and reliability.

## 1. 🛡️ Security Layer Testing

### Unit Tests
```javascript
// test/security/vault-client.test.js
describe('VaultClient', () => {
  it('should connect to Vault server', async () => {
    const vault = new VaultClient(config);
    await expect(vault.connect()).resolves.toBeTruthy();
  });

  it('should retrieve dynamic credentials', async () => {
    const creds = await vault.getDatabaseCredentials('postgres');
    expect(creds).toHaveProperty('username');
    expect(creds).toHaveProperty('password');
    expect(creds).toHaveProperty('lease_id');
  });

  it('should handle credential rotation', async () => {
    const creds1 = await vault.getApiKey('openai');
    await vault.rotateCredentials('openai');
    const creds2 = await vault.getApiKey('openai');
    expect(creds1.key).not.toBe(creds2.key);
  });
});
```

### Integration Tests
```bash
# Security integration test suite
npm run test:security:integration

# Manual verification steps
1. Start Vault in dev mode: vault server -dev
2. Run auth service: node cli/auth-service.js
3. Test OAuth flow: curl http://localhost:3000/auth/google
4. Verify JWT generation: curl -X POST http://localhost:3000/auth/token
5. Test RBAC: curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin
```

### Security Audit Checklist
- [ ] No hardcoded secrets in codebase
- [ ] All API keys stored in Vault
- [ ] OAuth2 flow tested with multiple providers
- [ ] JWT tokens expire appropriately
- [ ] RBAC policies enforce correctly
- [ ] Encryption at rest verified
- [ ] TLS enabled for all connections
- [ ] Audit logs generated for all access

## 2. 📊 Observability Stack Testing

### Telemetry Tests
```javascript
// test/observability/telemetry.test.js
describe('Telemetry Service', () => {
  it('should create spans with proper hierarchy', async () => {
    const telemetry = new TelemetryService();
    const parentSpan = telemetry.startSpan('parent-operation');
    const childSpan = telemetry.startSpan('child-operation', { parent: parentSpan });
    
    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
  });

  it('should propagate context across services', async () => {
    const context = telemetry.inject();
    const extracted = telemetry.extract(context);
    expect(extracted.traceId).toBeDefined();
  });

  it('should export traces to Jaeger', async () => {
    const exported = await telemetry.forceFlush();
    expect(exported).toBeGreaterThan(0);
  });
});
```

### Monitoring Verification
```bash
# Start monitoring stack
docker-compose -f deployment/observability/docker-compose-monitoring.yaml up

# Verify services
1. Prometheus: http://localhost:9090
   - Check targets are UP
   - Query: up{job="ez-aigent"}
   
2. Grafana: http://localhost:3000
   - Import dashboard from /dashboards/ez-aigent.json
   - Verify metrics appear
   
3. Jaeger: http://localhost:16686
   - Search for service: ez-aigent-orchestrator
   - Verify trace visualization

4. Test alert firing
   - Trigger high error rate
   - Check AlertManager: http://localhost:9093
```

### Metrics Validation
```javascript
// Validate custom metrics
const metrics = await fetch('http://localhost:3000/metrics');
const text = await metrics.text();

// Should contain:
assert(text.includes('ez-aigent_task_duration_seconds'));
assert(text.includes('ez-aigent_agent_tasks_total'));
assert(text.includes('ez-aigent_queue_depth'));
assert(text.includes('ez-aigent_token_usage_total'));
```

## 3. 📨 Distributed Queue Testing

### Queue Manager Tests
```javascript
// test/queue/queue-manager.test.js
describe('QueueManager', () => {
  it('should failover between backends', async () => {
    const qm = new QueueManager({
      primary: 'kafka',
      fallback: 'redis'
    });
    
    // Simulate Kafka failure
    await stopKafka();
    
    // Should automatically use Redis
    await qm.publish('test-topic', { data: 'test' });
    const msg = await qm.consume('test-topic');
    expect(msg.data).toBe('test');
  });

  it('should handle dead letter queues', async () => {
    const failed = await qm.consumeDeadLetter();
    expect(failed).toHaveProperty('originalTopic');
    expect(failed).toHaveProperty('errorCount');
  });
});
```

### Performance Tests
```bash
# Queue throughput test
node test/queue/throughput-test.js

Expected results:
- Redis: 10,000+ msg/sec
- Kafka: 100,000+ msg/sec
- RabbitMQ: 50,000+ msg/sec

# Latency test
node test/queue/latency-test.js

Expected P99 latency:
- Redis: < 10ms
- Kafka: < 50ms
- RabbitMQ: < 20ms
```

## 4. 🔧 Self-Healing Testing

### Kubernetes Operator Tests
```bash
# Deploy test agent
kubectl apply -f test/k8s/test-agent.yaml

# Test auto-scaling
1. Generate high load
   kubectl exec load-generator -- ./generate-load.sh
   
2. Verify scale-up
   kubectl get hpa agent-hpa -w
   
3. Verify scale-down after load stops
   kubectl get pods -l app=agent -w

# Test self-healing
1. Kill agent pod
   kubectl delete pod agent-xxxx
   
2. Verify recreation
   kubectl get pods -l app=agent
   
3. Check no task loss
   redis-cli LLEN queue:failures
```

### Health Check Tests
```javascript
// test/health/health-checker.test.js
describe('HealthChecker', () => {
  it('should detect unhealthy services', async () => {
    const checker = new HealthChecker();
    
    // Simulate unhealthy service
    mockService.setUnhealthy();
    
    const health = await checker.check('mock-service');
    expect(health.status).toBe('unhealthy');
    expect(health.checks.liveness).toBe(false);
  });

  it('should trigger remediation', async () => {
    const remediated = await checker.remediate('mock-service');
    expect(remediated).toBe(true);
    
    // Verify service recovered
    const health = await checker.check('mock-service');
    expect(health.status).toBe('healthy');
  });
});
```

## 5. 🧠 Intelligent Orchestration Testing

### ML Agent Selector Tests
```javascript
// test/orchestration/ml-selector.test.js
describe('ML Agent Selector', () => {
  it('should predict best agent for task', async () => {
    const selector = new MLAgentSelector();
    
    const prediction = await selector.selectAgent({
      taskType: 'refactoring',
      fileType: 'typescript',
      complexity: 'high'
    });
    
    expect(prediction.agent).toBe('claude');
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });

  it('should optimize for cost when requested', async () => {
    const prediction = await selector.selectAgent({
      taskType: 'documentation',
      optimize: 'cost'
    });
    
    expect(['mistral', 'deepseek']).toContain(prediction.agent);
  });
});
```

### DAG Execution Tests
```javascript
// test/orchestration/dag-execution.test.js
describe('DAG Execution', () => {
  it('should execute tasks in dependency order', async () => {
    const dag = new DAG([
      { id: 'A', deps: [] },
      { id: 'B', deps: ['A'] },
      { id: 'C', deps: ['A'] },
      { id: 'D', deps: ['B', 'C'] }
    ]);
    
    const execution = await dag.execute();
    
    // Verify order
    expect(execution.order).toEqual(['A', ['B', 'C'], 'D']);
    
    // B and C should run in parallel
    expect(execution.parallelism['level-2']).toEqual(['B', 'C']);
  });
});
```

## 6. 👥 Collaboration Framework Testing

### Consensus Protocol Tests
```javascript
// test/collaboration/consensus.test.js
describe('Consensus Protocol', () => {
  it('should elect leader correctly', async () => {
    const nodes = await createCluster(5);
    await waitForElection();
    
    const leaders = nodes.filter(n => n.isLeader());
    expect(leaders.length).toBe(1);
  });

  it('should handle network partitions', async () => {
    const nodes = await createCluster(5);
    
    // Create partition [1,2] | [3,4,5]
    await createPartition([[0,1], [2,3,4]]);
    
    // Majority should still function
    const majority = nodes.slice(2);
    const leader = majority.find(n => n.isLeader());
    expect(leader).toBeDefined();
    
    // Minority should not have leader
    const minority = nodes.slice(0, 2);
    const minorityLeaders = minority.filter(n => n.isLeader());
    expect(minorityLeaders.length).toBe(0);
  });
});
```

### Knowledge Graph Tests
```bash
# Start Neo4j
docker run -p 7474:7474 -p 7687:7687 neo4j:latest

# Import test data
cypher-shell < test/knowledge/test-data.cypher

# Test queries
1. Find similar tasks
   MATCH (t:Task)-[:SIMILAR_TO]->(similar:Task)
   WHERE t.id = 'test-task-1'
   RETURN similar

2. Agent expertise matching
   MATCH (a:Agent)-[:EXPERT_IN]->(skill:Skill)
   WHERE skill.name IN ['refactoring', 'typescript']
   RETURN a

3. Solution reuse
   MATCH path = (task:Task)-[:SOLVED_BY]->(solution:Solution)
   WHERE task.type = 'bug-fix'
   RETURN path LIMIT 10
```

## Load Testing

### System-wide Load Test
```bash
# Run comprehensive load test
npm run test:load

# Configuration in test/load/config.json
{
  "agents": 50,
  "tasks_per_second": 100,
  "duration_minutes": 60,
  "task_types": ["refactor", "test", "document", "implement"],
  "failure_rate": 0.05
}

# Expected results:
- Task completion rate: > 95%
- P95 latency: < 5 seconds
- No memory leaks after 1 hour
- Auto-scaling triggers appropriately
```

### Stress Testing
```bash
# Gradually increase load until failure
npm run test:stress

# Monitor breaking points:
1. Queue saturation point
2. Agent response degradation
3. Memory exhaustion threshold
4. Network bandwidth limits
```

## End-to-End Testing

### Complete Enhancement Workflow
```bash
# Run E2E test suite
npm run test:e2e:enhancements

# Test scenario:
1. Dispatch security enhancement
2. Verify Vault integration works
3. Test auth flow with secured endpoints
4. Dispatch observability enhancement
5. Verify metrics and traces appear
6. Test alerts fire correctly
7. Continue for all enhancements...
```

### Rollback Testing
```bash
# Test rollback procedures
1. Create checkpoint
   node cli/enhancement-rollback.js checkpoint "pre-test" "Before rollback test"

2. Implement enhancement
   node cli/enhancement-dispatcher.js dispatch security-layer

3. Verify implementation
   npm run test:security

4. Perform rollback
   node cli/enhancement-rollback.js rollback security-layer-xxxxx

5. Verify rollback success
   npm run test:verify-rollback
```

## Performance Benchmarks

### Baseline Metrics
```yaml
# Before enhancements
task_processing_time_p50: 2s
task_processing_time_p99: 10s
system_throughput: 100 tasks/min
agent_utilization: 60%
error_rate: 2%

# After enhancements (target)
task_processing_time_p50: 500ms
task_processing_time_p99: 2s
system_throughput: 1000 tasks/min
agent_utilization: 85%
error_rate: 0.1%
```

## Continuous Testing

### CI/CD Pipeline
```yaml
# .github/workflows/enhancement-tests.yml
name: Enhancement Tests
on: [push, pull_request]

jobs:
  test-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:security
      
  test-observability:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:observability
      
  # ... tests for each enhancement
  
  test-integration:
    needs: [test-security, test-observability]
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration
```

## Test Report Generation

```bash
# Generate comprehensive test report
npm run test:report

# Output includes:
- Test coverage per enhancement
- Performance benchmarks
- Security audit results
- Load test graphs
- Failure analysis
- Recommendations
```

---

Testing is critical for ensuring each enhancement meets production standards. Run all tests before deploying to production.
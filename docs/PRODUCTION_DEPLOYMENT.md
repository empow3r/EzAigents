# Production Deployment Guide

## Overview
This guide covers production deployment strategies for the Ez Aigent multi-agent orchestration platform with all enhancements implemented.

## Prerequisites

### System Requirements
- **Minimum Production Setup**:
  - 8 CPU cores, 32GB RAM
  - 500GB SSD storage
  - 1Gbps network connection
  - Docker & Kubernetes support

- **Recommended Production Setup**:
  - 16 CPU cores, 64GB RAM
  - 1TB NVMe SSD storage
  - 10Gbps network connection
  - Multi-zone deployment

### Dependencies
- Kubernetes 1.28+
- Redis Cluster 7.0+
- PostgreSQL 15+
- Neo4j 5.0+
- HashiCorp Vault 1.15+
- Kafka 3.5+ (optional)
- RabbitMQ 3.12+ (optional)

## Pre-Deployment Checklist

### 1. Security Configuration
```bash
# Vault setup
vault auth enable kubernetes
vault policy write ez-aigent-policy vault-policy.hcl

# TLS certificates
kubectl create secret tls ez-aigent-tls --cert=cert.pem --key=key.pem

# Image security scanning
docker scan ez-aigent:latest
```

### 2. Resource Planning
```yaml
# Resource allocation per component
orchestrator:
  requests: { cpu: 2, memory: 4Gi }
  limits: { cpu: 4, memory: 8Gi }

agent-claude:
  requests: { cpu: 1, memory: 2Gi }
  limits: { cpu: 2, memory: 4Gi }

dashboard:
  requests: { cpu: 500m, memory: 1Gi }
  limits: { cpu: 1, memory: 2Gi }

redis:
  requests: { cpu: 1, memory: 2Gi }
  limits: { cpu: 2, memory: 4Gi }
```

### 3. Network Configuration
```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ez-aigent-network-policy
spec:
  podSelector:
    matchLabels:
      app: ez-aigent
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ez-aigent
    ports:
    - protocol: TCP
      port: 3000
```

## Deployment Strategies

### 1. Blue-Green Deployment

```bash
# Deploy to staging (green)
kubectl apply -f deployment/k8s/staging/ -n ez-aigent-staging

# Run health checks
kubectl exec -n ez-aigent-staging deploy/health-checker -- ./health-check.sh

# Switch traffic
kubectl patch service ez-aigent-service -p '{"spec":{"selector":{"version":"green"}}}'

# Cleanup old version
kubectl delete deployment ez-aigent-blue -n ez-aigent-production
```

### 2. Canary Deployment

```yaml
# Canary deployment with 10% traffic
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: ez-aigent-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 50
      - pause: { duration: 10m }
      - setWeight: 100
  selector:
    matchLabels:
      app: ez-aigent
  template:
    metadata:
      labels:
        app: ez-aigent
    spec:
      containers:
      - name: orchestrator
        image: ez-aigent:latest
```

### 3. Multi-Region Deployment

```yaml
# Primary region (us-east-1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: ez-aigent-config
data:
  REGION: "us-east-1"
  REDIS_CLUSTER: "redis-cluster.us-east-1.amazonaws.com"
  VAULT_ADDR: "https://vault.us-east-1.company.com"

---
# Secondary region (us-west-2)
apiVersion: v1
kind: ConfigMap
metadata:
  name: ez-aigent-config
data:
  REGION: "us-west-2"
  REDIS_CLUSTER: "redis-cluster.us-west-2.amazonaws.com"
  VAULT_ADDR: "https://vault.us-west-2.company.com"
```

## Configuration Management

### 1. Environment Variables
```bash
# Production environment variables
export ENVIRONMENT=production
export LOG_LEVEL=info
export REDIS_URL=redis://redis-cluster:6379
export VAULT_ADDR=https://vault.company.com
export VAULT_TOKEN_PATH=/var/secrets/vault-token
export DATABASE_URL=postgresql://user:pass@postgres:5432/ez-aigent
export NEO4J_URI=bolt://neo4j:7687
export KAFKA_BROKERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
export RABBITMQ_URL=amqp://rabbit:5672
export MONITORING_ENABLED=true
export TRACING_ENABLED=true
export METRICS_PORT=9090
export HEALTH_CHECK_PORT=8080
```

### 2. Secrets Management
```bash
# Vault secrets
vault kv put secret/ez-aigent/api-keys \
  claude_api_key="$CLAUDE_API_KEY" \
  openai_api_key="$OPENAI_API_KEY" \
  deepseek_api_key="$DEEPSEEK_API_KEY"

# Kubernetes secrets
kubectl create secret generic ez-aigent-secrets \
  --from-literal=database-password="$DB_PASSWORD" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --from-literal=jwt-secret="$JWT_SECRET"
```

### 3. ConfigMaps
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ez-aigent-config
data:
  config.yaml: |
    orchestrator:
      maxConcurrentTasks: 1000
      taskTimeout: 300s
      retryAttempts: 3
    
    agents:
      claude:
        maxConcurrency: 10
        timeout: 120s
      gpt:
        maxConcurrency: 15
        timeout: 90s
      deepseek:
        maxConcurrency: 20
        timeout: 60s
    
    security:
      enableRBAC: true
      tokenExpiration: 3600s
      encryptionEnabled: true
    
    monitoring:
      metricsInterval: 30s
      tracingSampleRate: 0.1
      logLevel: info
```

## Monitoring & Observability

### 1. Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ez-aigent-orchestrator'
    static_configs:
      - targets: ['orchestrator:9090']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'ez-aigent-agents'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: ez-aigent-agent
```

### 2. Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Ez Aigent Production Dashboard",
    "panels": [
      {
        "title": "Task Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ez-aigent_tasks_processed_total[5m])",
            "legendFormat": "Tasks/sec"
          }
        ]
      },
      {
        "title": "Agent Health",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(up{job=\"ez-aigent-agents\"})",
            "legendFormat": "Active Agents"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "ez-aigent_queue_depth",
            "legendFormat": "{{queue}}"
          }
        ]
      }
    ]
  }
}
```

### 3. Alerting Rules
```yaml
# alerting-rules.yml
groups:
  - name: ez-aigent-alerts
    rules:
      - alert: HighTaskFailureRate
        expr: rate(ez-aigent_tasks_failed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High task failure rate detected"

      - alert: AgentDown
        expr: up{job="ez-aigent-agents"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Agent {{ $labels.instance }} is down"

      - alert: QueueBacklog
        expr: ez-aigent_queue_depth > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog detected"
```

## Auto-Scaling Configuration

### 1. Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ez-aigent-orchestrator-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ez-aigent-orchestrator
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: ez-aigent_queue_depth
        target:
          type: AverageValue
          averageValue: "100"
```

### 2. Vertical Pod Autoscaler
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ez-aigent-agent-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ez-aigent-agent-claude
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: claude-agent
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4
        memory: 8Gi
```

## Disaster Recovery

### 1. Backup Strategy
```bash
# Automated backup script
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Backup Redis
kubectl exec redis-master -- redis-cli --rdb /backup/redis-${BACKUP_DATE}.rdb

# Backup PostgreSQL
kubectl exec postgres-master -- pg_dump ez-aigent > /backup/postgres-${BACKUP_DATE}.sql

# Backup Neo4j
kubectl exec neo4j-master -- neo4j-admin backup --to=/backup/neo4j-${BACKUP_DATE}

# Upload to S3
aws s3 sync /backup/ s3://ez-aigent-backups/
```

### 2. Recovery Procedures
```bash
# Recovery from backup
kubectl apply -f deployment/k8s/recovery/

# Restore Redis
kubectl exec redis-master -- redis-cli --rdb < /backup/redis-${BACKUP_DATE}.rdb

# Restore PostgreSQL
kubectl exec postgres-master -- psql ez-aigent < /backup/postgres-${BACKUP_DATE}.sql

# Restore Neo4j
kubectl exec neo4j-master -- neo4j-admin restore --from=/backup/neo4j-${BACKUP_DATE}
```

## Performance Tuning

### 1. JVM Tuning (for Kafka/Neo4j)
```bash
# Neo4j JVM settings
export NEO4J_server_jvm_additional="-Xmx8g -Xms8g -XX:+UseG1GC"

# Kafka JVM settings
export KAFKA_HEAP_OPTS="-Xmx6g -Xms6g"
export KAFKA_JVM_PERFORMANCE_OPTS="-XX:+UseG1GC -XX:MaxGCPauseMillis=20"
```

### 2. Redis Optimization
```redis
# Redis configuration
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Database Optimization
```sql
-- PostgreSQL optimizations
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
```

## Security Hardening

### 1. Network Security
```yaml
# Istio service mesh
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: ez-aigent-mtls
spec:
  mtls:
    mode: STRICT

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: ez-aigent-rbac
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/ez-aigent/sa/orchestrator"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

### 2. Pod Security Standards
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ez-aigent-orchestrator
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: orchestrator
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

## Compliance & Auditing

### 1. Audit Logging
```yaml
# Audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
  - group: "apps"
    resources: ["deployments"]
```

### 2. Compliance Checks
```bash
# CIS Kubernetes Benchmark
kube-bench run --targets node,policies,managedservices

# Pod Security Standards
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ez-aigent
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
EOF
```

## Deployment Checklist

### Pre-Deployment
- [ ] Security scan completed
- [ ] Resource requirements verified
- [ ] Network policies configured
- [ ] Secrets and configs updated
- [ ] Monitoring alerts configured
- [ ] Backup strategy verified

### Deployment
- [ ] Blue-green deployment executed
- [ ] Health checks passing
- [ ] Performance tests completed
- [ ] Security tests passed
- [ ] Rollback plan tested

### Post-Deployment
- [ ] Monitoring dashboards updated
- [ ] Alert thresholds configured
- [ ] Performance baselines established
- [ ] Documentation updated
- [ ] Team training completed

## Troubleshooting

### Common Issues
1. **Agent startup failures**: Check API key configuration
2. **Queue backlog**: Increase agent replicas
3. **Memory issues**: Adjust JVM settings
4. **Network timeouts**: Review network policies

### Debug Commands
```bash
# Check pod logs
kubectl logs -f deployment/ez-aigent-orchestrator

# Debug network issues
kubectl exec -it debug-pod -- nslookup redis-service

# Check resource usage
kubectl top pods -n ez-aigent

# Verify secrets
kubectl get secret ez-aigent-secrets -o yaml
```

---

This production deployment guide ensures Ez Aigent operates reliably at enterprise scale with proper security, monitoring, and disaster recovery capabilities.
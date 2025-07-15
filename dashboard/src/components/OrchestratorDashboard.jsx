import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Warning,
  Error,
  CheckCircle,
  Speed,
  Storage,
  Timeline,
  BugReport,
  RestartAlt,
  Archive,
  Delete,
  Send,
  HealthAndSafety
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const OrchestratorDashboard = () => {
  const [orchestratorStatus, setOrchestratorStatus] = useState(null);
  const [queueStats, setQueueStats] = useState({});
  const [agentStats, setAgentStats] = useState({});
  const [healthData, setHealthData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [dlqStats, setDlqStats] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commandDialog, setCommandDialog] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [selectedCommand, setSelectedCommand] = useState('');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [orchestrator, queues, agents, health, txns, dlq] = await Promise.all([
        fetch('/api/orchestrator/status').then(r => r.json()),
        fetch('/api/orchestrator/queues').then(r => r.json()),
        fetch('/api/orchestrator/agents').then(r => r.json()),
        fetch('/api/orchestrator/health').then(r => r.json()),
        fetch('/api/orchestrator/transactions?limit=50').then(r => r.json()),
        fetch('/api/orchestrator/dlq').then(r => r.json())
      ]);

      setOrchestratorStatus(orchestrator);
      setQueueStats(queues);
      setAgentStats(agents);
      setHealthData(health);
      setTransactions(txns);
      setDlqStats(dlq);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    }
  };

  const sendCommand = async () => {
    try {
      await fetch('/api/orchestrator/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedCommand,
          queue: selectedQueue,
          timestamp: Date.now()
        })
      });
      
      setCommandDialog(false);
      setSelectedCommand('');
      setSelectedQueue('');
      fetchDashboardData();
    } catch (err) {
      setError('Failed to send command');
    }
  };

  const retryDLQTask = async (dlq, taskId) => {
    try {
      await fetch('/api/orchestrator/dlq/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dlq, taskId })
      });
      
      fetchDashboardData();
    } catch (err) {
      setError('Failed to retry task');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'critical': return <Error color="error" />;
      default: return <HealthAndSafety />;
    }
  };

  const renderOrchestratorStatus = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Orchestrator Status</Typography>
          <Box>
            <IconButton onClick={fetchDashboardData} size="small">
              <Refresh />
            </IconButton>
            <IconButton onClick={() => setCommandDialog(true)} size="small">
              <Send />
            </IconButton>
          </Box>
        </Box>
        
        {orchestratorStatus && (
          <Box mt={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip 
                label={orchestratorStatus.status} 
                color={getStatusColor(orchestratorStatus.status)}
                size="small"
              />
              <Typography variant="body2">
                ID: {orchestratorStatus.id}
              </Typography>
            </Box>
            
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Uptime: {Math.floor(orchestratorStatus.uptime / 3600)}h {Math.floor((orchestratorStatus.uptime % 3600) / 60)}m
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Memory: {Math.round(orchestratorStatus.memory.heapUsed / 1024 / 1024)}MB / {Math.round(orchestratorStatus.memory.heapTotal / 1024 / 1024)}MB
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderQueueStats = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Queue Statistics</Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Queue</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Depth</TableCell>
                <TableCell align="right">Processing</TableCell>
                <TableCell align="right">Failed</TableCell>
                <TableCell align="right">Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(queueStats).map(([queue, stats]) => (
                <TableRow key={queue}>
                  <TableCell>{queue.replace('queue:', '')}</TableCell>
                  <TableCell align="center">
                    {getHealthIcon(stats.status)}
                  </TableCell>
                  <TableCell align="right">{stats.metrics?.depth || 0}</TableCell>
                  <TableCell align="right">{stats.metrics?.processingCount || 0}</TableCell>
                  <TableCell align="right">{stats.metrics?.failed || 0}</TableCell>
                  <TableCell align="right">{stats.metrics?.completed || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderAgentStats = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Agent Status</Typography>
        
        <Grid container spacing={2}>
          {Object.entries(agentStats).map(([agentId, agent]) => (
            <Grid item xs={12} md={6} key={agentId}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2">{agentId}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {agent.model}
                    </Typography>
                  </Box>
                  <Chip 
                    label={agent.status} 
                    color={getStatusColor(agent.status)}
                    size="small"
                  />
                </Box>
                
                <Box mt={1}>
                  <Typography variant="body2">
                    Load: {agent.load}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(agent.currentLoad / agent.maxLoad) * 100} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Box mt={1} display="flex" justifyContent="space-between">
                  <Typography variant="caption">
                    Completed: {agent.performance?.tasksCompleted || 0}
                  </Typography>
                  <Typography variant="caption">
                    Failed: {agent.performance?.tasksFailed || 0}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  const renderHealthMonitor = () => {
    const chartData = {
      labels: Object.keys(healthData.queues || {}),
      datasets: [{
        label: 'Queue Depth',
        data: Object.values(healthData.queues || {}).map(q => q.metrics?.depth || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Health Monitor</Typography>
          
          <Box height={300}>
            <Bar 
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </Box>
          
          {healthData.issues && healthData.issues.length > 0 && (
            <Box mt={2}>
              <Alert severity="warning">
                <Typography variant="subtitle2">Active Issues:</Typography>
                {healthData.issues.map((issue, idx) => (
                  <Typography key={idx} variant="body2">
                    • {issue.queue}: {issue.type} ({issue.severity})
                  </Typography>
                ))}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTransactionLog = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
        
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Queue</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.queue || tx.data?.queue || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title={JSON.stringify(tx.data, null, 2)}>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                        {JSON.stringify(tx.data)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderDLQManager = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Dead Letter Queues</Typography>
        
        <Grid container spacing={2}>
          {Object.entries(dlqStats.dlqs || {}).map(([dlq, stats]) => (
            <Grid item xs={12} md={6} key={dlq}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2">{dlq}</Typography>
                <Typography variant="h4">{stats.depth}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Tasks in DLQ
                </Typography>
                
                <Box mt={2}>
                  <Typography variant="body2">Recent Actions:</Typography>
                  <Typography variant="caption">
                    Retried: {stats.recentActions?.retry || 0} | 
                    Archived: {stats.recentActions?.archive || 0} | 
                    Failed: {stats.recentActions?.permanent_failure || 0}
                  </Typography>
                </Box>
                
                <Box mt={2} display="flex" gap={1}>
                  <Button 
                    size="small" 
                    startIcon={<RestartAlt />}
                    onClick={() => retryDLQTask(dlq, null)}
                  >
                    Retry All
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<Archive />}
                    color="warning"
                  >
                    Archive
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Orchestrator Control Panel
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {renderOrchestratorStatus()}
        </Grid>
        
        <Grid item xs={12} md={8}>
          {renderQueueStats()}
        </Grid>
        
        <Grid item xs={12}>
          <Paper>
            <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
              <Tab label="Agents" icon={<Speed />} />
              <Tab label="Health" icon={<HealthAndSafety />} />
              <Tab label="Transactions" icon={<Timeline />} />
              <Tab label="DLQ" icon={<BugReport />} />
            </Tabs>
            
            <Box p={3}>
              {selectedTab === 0 && renderAgentStats()}
              {selectedTab === 1 && renderHealthMonitor()}
              {selectedTab === 2 && renderTransactionLog()}
              {selectedTab === 3 && renderDLQManager()}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Dialog open={commandDialog} onClose={() => setCommandDialog(false)}>
        <DialogTitle>Send Orchestrator Command</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Command</InputLabel>
            <Select
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value)}
              label="Command"
            >
              <MenuItem value="pause">Pause Processing</MenuItem>
              <MenuItem value="resume">Resume Processing</MenuItem>
              <MenuItem value="rebalance">Rebalance Queues</MenuItem>
              <MenuItem value="health_check">Force Health Check</MenuItem>
              <MenuItem value="clear_dlq">Clear DLQ</MenuItem>
            </Select>
          </FormControl>
          
          {['rebalance', 'clear_dlq'].includes(selectedCommand) && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Queue</InputLabel>
              <Select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                label="Queue"
              >
                {Object.keys(queueStats).map(queue => (
                  <MenuItem key={queue} value={queue}>{queue}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommandDialog(false)}>Cancel</Button>
          <Button onClick={sendCommand} variant="contained">Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrchestratorDashboard;
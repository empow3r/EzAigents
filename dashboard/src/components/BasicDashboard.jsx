import React, { useState } from 'react';

const BasicDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const agents = [
    { name: 'Claude-US-East', status: 'Active', tasks: 342, location: 'New York' },
    { name: 'GPT-Europe', status: 'Active', tasks: 287, location: 'London' },
    { name: 'Gemini-Asia', status: 'Active', tasks: 415, location: 'Tokyo' },
    { name: 'Mistral-Pacific', status: 'Idle', tasks: 156, location: 'Sydney' }
  ];

  const totalTasks = agents.reduce((sum, agent) => sum + agent.tasks, 0);
  const activeAgents = agents.filter(agent => agent.status === 'Active').length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1f2937', 
      color: 'white', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#374151', 
        padding: '1rem 2rem', 
        borderBottom: '1px solid #4b5563' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            🤖 Ez Aigent Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#10b981', 
              borderRadius: '50%' 
            }} />
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ 
        backgroundColor: '#374151', 
        padding: '0 2rem', 
        borderBottom: '1px solid #4b5563' 
      }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['overview', 'agents', 'globe', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                color: activeTab === tab ? '#60a5fa' : '#9ca3af',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Metrics Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem', 
              marginBottom: '2rem' 
            }}>
              <div style={{ 
                backgroundColor: '#374151', 
                padding: '1.5rem', 
                borderRadius: '0.5rem',
                border: '1px solid #4b5563'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                      Active Agents
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                      {activeAgents}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>👥</span>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#374151', 
                padding: '1.5rem', 
                borderRadius: '0.5rem',
                border: '1px solid #4b5563'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                      Total Tasks
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                      {totalTasks.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>⚡</span>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#374151', 
                padding: '1.5rem', 
                borderRadius: '0.5rem',
                border: '1px solid #4b5563'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                      Success Rate
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                      99.8%
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📊</span>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#374151', 
                padding: '1.5rem', 
                borderRadius: '0.5rem',
                border: '1px solid #4b5563'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                      Uptime
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                      99.9%
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>🕐</span>
                </div>
              </div>
            </div>

            {/* Agent List */}
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '1.5rem', 
              borderRadius: '0.5rem',
              border: '1px solid #4b5563'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Agent Status
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {agents.map((agent, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: '#4b5563',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                        {agent.name}
                      </h4>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                        📍 {agent.location}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: agent.status === 'Active' ? '#059669' : '#d97706',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                      }}>
                        {agent.status}
                      </span>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                        {agent.tasks} tasks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              AI Agent Management
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {agents.map((agent, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    backgroundColor: '#374151', 
                    padding: '1.5rem', 
                    borderRadius: '0.5rem',
                    border: '1px solid #4b5563'
                  }}
                >
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    {agent.name}
                  </h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#9ca3af' }}>Status:</span>
                      <span style={{ color: agent.status === 'Active' ? '#10b981' : '#f59e0b' }}>
                        {agent.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#9ca3af' }}>Location:</span>
                      <span>{agent.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Tasks:</span>
                      <span>{agent.tasks}</span>
                    </div>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '0.5rem', 
                    backgroundColor: '#4b5563', 
                    borderRadius: '0.25rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${(agent.tasks / 500) * 100}%`, 
                      height: '100%', 
                      backgroundColor: '#3b82f6' 
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'globe' && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌍</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Global Agent Network
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
              Your AI agents are deployed across {agents.length} global locations
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {agents.map((agent, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    backgroundColor: '#374151', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    border: '1px solid #4b5563'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📍</div>
                  <h4 style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {agent.location}
                  </h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                    {agent.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Dashboard Settings
            </h2>
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '1.5rem', 
              borderRadius: '0.5rem',
              border: '1px solid #4b5563'
            }}>
              <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                Configuration options:
              </p>
              <ul style={{ color: '#9ca3af', paddingLeft: '1.5rem' }}>
                <li>Real-time monitoring enabled</li>
                <li>Auto-scaling active</li>
                <li>Global deployment ready</li>
                <li>24/7 system monitoring</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BasicDashboard;
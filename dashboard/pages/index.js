import React, { useState } from 'react';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const [agents] = useState([
    { id: 'claude', name: 'Claude', status: 'active', tasks: 3 },
    { id: 'gpt', name: 'GPT-4o', status: 'idle', tasks: 0 },
    { id: 'deepseek', name: 'DeepSeek', status: 'active', tasks: 1 },
    { id: 'mistral', name: 'Mistral', status: 'idle', tasks: 0 },
    { id: 'gemini', name: 'Gemini', status: 'active', tasks: 2 }
  ]);

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks, 0);

  const handleSubmitTask = () => {
    if (taskText.trim()) {
      alert(`Task submitted: ${taskText}`);
      setTaskText('');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      color: 'white', 
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Ez Aigents Dashboard
        </h1>
        <p style={{ color: '#9CA3AF' }}>
          Simple agent monitoring and task submission
        </p>
      </div>

      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            backgroundColor: '#1F2937', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10B981' }}>
              {activeAgents}
            </div>
            <div style={{ color: '#9CA3AF' }}>Active Agents</div>
          </div>
          <div style={{ 
            backgroundColor: '#1F2937', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3B82F6' }}>
              {totalTasks}
            </div>
            <div style={{ color: '#9CA3AF' }}>Total Tasks</div>
          </div>
        </div>

        {/* Agent List */}
        <div style={{ 
          backgroundColor: '#1F2937', 
          borderRadius: '0.5rem', 
          padding: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Agent Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {agents.map(agent => (
              <div key={agent.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem', 
                backgroundColor: '#374151', 
                borderRadius: '0.375rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '0.75rem', 
                    height: '0.75rem', 
                    borderRadius: '50%',
                    backgroundColor: agent.status === 'active' ? '#10B981' : '#6B7280'
                  }} />
                  <span style={{ fontWeight: '500' }}>{agent.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                    {agent.tasks} tasks
                  </span>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem',
                    backgroundColor: agent.status === 'active' ? '#065F46' : '#374151',
                    color: agent.status === 'active' ? '#10B981' : '#9CA3AF'
                  }}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Input */}
        <div style={{ 
          backgroundColor: '#1F2937', 
          borderRadius: '0.5rem', 
          padding: '1.5rem' 
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Submit New Task
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Enter your task description here..."
              style={{ 
                width: '100%', 
                height: '8rem', 
                padding: '1rem', 
                backgroundColor: '#374151', 
                border: '1px solid #4B5563', 
                borderRadius: '0.5rem',
                color: 'white',
                resize: 'none',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={handleSubmitTask}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                backgroundColor: '#2563EB', 
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1D4ED8'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2563EB'}
            >
              Submit Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
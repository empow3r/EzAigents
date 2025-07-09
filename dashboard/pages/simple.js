import React from 'react';

export default function Simple() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      color: 'white', 
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ez Aigent Dashboard - Simple Version</h1>
      <p>This is a simplified version to test if the page loads correctly.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>System Status</h2>
        <ul>
          <li>Next.js: Running</li>
          <li>Port: 3000</li>
          <li>Environment: Development</li>
        </ul>
      </div>
    </div>
  );
}
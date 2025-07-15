import React from 'react';
import { Button } from '../src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';

export default function TestComponents() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      color: 'white', 
      padding: '2rem'
    }}>
      <h1>Component Tests</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Button Component Test</h2>
        <Button onClick={() => alert('Button works!')}>
          Test Button
        </Button>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Card Component Test</h2>
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card content.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
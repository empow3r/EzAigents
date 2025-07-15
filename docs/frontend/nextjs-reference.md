# Next.js Reference Guide

## Overview
Next.js is a React framework for building full-stack web applications, used for the Ez Aigent dashboard.

## Installation & Setup

### Create New Project
```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 3000",
    "build": "next build",
    "start": "next start -H 0.0.0.0 -p 3000",
    "lint": "next lint"
  }
}
```

## Project Structure

### App Router (Recommended)
```
app/
├── layout.js          # Root layout
├── page.js            # Home page
├── loading.js         # Loading UI
├── error.js           # Error UI
├── not-found.js       # 404 page
└── api/               # API routes
    ├── health/
    │   └── route.js
    └── agents/
        └── route.js
```

### Pages Router (Legacy)
```
pages/
├── _app.js            # App wrapper
├── _document.js       # Document structure
├── index.js           # Home page
└── api/               # API routes
    ├── health.js
    └── agents.js
```

## Routing

### App Router Navigation
```javascript
// app/dashboard/page.js
export default function Dashboard() {
  return <h1>Dashboard</h1>;
}

// Navigation
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function Navigation() {
  const router = useRouter();
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <button onClick={() => router.push('/agents')}>
        Agents
      </button>
    </nav>
  );
}
```

### Dynamic Routes
```javascript
// app/agents/[id]/page.js
export default function Agent({ params }) {
  return <h1>Agent {params.id}</h1>;
}

// app/agents/[...slug]/page.js - Catch-all routes
export default function Agent({ params }) {
  return <h1>Agent {params.slug.join('/')}</h1>;
}
```

## API Routes

### App Router API
```javascript
// app/api/agents/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const agents = await fetchAgents();
  return NextResponse.json(agents);
}

export async function POST(request) {
  const body = await request.json();
  const agent = await createAgent(body);
  return NextResponse.json(agent);
}
```

### Dynamic API Routes
```javascript
// app/api/agents/[id]/route.js
export async function GET(request, { params }) {
  const agent = await fetchAgent(params.id);
  return NextResponse.json(agent);
}

export async function PUT(request, { params }) {
  const body = await request.json();
  const agent = await updateAgent(params.id, body);
  return NextResponse.json(agent);
}
```

## Data Fetching

### Server Components
```javascript
// app/dashboard/page.js
async function Dashboard() {
  const agents = await fetch('http://localhost:3000/api/agents').then(res => res.json());
  
  return (
    <div>
      <h1>Dashboard</h1>
      {agents.map(agent => (
        <div key={agent.id}>{agent.name}</div>
      ))}
    </div>
  );
}
```

### Client Components
```javascript
'use client';

import { useState, useEffect } from 'react';

export default function AgentList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>{agent.name}</div>
      ))}
    </div>
  );
}
```

## Styling

### CSS Modules
```css
/* styles/Dashboard.module.css */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.title {
  font-size: 2rem;
  color: #333;
}
```

```javascript
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
    </div>
  );
}
```

### Tailwind CSS
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## Configuration

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['example.com'],
  },
  env: {
    REDIS_URL: process.env.REDIS_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

### Environment Variables
```bash
# .env.local
REDIS_URL=redis://localhost:6379
CLAUDE_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

```javascript
// Access in API routes
const redisUrl = process.env.REDIS_URL;

// Access in client (must be prefixed with NEXT_PUBLIC_)
const publicUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Components

### Layout Component
```javascript
// app/layout.js
import './globals.css';

export const metadata = {
  title: 'Ez Aigent Dashboard',
  description: 'AI Agent Management Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>Ez Aigent Dashboard</nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Error Boundaries
```javascript
// app/error.js
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Loading States
```javascript
// app/loading.js
export default function Loading() {
  return <div>Loading...</div>;
}

// app/dashboard/loading.js
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
    </div>
  );
}
```

## Real-time Features

### WebSocket Integration
```javascript
'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function RealTimeAgents() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('agent:status', (data) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agentId 
          ? { ...agent, ...data }
          : agent
      ));
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>
          {agent.name}: {agent.status}
        </div>
      ))}
    </div>
  );
}
```

### Server-Sent Events
```javascript
// app/api/events/route.js
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      const interval = setInterval(() => {
        sendEvent({ timestamp: Date.now(), message: 'ping' });
      }, 1000);

      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Performance Optimization

### Image Optimization
```javascript
import Image from 'next/image';

export default function AgentCard({ agent }) {
  return (
    <div>
      <Image
        src={agent.avatar}
        alt={agent.name}
        width={50}
        height={50}
        priority
      />
      <h3>{agent.name}</h3>
    </div>
  );
}
```

### Code Splitting
```javascript
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(() => import('../components/Chart'), {
  ssr: false,
  loading: () => <p>Loading chart...</p>
});

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DynamicChart />
    </div>
  );
}
```

## Testing

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = createJestConfig(customJestConfig);
```

### Component Testing
```javascript
// __tests__/Dashboard.test.js
import { render, screen } from '@testing-library/react';
import Dashboard from '../app/dashboard/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Dashboard', () => {
  it('renders dashboard heading', () => {
    render(<Dashboard />);
    const heading = screen.getByRole('heading', { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
  });
});
```

## Deployment

### Build & Export
```bash
# Build for production
npm run build

# Start production server
npm start

# Static export
npm run build && npm run export
```

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Ez Aigent Integration

### Dashboard Configuration
```javascript
// app/page.js
import { Suspense } from 'react';
import AgentGrid from './components/AgentGrid';
import MetricsPanel from './components/MetricsPanel';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Suspense fallback={<div>Loading agents...</div>}>
          <AgentGrid />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={<div>Loading metrics...</div>}>
          <MetricsPanel />
        </Suspense>
      </div>
    </div>
  );
}
```

### API Integration
```javascript
// app/api/queue-stats/route.js
import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function GET() {
  try {
    const stats = await Promise.all([
      redis.llen('queue:claude-3-opus'),
      redis.llen('queue:gpt-4o'),
      redis.llen('queue:deepseek-coder'),
      redis.llen('processing:claude-3-opus'),
      redis.llen('processing:gpt-4o'),
      redis.llen('processing:deepseek-coder'),
    ]);

    return NextResponse.json({
      queues: {
        'claude-3-opus': { pending: stats[0], processing: stats[3] },
        'gpt-4o': { pending: stats[1], processing: stats[4] },
        'deepseek-coder': { pending: stats[2], processing: stats[5] },
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
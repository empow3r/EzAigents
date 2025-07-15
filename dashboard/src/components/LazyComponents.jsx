'use client';
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const Globe3D = lazy(() => import('./Globe3D'));
const Chart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Chart })));
const ReactFlow = lazy(() => import('react-flow-renderer'));

// Loading fallbacks
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-gray-100 rounded-lg h-64 animate-pulse flex items-center justify-center">
    <div className="text-gray-400">Loading chart...</div>
  </div>
);

// Lazy wrapped components with error boundaries
export const LazyGlobe3D = (props) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Globe3D {...props} />
  </Suspense>
);

export const LazyChart = (props) => (
  <Suspense fallback={<ChartSkeleton />}>
    <Chart {...props} />
  </Suspense>
);

export const LazyReactFlow = (props) => (
  <Suspense fallback={<LoadingSpinner />}>
    <ReactFlow {...props} />
  </Suspense>
);
'use client';
import React, { useEffect, useState } from 'react';

// SSR-safe wrapper for BleedingEdgeUX component
const BleedingEdgeUXWrapper = ({ children, darkMode }) => {
  const [isClient, setIsClient] = useState(false);
  const [BleedingEdgeUX, setBleedingEdgeUX] = useState(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import the component only on the client side
    import('./BleedingEdgeUX').then(module => {
      setBleedingEdgeUX(() => module.default);
    }).catch(err => {
      console.error('Failed to load BleedingEdgeUX:', err);
    });
  }, []);

  // During SSR or while loading, render children directly
  if (!isClient || !BleedingEdgeUX) {
    return <>{children}</>;
  }

  // Once loaded on client, render with BleedingEdgeUX
  return <BleedingEdgeUX darkMode={darkMode}>{children}</BleedingEdgeUX>;
};

export default BleedingEdgeUXWrapper;
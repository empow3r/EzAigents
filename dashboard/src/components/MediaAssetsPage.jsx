'use client';
import React, { useState } from 'react';

const MediaAssetsPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Media Assets</h2>
      <div className="text-center py-8 text-gray-500">
        Media assets manager coming soon...
      </div>
    </div>
  );
};

export default MediaAssetsPage;
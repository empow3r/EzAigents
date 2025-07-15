'use client';
import React, { useState } from 'react';

const ContentReviewDashboard = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Content Review Dashboard</h2>
      <div className="text-center py-8 text-gray-500">
        Content review system coming soon...
      </div>
    </div>
  );
};

export default ContentReviewDashboard;

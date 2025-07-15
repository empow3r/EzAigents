'use client';
import React, { useState } from 'react';

const CharactersPersonasPage = () => {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Characters & Personas</h2>
      <div className="text-center py-8 text-gray-500">
        Character and persona manager coming soon...
      </div>
    </div>
  );
};

export default CharactersPersonasPage;
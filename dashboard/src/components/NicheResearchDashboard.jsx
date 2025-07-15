'use client';
import React, { useState, useEffect } from 'react';

const NicheResearchDashboard = () => {
  const [activeTab, setActiveTab] = useState('analysis');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [researchHistory, setResearchHistory] = useState([]);
  const [popularNiches, setPopularNiches] = useState([]);
  const [trends, setTrends] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [keywords, setKeywords] = useState(null);

  useEffect(() => {
    loadResearchHistory();
    loadPopularNiches();
  }, []);

  const loadResearchHistory = async () => {
    try {
      const response = await fetch('/api/niche-research?type=history&limit=10');
      if (response.ok) {
        const data = await response.json();
        setResearchHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load research history:', error);
    }
  };

  const loadPopularNiches = async () => {
    try {
      const response = await fetch('/api/niche-research?type=popular_niches&limit=10');
      if (response.ok) {
        const data = await response.json();
        setPopularNiches(data.popularNiches || []);
      }
    } catch (error) {
      console.error('Failed to load popular niches:', error);
    }
  };

  const handleNicheAnalysis = async () => {
    if (!niche.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_niche',
          niche,
          targetAudience,
          platform,
          researchDepth: 'comprehensive'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.analysis);
        await loadResearchHistory();
      }
    } catch (error) {
      console.error('Niche analysis failed:', error);
    }
    setLoading(false);
  };

  const generateContentIdeas = async () => {
    if (!niche.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_ideas',
          niche,
          targetAudience,
          platform,
          count: 15
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults({ ideas: data.ideas });
      }
    } catch (error) {
      console.error('Idea generation failed:', error);
    }
    setLoading(false);
  };

  const researchTrends = async () => {
    if (!niche.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'research_trends',
          niche,
          timeframe: '30d',
          platform
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Trend research failed:', error);
    }
    setLoading(false);
  };

  const analyzeCompetitors = async () => {
    if (!niche.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_competitors',
          niche,
          analysisType: 'comprehensive'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCompetitors(data.analysis);
      }
    } catch (error) {
      console.error('Competitor analysis failed:', error);
    }
    setLoading(false);
  };

  const performKeywordResearch = async () => {
    if (!niche.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/niche-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'keyword_research',
          niche,
          includeRelated: true,
          targetCountry: 'US'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords);
      }
    } catch (error) {
      console.error('Keyword research failed:', error);
    }
    setLoading(false);
  };

  const handleNicheSelect = (selectedNiche) => {
    setNiche(selectedNiche);
  };

  const tabs = [
    { id: 'analysis', label: 'Niche Analysis', icon: '🎯' },
    { id: 'ideas', label: 'Content Ideas', icon: '💡' },
    { id: 'trends', label: 'Trend Research', icon: '📈' },
    { id: 'competitors', label: 'Competitors', icon: '🏆' },
    { id: 'keywords', label: 'Keywords', icon: '🔍' },
    { id: 'history', label: 'Research History', icon: '📋' }
  ];

  return (
    <div className="niche-research-dashboard space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔬 Niche Deep Research & Ideation</h2>
        <p className="text-gray-600 mb-6">
          Comprehensive niche analysis, market research, and content ideation platform
        </p>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niche/Industry
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., Digital Marketing, AI Technology, Fitness"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Small business owners"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Platforms</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
              <option value="blog">Blog/Website</option>
            </select>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleNicheAnalysis}
            disabled={loading || !niche.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎯 Analyze Niche
          </button>
          <button
            onClick={generateContentIdeas}
            disabled={loading || !niche.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💡 Generate Ideas
          </button>
          <button
            onClick={researchTrends}
            disabled={loading || !niche.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📈 Research Trends
          </button>
          <button
            onClick={analyzeCompetitors}
            disabled={loading || !niche.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🏆 Analyze Competitors
          </button>
          <button
            onClick={performKeywordResearch}
            disabled={loading || !niche.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔍 Keyword Research
          </button>
        </div>
      </div>

      {/* Popular Niches */}
      {popularNiches.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">🔥 Popular Research Niches</h3>
          <div className="flex flex-wrap gap-2">
            {popularNiches.slice(0, 10).map((item, index) => (
              <button
                key={index}
                onClick={() => handleNicheSelect(item.niche)}
                className="px-3 py-1 bg-gray-100 hover:bg-blue-100 text-gray-700 rounded-full text-sm transition-colors"
              >
                {item.niche} ({item.searches})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Researching your niche...</span>
          </div>
        </div>
      )}

      {/* Results Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Niche Analysis Results */}
          {activeTab === 'analysis' && results && !results.ideas && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Market Size</h4>
                  <div className="text-2xl font-bold text-blue-600">{results.marketSize?.score}/100</div>
                  <p className="text-sm text-blue-700">{results.marketSize?.description}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Competition Level</h4>
                  <div className="text-2xl font-bold text-yellow-600">{results.competitionLevel?.score}/100</div>
                  <p className="text-sm text-yellow-700">{results.competitionLevel?.description}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Monetization Potential</h4>
                  <div className="text-2xl font-bold text-green-600">{results.monetizationPotential?.score}/100</div>
                  <p className="text-sm text-green-700">{results.monetizationPotential?.potential}</p>
                </div>
              </div>

              {results.swotAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3">💪 Strengths</h4>
                      <ul className="space-y-1">
                        {results.swotAnalysis.strengths?.map((item, i) => (
                          <li key={i} className="text-sm text-green-800">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3">🚀 Opportunities</h4>
                      <ul className="space-y-1">
                        {results.swotAnalysis.opportunities?.map((item, i) => (
                          <li key={i} className="text-sm text-blue-800">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-3">⚠️ Weaknesses</h4>
                      <ul className="space-y-1">
                        {results.swotAnalysis.weaknesses?.map((item, i) => (
                          <li key={i} className="text-sm text-red-800">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-3">⚡ Threats</h4>
                      <ul className="space-y-1">
                        {results.swotAnalysis.threats?.map((item, i) => (
                          <li key={i} className="text-sm text-orange-800">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {results.recommendations && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">📝 Recommendations</h4>
                  <div className="space-y-3">
                    {results.recommendations.map((rec, i) => (
                      <div key={i} className="bg-white p-3 rounded border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{rec.category}</h5>
                          <span className={`px-2 py-1 text-xs rounded ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' : 
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{rec.recommendation}</p>
                        <span className="text-xs text-gray-500">{rec.timeframe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content Ideas Results */}
          {activeTab === 'ideas' && results && results.ideas && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">💡 Generated Content Ideas ({results.ideas.length})</h3>
              <div className="grid gap-4">
                {results.ideas.map((idea, index) => (
                  <div key={idea.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{idea.title}</h4>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          idea.difficulty === 'low' ? 'bg-green-100 text-green-800' : 
                          idea.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {idea.difficulty}
                        </span>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Priority: {idea.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3">{idea.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Type: {idea.contentType}</span>
                      <span>Engagement: {idea.estimatedEngagement}</span>
                    </div>
                    {idea.keywords && idea.keywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {idea.keywords.slice(0, 5).map((keyword, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends Results */}
          {activeTab === 'trends' && trends && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">📈 Trend Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">🔥 Trending</h4>
                  <ul className="space-y-2">
                    {trends.trending?.map((trend, i) => (
                      <li key={i} className="text-sm text-green-800">• {trend}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">✨ Emerging</h4>
                  <ul className="space-y-2">
                    {trends.emerging?.map((trend, i) => (
                      <li key={i} className="text-sm text-blue-800">• {trend}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-3">📉 Declining</h4>
                  <ul className="space-y-2">
                    {trends.declining?.map((trend, i) => (
                      <li key={i} className="text-sm text-red-800">• {trend}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Analysis Summary</h4>
                <p className="text-gray-700">{trends.analysis}</p>
              </div>
            </div>
          )}

          {/* Competitors Results */}
          {activeTab === 'competitors' && competitors && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">🏆 Competitor Analysis</h3>
              {competitors.topCompetitors && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Top Competitors</h4>
                  {competitors.topCompetitors.map((competitor, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-semibold">{competitor.name}</h5>
                        <span className="text-sm text-gray-500">Market Share: {competitor.marketShare}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {competitor.strengths?.map((strength, j) => (
                          <span key={j} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {competitors.gaps && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-3">🎯 Market Gaps</h4>
                  <ul className="space-y-1">
                    {competitors.gaps.map((gap, i) => (
                      <li key={i} className="text-sm text-yellow-800">• {gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {competitors.recommendations && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">💡 Recommendations</h4>
                  <ul className="space-y-1">
                    {competitors.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-green-800">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Keywords Results */}
          {activeTab === 'keywords' && keywords && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">🔍 Keyword Research</h3>
              
              {keywords.primary && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Primary Keywords</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Keyword</th>
                          <th className="px-4 py-2 text-left">Search Volume</th>
                          <th className="px-4 py-2 text-left">Difficulty</th>
                          <th className="px-4 py-2 text-left">Competition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {keywords.primary.slice(0, 10).map((kw, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-medium">{kw.keyword}</td>
                            <td className="px-4 py-2">{kw.searchVolume?.toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                kw.difficulty < 30 ? 'bg-green-100 text-green-800' : 
                                kw.difficulty < 70 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {kw.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                kw.competition === 'low' ? 'bg-green-100 text-green-800' : 
                                kw.competition === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {kw.competition}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {keywords.longTail && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Long-tail Keywords</h4>
                  <div className="grid gap-2">
                    {keywords.longTail.slice(0, 8).map((kw, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{kw.keyword}</span>
                        <div className="flex space-x-2 text-sm text-gray-600">
                          <span>{kw.searchVolume?.toLocaleString()} searches</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {kw.difficulty} difficulty
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Research History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">📋 Research History</h3>
              {researchHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No research history available yet. Start by analyzing a niche!
                </div>
              ) : (
                <div className="space-y-3">
                  {researchHistory.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => handleNicheSelect(item.niche)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.niche}</h4>
                          <p className="text-sm text-gray-600">Platform: {item.platform}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {activeTab === 'analysis' && !results && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium mb-2">Ready to Research Your Niche?</h3>
              <p className="mb-4">Enter a niche above and click "Analyze Niche" to get started</p>
            </div>
          )}

          {(activeTab === 'ideas' && (!results || !results.ideas)) && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">💡</div>
              <h3 className="text-lg font-medium mb-2">Generate Content Ideas</h3>
              <p className="mb-4">Enter a niche and click "Generate Ideas" to see content suggestions</p>
            </div>
          )}

          {activeTab === 'trends' && !trends && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-lg font-medium mb-2">Research Current Trends</h3>
              <p className="mb-4">Discover what's trending in your niche</p>
            </div>
          )}

          {activeTab === 'competitors' && !competitors && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-medium mb-2">Analyze Your Competition</h3>
              <p className="mb-4">Get insights about your competitors and market gaps</p>
            </div>
          )}

          {activeTab === 'keywords' && !keywords && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium mb-2">Keyword Research</h3>
              <p className="mb-4">Find the best keywords for your niche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NicheResearchDashboard;
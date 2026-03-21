import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Sidebar = ({ onSelectLeague }) => {
  const [sports, setSports] = useState([]);
  const [expandedSport, setExpandedSport] = useState(null);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [tree, setTree] = useState({});

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    // Fetch all competitions to build the tree
    const { data, error } = await supabase
      .from('competitions')
      .select('competition_id, competition_name, category, sport_id');

    if (data) {
      const newTree = {};
      data.forEach(item => {
        if (!newTree[item.sport_id]) newTree[item.sport_id] = {};
        if (!newTree[item.sport_id][item.category]) newTree[item.sport_id][item.category] = [];
        newTree[item.sport_id][item.category].push(item);
      });
      setTree(newTree);
      
      // Get unique sports from the tree
      setSports(Object.keys(newTree));
    }
  };

  const sportNames = { "14": "Soccer", "30": "Basketball", "28": "Tennis", "41": "Rugby", "29": "Hockey", "37": "Cricket" };

  return (
    <div className="w-64 bg-[#0f172a] h-screen text-slate-300 overflow-y-auto border-r border-slate-800 p-4">
      <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-6">Sports Menu</h2>
      
      {sports.map(sportId => (
        <div key={sportId} className="mb-2">
          {/* Level 1: Sport */}
          <button 
            onClick={() => setExpandedSport(expandedSport === sportId ? null : sportId)}
            className="w-full flex justify-between items-center p-2 hover:bg-slate-800 rounded-lg transition-colors group"
          >
            <span className="group-hover:text-white font-medium">{sportNames[sportId] || 'Other'}</span>
            <span>{expandedSport === sportId ? '−' : '+'}</span>
          </button>

          {/* Level 2: Country (Category) */}
          {expandedSport === sportId && tree[sportId] && (
            <div className="ml-4 mt-1 border-l border-slate-700 pl-2">
              {Object.keys(tree[sportId]).map(country => (
                <div key={country} className="mb-1">
                  <button 
                    onClick={() => setExpandedCountry(expandedCountry === country ? null : country)}
                    className="w-full text-left p-1 text-sm hover:text-emerald-400 flex justify-between"
                  >
                    <span>{country}</span>
                    <span className="text-[10px] opacity-50">{expandedCountry === country ? '▼' : '▶'}</span>
                  </button>

                  {/* Level 3: League (Competition) */}
                  {expandedCountry === country && (
                    <div className="ml-3 mt-1 space-y-1">
                      {tree[sportId][country].map(league => (
                        <button
                          key={league.competition_id}
                          onClick={() => onSelectLeague(league.competition_id)}
                          className="w-full text-left p-1 text-xs text-slate-500 hover:text-white hover:bg-emerald-500/10 rounded block truncate"
                        >
                          {league.competition_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FilterX, ChevronRight, ChevronDown, Globe } from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [sports, setSports] = useState([]);
  const [expandedSport, setExpandedSport] = useState(null);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    // Fetch unique competitions to build the Sport -> Country -> League tree
    const { data, error } = await supabase
      .from('competitions')
      .select('competition_id, competition_name, category, sport_id');

    if (data) {
      const newTree = {};
      data.forEach(item => {
        const cat = item.category || "International"; // Handle null categories
        if (!newTree[item.sport_id]) newTree[item.sport_id] = {};
        if (!newTree[item.sport_id][cat]) newTree[item.sport_id][cat] = [];
        newTree[item.sport_id][cat].push(item);
      });
      setTree(newTree);
      setSports(Object.keys(newTree));
    }
    setLoading(false);
  };

  const sportNames = { "14": "Soccer", "30": "Basketball", "28": "Tennis", "41": "Rugby", "29": "Hockey", "37": "Cricket" };

  const handleClear = () => {
    setExpandedSport(null);
    setExpandedCountry(null);
    onClearFilter(); // Signal Home to fetch all matches again
  };

  return (
    <div className="w-full bg-[#0f172a] rounded-3xl border border-slate-800 p-4 sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
      
      {/* 🚀 Creative Header & Clear Filter */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sports Menu</h2>
        <button 
          onClick={handleClear}
          className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all group relative"
          title="Clear Filters"
        >
          <FilterX size={16} />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Clear Filter
          </span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-800 rounded-xl w-full" />)}
        </div>
      ) : (
        <div className="space-y-1">
          {sports.sort().map(sportId => (
            <div key={sportId} className="group">
              {/* Level 1: Sport */}
              <button 
                onClick={() => setExpandedSport(expandedSport === sportId ? null : sportId)}
                className={`w-full flex justify-between items-center p-3 rounded-2xl transition-all border ${
                  expandedSport === sportId 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-sm font-bold tracking-tight">{sportNames[sportId] || 'Other'}</span>
                {expandedSport === sportId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {/* Level 2: Country (Category) */}
              {expandedSport === sportId && tree[sportId] && (
                <div className="ml-4 mt-2 space-y-1 border-l-2 border-slate-800 pl-3 mb-4">
                  {Object.keys(tree[sportId]).sort().map(country => (
                    <div key={country}>
                      <button 
                        onClick={() => setExpandedCountry(expandedCountry === country ? null : country)}
                        className={`w-full text-left py-2 px-2 text-xs font-bold flex items-center justify-between rounded-lg transition-colors ${
                          expandedCountry === country ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe size={10} className="opacity-40" />
                          {country}
                        </div>
                        <span className="text-[8px] opacity-30">{expandedCountry === country ? '▼' : '▶'}</span>
                      </button>

                      {/* Level 3: League (Competition) */}
                      {expandedCountry === country && (
                        <div className="ml-4 mt-1 space-y-1 py-1">
                          {tree[sportId][country].map(league => (
                            <button
                              key={league.competition_id}
                              onClick={() => onSelectLeague(league.competition_id)}
                              className="w-full text-left p-2 text-[11px] font-medium text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/5 rounded-lg transition-all truncate"
                            >
                              {league.competition_name.replace(/['"]+/g, '')} {/* Clean syntax */}
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
      )}
    </div>
  );
};

export default Sidebar;

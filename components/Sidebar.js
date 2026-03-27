import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Trophy, 
  ChevronRight, 
  ChevronDown, 
  FilterX,
  Globe 
} from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [sports, setSports] = useState([]);
  const [tree, setTree] = useState({}); 
  const [expandedSport, setExpandedSport] = useState(null);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [loading, setLoading] = useState(true);

  // Updated to match only your 5 core sports
  const sportMapping = {
    "soccer": { name: "Soccer", icon: "⚽" },
    "basketball": { name: "Basketball", icon: "🏀" },
    "tennis": { name: "Tennis", icon: "🎾" },
    "hockey": { name: "Ice Hockey", icon: "🏒" },
    "tabletennis": { name: "Table Tennis", icon: "🏓" },
    "default": { name: "Other", icon: "🏆" }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    
    // 1. Define allowed sports for the whitelist
    const allowedSports = ['soccer', 'basketball', 'hockey', 'tennis', 'tabletennis'];

    // 2. Fetch data with strict whitelist
    const { data } = await supabase
      .from('api_events')
      .select('sport_key, country, league_name')
      .in('sport_key', allowedSports) // Database-level whitelist
      .gt('commence_time', now) 
      .order('country', { ascending: true });

    if (data) {
      const newTree = {};
      
      data.forEach(item => {
        const sport = item.sport_key;
        const league = (item.league_name || "").replace(/['"]+/g, '').trim();
        const leagueLower = league.toLowerCase();

        // 3. Robust check to exclude eSports/SRL from the Sidebar menu
        const isVirtual = 
          leagueLower.includes('ebasketball') || 
          leagueLower.includes('esoccer') || 
          leagueLower.includes('srl') || 
          leagueLower.includes('electronic') ||
          leagueLower.includes('cyber');

        if (isVirtual) return; // Skip these items

        const country = (item.country || "International").replace(/['"]+/g, '').trim();
        
        if (!newTree[sport]) newTree[sport] = {};
        if (!newTree[sport][country]) newTree[sport][country] = new Set();
        
        newTree[sport][country].add(league);
      });

      const finalTree = {};
      Object.keys(newTree).forEach(s => {
        finalTree[s] = {};
        Object.keys(newTree[s]).forEach(c => {
          finalTree[s][c] = Array.from(newTree[s][c]);
        });
      });

      setTree(finalTree);
      setSports(Object.keys(finalTree));
    }
    setLoading(false);
  };

  const handleLeagueClick = (name) => {
    onSelectLeague(name);
  };

  return (
    <div className="w-full bg-[#111926] text-slate-300 min-h-screen border-r border-white/5">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
           <Trophy size={16} className="text-[#10b981]" />
           <span className="text-xs font-black uppercase tracking-widest italic">Sports Menu</span>
        </div>
        <button onClick={onClearFilter} className="text-slate-500 hover:text-white transition-colors">
          <FilterX size={14} />
        </button>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-white/5 rounded w-full animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col">
            {sports.map(sportKey => {
              const meta = sportMapping[sportKey] || sportMapping.default;
              const isSportExpanded = expandedSport === sportKey;

              return (
                <div key={sportKey} className="flex flex-col">
                  <button 
                    onClick={() => setExpandedSport(isSportExpanded ? null : sportKey)}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group ${isSportExpanded ? 'bg-white/5 text-white' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base grayscale group-hover:grayscale-0 transition-all">{meta.icon}</span>
                      <span className="text-sm font-bold uppercase tracking-tight">{meta.name}</span>
                    </div>
                    {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {isSportExpanded && tree[sportKey] && (
                    <div className="bg-[#0b0f1a]/50">
                      {Object.keys(tree[sportKey]).map(country => {
                        const isCountryExpanded = expandedCountry === country;
                        
                        return (
                          <div key={country} className="flex flex-col">
                            <button 
                              onClick={() => setExpandedCountry(isCountryExpanded ? null : country)}
                              className="flex items-center justify-between px-6 py-2 hover:text-white transition-colors border-l-2 border-[#10b981]/10 ml-2"
                            >
                              <div className="flex items-center gap-2">
                                <Globe size={12} className="text-slate-600" />
                                <span className="text-[10px] font-black uppercase italic text-slate-400">{country}</span>
                              </div>
                              {isCountryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} className="opacity-20" />}
                            </button>

                            {isCountryExpanded && (
                              <div className="bg-[#0b0f1a] ml-8 mb-1 border-l border-white/5">
                                {tree[sportKey][country].map(league => (
                                  <button
                                    key={league}
                                    onClick={() => handleLeagueClick(league)}
                                    className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-[#10b981] hover:bg-white/5 transition-all truncate uppercase italic"
                                  >
                                    {league}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

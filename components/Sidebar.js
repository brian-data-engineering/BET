import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trophy, ChevronRight, ChevronDown, FilterX, Globe } from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [tree, setTree] = useState({}); 
  const [expandedSport, setExpandedSport] = useState('soccer'); 
  const [expandedCountry, setExpandedCountry] = useState(null); // New state for country toggle
  const [loading, setLoading] = useState(true);

  const sportMapping = {
    "soccer": { name: "Soccer", icon: "⚽" },
    "basketball": { name: "Basketball", icon: "🏀" },
    "tennis": { name: "Tennis", icon: "🎾" },
    "ice-hockey": { name: "Ice Hockey", icon: "🏒" },
    "table-tennis": { name: "Table Tennis", icon: "🏓" }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const allowedSports = Object.keys(sportMapping);

    const { data } = await supabase
      .from('api_events')
      .select('sport_key, country, league_name')
      .in('sport_key', allowedSports) 
      .gt('commence_time', now) 
      .order('country', { ascending: true });

    if (data) {
      const newTree = {};
      data.forEach(item => {
        const sport = item.sport_key;
        const league = (item.league_name || "").replace(/['"]+/g, '').trim();
        const country = (item.country || "International").replace(/['"]+/g, '').trim();
        
        if (/(ebasketball|esoccer|srl|electronic|cyber)/i.test(league)) return;
        
        if (!newTree[sport]) newTree[sport] = {};
        if (!newTree[sport][country]) newTree[sport][country] = new Set();
        newTree[sport][country].add(league);
      });

      const finalTree = {};
      Object.keys(newTree).forEach(s => {
        finalTree[s] = {};
        Object.keys(newTree[s]).sort().forEach(c => {
          finalTree[s][c] = Array.from(newTree[s][c]).sort();
        });
      });
      setTree(finalTree);
    }
    setLoading(false);
  };

  // Reset country expansion when sport changes
  const handleSportClick = (sportKey) => {
    setExpandedSport(expandedSport === sportKey ? null : sportKey);
    setExpandedCountry(null); 
  };

  return (
    /* h-screen + flex-col makes the container fill the height without growing */
    <div className="w-full bg-[#111926] text-slate-300 h-screen flex flex-col select-none overflow-hidden">
      
      {/* FIXED HEADER */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0b0f1a] sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <Trophy size={14} className="text-[#10b981]" />
           <span className="text-[11px] font-black uppercase tracking-widest italic">A-Z Sports</span>
        </div>
        <button onClick={onClearFilter} className="text-slate-500 hover:text-white transition-colors">
          <FilterX size={14} />
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : (
          Object.keys(sportMapping).map(sportKey => {
            const meta = sportMapping[sportKey];
            const isSportExpanded = expandedSport === sportKey;
            const countries = tree[sportKey] || {};

            return (
              <div key={sportKey} className="border-b border-white/5 last:border-0">
                <button 
                  onClick={() => handleSportClick(sportKey)}
                  className={`w-full flex items-center justify-between px-4 py-4 transition-all ${isSportExpanded ? 'bg-[#10b981]/10 text-white' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-[10px] font-black uppercase italic tracking-tight">{meta.name}</span>
                  </div>
                  {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-20" />}
                </button>

                {isSportExpanded && (
                  <div className="bg-[#0b0f1a]/30">
                    {Object.keys(countries).length === 0 ? (
                      <div className="px-10 py-4 text-[10px] text-slate-600 italic">No active events</div>
                    ) : (
                      Object.keys(countries).map(country => {
                        const isCountryExpanded = expandedCountry === `${sportKey}-${country}`;
                        return (
                          <div key={country} className="border-t border-white/5 first:border-0">
                            {/* COUNTRY TOGGLE */}
                            <button 
                              onClick={() => setExpandedCountry(isCountryExpanded ? null : `${sportKey}-${country}`)}
                              className="w-full px-6 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Globe size={10} className={isCountryExpanded ? "text-[#10b981]" : "text-slate-600"} />
                                <span className={`text-[9px] font-black uppercase italic ${isCountryExpanded ? "text-white" : "text-slate-400"}`}>{country}</span>
                              </div>
                              {isCountryExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} className="opacity-30" />}
                            </button>

                            {/* LEAGUES LIST - ONLY VISIBLE IF COUNTRY EXPANDED */}
                            {isCountryExpanded && (
                              <div className="flex flex-col bg-black/20">
                                {countries[country].map(league => (
                                  <button
                                    key={league}
                                    onClick={() => onSelectLeague(league, sportKey)}
                                    className="w-full text-left px-12 py-2.5 text-[10px] font-bold text-slate-500 hover:text-white hover:bg-[#10b981]/20 transition-all truncate uppercase italic border-l-2 border-transparent hover:border-[#10b981]"
                                  >
                                    {league}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;

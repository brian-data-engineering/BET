import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trophy, ChevronRight, ChevronDown, FilterX, Globe, Activity } from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [tree, setTree] = useState({}); 
  const [expandedSport, setExpandedSport] = useState('soccer'); 
  const [expandedCountry, setExpandedCountry] = useState(null); 
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

  const handleSportClick = (sportKey) => {
    setExpandedSport(expandedSport === sportKey ? null : sportKey);
    setExpandedCountry(null); 
  };

  return (
    <div className="w-full bg-[#111926] text-slate-300 h-full flex flex-col select-none overflow-hidden border-r border-white/5 shadow-2xl">
      
      {/* FIXED HEADER */}
      <div className="p-5 flex items-center justify-between border-b border-white/5 bg-[#0b0f1a]">
        <div className="flex items-center gap-3">
           <div className="bg-[#10b981]/10 p-1.5 rounded-lg">
             <Trophy size={14} className="text-[#10b981]" />
           </div>
           <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-white/90">A-Z Sports</span>
        </div>
        <button 
          onClick={onClearFilter} 
          className="p-1.5 hover:bg-white/5 rounded-md text-slate-500 hover:text-red-400 transition-all"
          title="Clear Filters"
        >
          <FilterX size={14} />
        </button>
      </div>

      {/* LIVE QUICK LINK */}
      <div className="px-2 pt-4 pb-2">
        <button className="w-full flex items-center justify-between px-4 py-3 bg-[#1c2636] border border-white/5 rounded-xl hover:bg-[#253247] transition-all group">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase italic tracking-wider text-slate-200">Live Events</span>
          </div>
          <div className="bg-red-500 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-1">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          Object.keys(sportMapping).map(sportKey => {
            const meta = sportMapping[sportKey];
            const isSportExpanded = expandedSport === sportKey;
            const countries = tree[sportKey] || {};

            return (
              <div key={sportKey} className="overflow-hidden">
                <button 
                  onClick={() => handleSportClick(sportKey)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                    isSportExpanded 
                    ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/10' 
                    : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg filter grayscale-[0.5] group-hover:grayscale-0">{meta.icon}</span>
                    <span className="text-[10px] font-black uppercase italic tracking-widest">{meta.name}</span>
                  </div>
                  {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                </button>

                {isSportExpanded && (
                  <div className="mt-1 ml-2 space-y-1 border-l border-white/5">
                    {Object.keys(countries).length === 0 ? (
                      <div className="px-8 py-4 text-[10px] text-slate-600 italic">No upcoming matches</div>
                    ) : (
                      Object.keys(countries).map(country => {
                        const isCountryExpanded = expandedCountry === `${sportKey}-${country}`;
                        return (
                          <div key={country} className="pl-2">
                            <button 
                              onClick={() => setExpandedCountry(isCountryExpanded ? null : `${sportKey}-${country}`)}
                              className={`w-full px-4 py-2.5 flex items-center justify-between rounded-lg transition-colors ${
                                isCountryExpanded ? 'bg-white/5 text-white' : 'hover:bg-white/5 text-slate-500'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Globe size={11} className={isCountryExpanded ? "text-[#10b981]" : "text-slate-600"} />
                                <span className="text-[9px] font-black italic uppercase tracking-tighter">{country}</span>
                              </div>
                              {isCountryExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} className="opacity-30" />}
                            </button>

                            {isCountryExpanded && (
                              <div className="flex flex-col py-1 gap-0.5">
                                {countries[country].map(league => (
                                  <button
                                    key={league}
                                    onClick={() => onSelectLeague(league, sportKey)}
                                    className="w-full text-left px-9 py-2 text-[9px] font-bold text-slate-500 hover:text-[#10b981] hover:bg-[#10b981]/5 transition-all truncate italic relative group"
                                  >
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-700 rounded-full group-hover:bg-[#10b981]" />
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
      
      {/* FOOTER STATS (Optional) */}
      <div className="p-4 bg-[#0b0f1a]/50 border-t border-white/5">
        <div className="flex items-center justify-between text-[8px] font-black uppercase italic text-slate-600 tracking-widest">
          <span>Lucra Engine v2.0</span>
          <span className="text-[#10b981]">Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

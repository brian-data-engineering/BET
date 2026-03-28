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
  const [tree, setTree] = useState({}); 
  const [expandedSport, setExpandedSport] = useState('soccer'); 
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
      .order('country', { ascending: true })
      .order('league_name', { ascending: true });

    if (data) {
      const newTree = {};
      
      data.forEach(item => {
        const sport = item.sport_key;
        // Clean names to handle potential scrap/extra quotes
        const league = (item.league_name || "").replace(/['"]+/g, '').trim();
        const country = (item.country || "International").replace(/['"]+/g, '').trim();

        // Filter out virtual/e-sports if they slipped through
        if (/(ebasketball|esoccer|srl|electronic|cyber)/i.test(league)) return;

        if (!newTree[sport]) newTree[sport] = {};
        if (!newTree[sport][country]) newTree[sport][country] = new Set();
        
        newTree[sport][country].add(league);
      });

      const finalTree = {};
      Object.keys(newTree).forEach(s => {
        finalTree[s] = {};
        Object.keys(newTree[s]).sort().forEach(c => {
          finalTree[s][c] = Array.from(newTree[s][c]);
        });
      });

      setTree(finalTree);
    }
    setLoading(false);
  };

  return (
    <div className="w-full bg-[#111926] text-slate-300 min-h-screen border-r border-white/5 select-none">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0b0f1a]/50">
        <div className="flex items-center gap-2">
           <Trophy size={14} className="text-[#10b981]" />
           <span className="text-[11px] font-black uppercase tracking-widest italic">Sports Menu</span>
        </div>
        <button onClick={onClearFilter} className="text-slate-500 hover:text-white transition-colors">
          <FilterX size={14} />
        </button>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : (
          Object.keys(sportMapping).map(sportKey => {
            const meta = sportMapping[sportKey];
            const isSportExpanded = expandedSport === sportKey;
            const countries = tree[sportKey] || {};

            return (
              <div key={sportKey} className="border-b border-white/5 last:border-0">
                <button 
                  onClick={() => setExpandedSport(isSportExpanded ? null : sportKey)}
                  className={`w-full flex items-center justify-between px-4 py-4 transition-all ${isSportExpanded ? 'bg-[#10b981]/10 text-white' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-xs font-black uppercase tracking-tight">{meta.name}</span>
                  </div>
                  {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-20" />}
                </button>

                {isSportExpanded && (
                  <div className="bg-[#0b0f1a]/30 max-h-[600px] overflow-y-auto no-scrollbar">
                    {Object.keys(countries).length === 0 ? (
                      <div className="px-10 py-4 text-[10px] text-slate-600 italic">No active leagues</div>
                    ) : (
                      Object.keys(countries).map(country => (
                        <div key={country} className="group">
                          {/* Country Row */}
                          <div className="px-6 py-2 flex items-center gap-2 bg-white/5 border-y border-white/5">
                            <Globe size={10} className="text-slate-600" />
                            <span className="text-[9px] font-black uppercase italic text-slate-400">{country}</span>
                          </div>
                          
                          {/* Leagues under Country */}
                          <div className="flex flex-col">
                            {countries[country].map(league => (
                              <button
                                key={league}
                                onClick={() => onSelectLeague(league)}
                                className="w-full text-left px-10 py-2.5 text-[10px] font-bold text-slate-500 hover:text-white hover:bg-[#10b981]/20 transition-all truncate uppercase italic border-l-2 border-transparent hover:border-[#10b981]"
                              >
                                {league}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
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

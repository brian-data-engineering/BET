import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trophy, ChevronRight, ChevronDown, FilterX, Loader2, Star } from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [tree, setTree] = useState({});
  const [topLeagues, setTopLeagues] = useState([]);
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

    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('sport_key, league_name, tier_priority, start_time')
      .in('sport_key', allowedSports)
      .gt('start_time', now)
      .order('tier_priority', { ascending: false });

    if (data) {
      const newTree = {};
      const popular = [];
      const seenLeagues = new Set();

      data.forEach(item => {
        const sport = item.sport_key;
        const league = (item.league_name || "Other").replace(/['"]+/g, '').trim();
        const country = league.includes('.') ? league.split('.')[0] : "International";

        if (/(ebasketball|esoccer|srl|electronic|cyber)/i.test(league)) return;

        // Popular Section (Tier >= 500)
        if (item.tier_priority >= 500 && !seenLeagues.has(league)) {
          popular.push({ name: league, sport: sport });
          seenLeagues.add(league);
        }

        // Structure: Sport -> Country -> List of Leagues
        if (!newTree[sport]) newTree[sport] = {};
        if (!newTree[sport][country]) newTree[sport][country] = new Set();
        newTree[sport][country].add(league);
      });

      setTopLeagues(popular.slice(0, 12));
      setTree(newTree);
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-full bg-[#111926] text-slate-300 flex flex-col select-none overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0b0f1a] shrink-0">
        <div className="flex items-center gap-2">
           <div className="bg-[#10b981]/10 p-1.5 rounded-lg">
             <Trophy size={14} className="text-[#10b981]" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest italic text-white/90">LUCRA SPORTS</span>
        </div>
        <button 
          onClick={onClearFilter} 
          className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-400 transition-all"
          title="Clear Filters"
        >
          <FilterX size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* POPULAR LEAGUES */}
        {!loading && topLeagues.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 flex items-center gap-2 text-amber-500">
              <Star size={12} fill="currentColor" />
              <span className="text-[9px] font-black uppercase tracking-widest">Top Events</span>
            </div>
            {topLeagues.map((league) => (
              <button
                key={league.name}
                onClick={() => onSelectLeague(league.name, league.sport)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.02] hover:bg-[#10b981]/10 hover:border-[#10b981]/20 transition-all group"
              >
                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white truncate uppercase italic">{league.name}</span>
                <ChevronRight size={12} className="text-slate-600 group-hover:text-[#10b981]" />
              </button>
            ))}
            <div className="h-px bg-white/5 my-4 mx-2" />
          </div>
        )}

        {/* ALL SPORTS HIERARCHY */}
        <div className="px-3 py-2 text-slate-500">
          <span className="text-[9px] font-black uppercase tracking-widest">A-Z Sports</span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col items-center justify-center opacity-20 py-20">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-[8px] font-black uppercase tracking-widest">Loading...</span>
          </div>
        ) : (
          <div className="px-2 space-y-1">
            {Object.keys(sportMapping).map(sportKey => {
              const meta = sportMapping[sportKey];
              const isSportExpanded = expandedSport === sportKey;
              const countries = tree[sportKey] || {};

              return (
                <div key={sportKey} className="rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedSport(isSportExpanded ? null : sportKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                      isSportExpanded ? 'bg-[#10b981] text-[#0b0f1a] rounded-xl' : 'hover:bg-white/5 text-slate-400 rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-[11px] font-black uppercase italic tracking-tighter">{meta.name}</span>
                    </div>
                    {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {isSportExpanded && (
                    <div className="mt-1 space-y-0.5 ml-4 border-l border-white/5">
                      {Object.keys(countries).map(country => (
                        <div key={country} className="flex flex-col">
                          <button 
                            onClick={() => setExpandedCountry(expandedCountry === country ? null : country)}
                            className="w-full px-4 py-2 flex items-center justify-between text-slate-500 hover:text-white"
                          >
                            <span className="text-[10px] font-bold uppercase truncate">{country}</span>
                            {expandedCountry === country ? <ChevronDown size={12} /> : <ChevronRight size={12} className="opacity-20" />}
                          </button>
                          
                          {expandedCountry === country && (
                            <div className="bg-white/[0.02] ml-2 py-1">
                              {[...countries[country]].map(league => (
                                <button
                                  key={league}
                                  onClick={() => onSelectLeague(league, sportKey)}
                                  className="w-full text-left px-4 py-2 text-[9px] text-slate-400 hover:text-[#10b981] hover:bg-white/[0.02] transition-colors truncate uppercase font-medium"
                                >
                                  {league}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
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

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router'; // Import router for navigation
import { Trophy, ChevronRight, ChevronDown, FilterX, Globe, Activity, Loader2, PlayCircle } from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const router = useRouter();
  const [tree, setTree] = useState({}); 
  const [expandedSport, setExpandedSport] = useState('soccer'); 
  const [expandedCountry, setExpandedCountry] = useState(null); 
  const [expandedLeague, setExpandedLeague] = useState(null); // New state for games
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

    // Added 'id', 'home_team', 'away_team' to the select
    const { data } = await supabase
      .from('api_events')
      .select('id, sport_key, country, league_name, home_team, away_team')
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
        if (!newTree[sport][country]) newTree[sport][country] = {};
        if (!newTree[sport][country][league]) newTree[sport][country][league] = [];
        
        // Push the specific game object into the league array
        newTree[sport][country][league].push({
          id: item.id,
          name: `${item.home_team} vs ${item.away_team}`.replace(/['"]+/g, '')
        });
      });

      setTree(newTree);
    }
    setLoading(false);
  };

  const handleSportClick = (sportKey) => {
    setExpandedSport(expandedSport === sportKey ? null : sportKey);
    setExpandedCountry(null); 
    setExpandedLeague(null);
  };

  return (
    <div className="w-full h-full bg-[#111926] text-slate-300 flex flex-col select-none overflow-hidden">
      
      {/* FIXED HEADER */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0b0f1a] shrink-0">
        <div className="flex items-center gap-2">
           <div className="bg-[#10b981]/10 p-1.5 rounded-lg">
             <Trophy size={14} className="text-[#10b981]" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest italic text-white/90">A-Z SPORTS</span>
        </div>
        <button 
          onClick={onClearFilter} 
          className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-400 transition-all"
        >
          <FilterX size={16} />
        </button>
      </div>

      {/* SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* LIVE LINK */}
        <div className="p-2">
          <button className="w-full flex items-center justify-between px-4 py-3 bg-[#1c2636]/50 border border-white/5 rounded-xl hover:bg-[#10b981]/10 transition-all group">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase italic text-slate-200">Live In-Play</span>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-[#10b981]" />
          </button>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col items-center justify-center opacity-20 py-20">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-[8px] font-black uppercase italic tracking-widest">Loading Markets...</span>
          </div>
        ) : (
          <div className="px-2 space-y-1">
            {Object.keys(sportMapping).map(sportKey => {
              const meta = sportMapping[sportKey];
              const isSportExpanded = expandedSport === sportKey;
              const countries = tree[sportKey] || {};

              return (
                <div key={sportKey} className="rounded-xl overflow-hidden transition-all">
                  <button 
                    onClick={() => handleSportClick(sportKey)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-all ${
                      isSportExpanded 
                      ? 'bg-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/10 rounded-xl' 
                      : 'hover:bg-white/5 text-slate-400 rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-[11px] font-black uppercase italic tracking-tighter">{meta.name}</span>
                    </div>
                    {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {isSportExpanded && (
                    <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {Object.keys(countries).length === 0 ? (
                        <div className="px-10 py-4 text-[9px] text-slate-600 italic uppercase font-bold tracking-widest">No Active Markets</div>
                      ) : (
                        Object.keys(countries).map(country => {
                          const isCountryExpanded = expandedCountry === `${sportKey}-${country}`;
                          return (
                            <div key={country} className="flex flex-col">
                              <button 
                                onClick={() => setExpandedCountry(isCountryExpanded ? null : `${sportKey}-${country}`)}
                                className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors border-l-2 ml-4 ${
                                  isCountryExpanded ? 'border-[#10b981] bg-white/5 text-white' : 'border-white/5 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Globe size={12} className={isCountryExpanded ? "text-[#10b981]" : "text-slate-600"} />
                                  <span className="text-[10px] font-black italic uppercase tracking-tight truncate max-w-[140px]">{country}</span>
                                </div>
                                {isCountryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} className="opacity-30" />}
                              </button>

                              {isCountryExpanded && (
                                <div className="flex flex-col bg-white/[0.02] border-l-2 border-[#10b981]/30 ml-8 my-0.5 rounded-r-lg">
                                  {Object.keys(countries[country]).map(league => {
                                    const isLeagueExpanded = expandedLeague === `${sportKey}-${country}-${league}`;
                                    return (
                                      <div key={league} className="flex flex-col">
                                        <button
                                          onClick={() => {
                                            setExpandedLeague(isLeagueExpanded ? null : `${sportKey}-${country}-${league}`);
                                            onSelectLeague(league, sportKey);
                                          }}
                                          className={`w-full text-left px-4 py-3 text-[10px] font-bold transition-all truncate italic border-b border-white/[0.02] last:border-0 flex items-center justify-between ${
                                            isLeagueExpanded ? 'text-[#10b981] bg-[#10b981]/5' : 'text-slate-400 hover:text-[#10b981] hover:bg-[#10b981]/5'
                                          }`}
                                        >
                                          <span className="truncate pr-2">{league}</span>
                                          {isLeagueExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} className="opacity-40" />}
                                        </button>

                                        {/* INDIVIDUAL GAMES LIST */}
                                        {isLeagueExpanded && (
                                          <div className="bg-black/20 flex flex-col py-1">
                                            {countries[country][league].map(game => (
                                              <button
                                                key={game.id}
                                                onClick={() => router.push(`/${game.id}`)}
                                                className="w-full text-left px-6 py-2.5 text-[9px] font-medium text-slate-500 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-all border-l border-[#10b981]/20"
                                              >
                                                <PlayCircle size={10} className="text-[#10b981]/50 shrink-0" />
                                                <span className="truncate">
                                                  {game.name.length > 25 ? `${game.name.substring(0, 25)}...` : game.name}
                                                </span>
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
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* SYSTEM STATUS */}
      <div className="p-4 bg-[#0b0f1a] border-t border-white/5 shrink-0">
        <div className="flex items-center justify-between text-[8px] font-black uppercase italic text-slate-600 tracking-widest">
          <span>Lucra Engine 2.0</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#10b981] animate-ping" />
            <span className="text-[#10b981]">Feed Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

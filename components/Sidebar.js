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
  const [tree, setTree] = useState({}); // { sportId: { countryName: [leagues] } }
  const [expandedSport, setExpandedSport] = useState(null);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [loading, setLoading] = useState(true);

  const sportMeta = {
    "14": { name: "Soccer", icon: "⚽" },
    "30": { name: "Basketball", icon: "🏀" },
    "28": { name: "Tennis", icon: "🎾" },
    "41": { name: "Rugby", icon: "🏉" },
    "29": { name: "Ice Hockey", icon: "🏒" },
    "37": { name: "Cricket", icon: "🏏" },
    "default": { name: "Other Sports", icon: "🏆" }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('competitions')
      .select('competition_id, competition_name, category, sport_id')
      .order('category', { ascending: true });

    if (data) {
      const newTree = {};
      data.forEach(item => {
        const sId = item.sport_id;
        const country = item.category || "Other";
        
        if (!newTree[sId]) newTree[sId] = {};
        if (!newTree[sId][country]) newTree[sId][country] = [];
        
        newTree[sId][country].push(item);
      });
      setTree(newTree);
      setSports(Object.keys(newTree));
    }
    setLoading(false);
  };

  const handleSportClick = (sportId) => {
    setExpandedSport(expandedSport === sportId ? null : sportId);
    setExpandedCountry(null); // Reset country when switching sports
  };

  const handleCountryClick = (countryName) => {
    setExpandedCountry(expandedCountry === countryName ? null : countryName);
  };

  return (
    <div className="w-full bg-[#111926] text-slate-300 min-h-screen border-r border-white/5">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
           <Trophy size={16} className="text-[#10b981]" />
           <span className="text-xs font-black uppercase tracking-widest italic">All Sports</span>
        </div>
        <button onClick={onClearFilter} className="text-slate-500 hover:text-white transition-colors">
          <FilterX size={14} />
        </button>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 bg-white/5 rounded w-full animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col">
            {sports.sort().map(sportId => {
              const meta = sportMeta[sportId] || sportMeta.default;
              const isSportExpanded = expandedSport === sportId;

              return (
                <div key={sportId} className="flex flex-col">
                  {/* LEVEL 1: SPORT */}
                  <button 
                    onClick={() => handleSportClick(sportId)}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group ${isSportExpanded ? 'bg-white/5 text-white' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base grayscale group-hover:grayscale-0 transition-all">{meta.icon}</span>
                      <span className="text-sm font-bold tracking-tight">{meta.name}</span>
                    </div>
                    {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {/* LEVEL 2: COUNTRY (CATEGORY) */}
                  {isSportExpanded && tree[sportId] && (
                    <div className="bg-[#0b0f1a]/50">
                      {Object.keys(tree[sportId]).map(country => {
                        const isCountryExpanded = expandedCountry === country;
                        return (
                          <div key={country} className="flex flex-col">
                            <button 
                              onClick={() => handleCountryClick(country)}
                              className="flex items-center justify-between px-6 py-2 hover:text-white transition-colors border-l-2 border-[#10b981]/10 ml-2"
                            >
                              <div className="flex items-center gap-2">
                                <Globe size={12} className="text-slate-600" />
                                <span className="text-[11px] font-black uppercase italic tracking-tighter text-slate-400">
                                  {country.replace(/['"]+/g, '')}
                                </span>
                              </div>
                              {isCountryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} className="opacity-20" />}
                            </button>

                            {/* LEVEL 3: LEAGUE */}
                            {isCountryExpanded && (
                              <div className="bg-[#0b0f1a] ml-8 mb-1 border-l border-white/5">
                                {tree[sportId][country].map(league => (
                                  <button
                                    key={league.competition_id}
                                    onClick={() => onSelectLeague(league.competition_name)}
                                    className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-[#10b981] hover:bg-white/5 transition-all truncate uppercase italic"
                                  >
                                    {league.competition_name.replace(/['"]+/g, '')}
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

      {/* App Download Promo */}
      <div className="mt-auto p-4 sticky bottom-0 bg-[#111926]">
        <div className="bg-gradient-to-br from-[#10b981]/20 to-transparent border border-[#10b981]/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-xl">
            <span className="text-[10px] font-black text-[#10b981] uppercase mb-2 italic tracking-widest">BonusBet Mobile</span>
            <button className="w-full bg-[#10b981] text-[#0b0f1a] text-[10px] font-black px-4 py-2.5 rounded-xl uppercase italic shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform">
              Download App
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

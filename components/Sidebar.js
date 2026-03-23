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

  const sportMapping = {
    "14": { name: "soccer", icon: "⚽" },
    "30": { name: "basketball", icon: "🏀" },
    "28": { name: "tennis", icon: "🎾" },
    "29": { name: "ice hockey", icon: "🏒" },
    "37": { name: "cricket", icon: "🏏" },
    "41": { name: "rugby", icon: "🏉" },
    "default": { name: "other", icon: "🏆" }
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
        const sId = String(item.sport_id);
        const country = item.category || "International";
        
        if (!newTree[sId]) newTree[sId] = {};
        if (!newTree[sId][country]) newTree[sId][country] = [];
        
        newTree[sId][country].push(item);
      });
      setTree(newTree);
      setSports(Object.keys(newTree));
    }
    setLoading(false);
  };

  const handleLeagueClick = (fullName) => {
    // If name is "Russia - KHL", we extract "KHL"
    const nameOnly = fullName.includes(' - ') ? fullName.split(' - ')[1] : fullName;
    onSelectLeague(nameOnly.replace(/['"]+/g, '').trim());
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
            {sports.map(sportId => {
              const meta = sportMapping[sportId] || sportMapping.default;
              const isSportExpanded = expandedSport === sportId;

              return (
                <div key={sportId} className="flex flex-col">
                  <button 
                    onClick={() => setExpandedSport(isSportExpanded ? null : sportId)}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group ${isSportExpanded ? 'bg-white/5 text-white' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base grayscale group-hover:grayscale-0 transition-all">{meta.icon}</span>
                      <span className="text-sm font-bold uppercase tracking-tight">{meta.name}</span>
                    </div>
                    {isSportExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {isSportExpanded && tree[sportId] && (
                    <div className="bg-[#0b0f1a]/50">
                      {Object.keys(tree[sportId]).map(country => {
                        const isCountryExpanded = expandedCountry === country;
                        const cleanCountry = country.replace(/['"]+/g, '');
                        
                        return (
                          <div key={country} className="flex flex-col">
                            <button 
                              onClick={() => setExpandedCountry(isCountryExpanded ? null : country)}
                              className="flex items-center justify-between px-6 py-2 hover:text-white transition-colors border-l-2 border-[#10b981]/10 ml-2"
                            >
                              <div className="flex items-center gap-2">
                                <Globe size={12} className="text-slate-600" />
                                <span className="text-[10px] font-black uppercase italic text-slate-400">{cleanCountry}</span>
                              </div>
                              {isCountryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} className="opacity-20" />}
                            </button>

                            {isCountryExpanded && (
                              <div className="bg-[#0b0f1a] ml-8 mb-1 border-l border-white/5">
                                {tree[sportId][country].map(league => (
                                  <button
                                    key={league.competition_id}
                                    onClick={() => handleLeagueClick(league.competition_name)}
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
    </div>
  );
};

export default Sidebar;

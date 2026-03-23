import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Trophy, 
  ChevronRight, 
  ChevronDown, 
  Activity, 
  FilterX 
} from 'lucide-react';

const Sidebar = ({ onSelectLeague, onClearFilter }) => {
  const [sports, setSports] = useState([]);
  const [expandedSport, setExpandedSport] = useState(null);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);

  // Mapping internal sport IDs to Lucide Icons & Names
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
      .select('competition_id, competition_name, category, sport_id');

    if (data) {
      const newTree = {};
      data.forEach(item => {
        if (!newTree[item.sport_id]) newTree[item.sport_id] = [];
        newTree[item.sport_id].push(item);
      });
      setTree(newTree);
      setSports(Object.keys(newTree));
    }
    setLoading(false);
  };

  return (
    <div className="w-full bg-[#111926] text-slate-300 min-h-screen border-r border-white/5">
      {/* Sidebar Header */}
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
              const isExpanded = expandedSport === sportId;

              return (
                <div key={sportId} className="flex flex-col">
                  {/* Sport Level */}
                  <button 
                    onClick={() => setExpandedSport(isExpanded ? null : sportId)}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group ${isExpanded ? 'bg-white/5 text-white' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base grayscale group-hover:grayscale-0 transition-all">
                        {meta.icon}
                      </span>
                      <span className="text-sm font-bold tracking-tight">
                        {meta.name}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-30" />}
                  </button>

                  {/* League Level - Visible on Expand */}
                  {isExpanded && tree[sportId] && (
                    <div className="bg-[#0b0f1a] py-1 border-l-2 border-[#10b981]/30 ml-4">
                      {tree[sportId].map(league => (
                        <button
                          key={league.competition_id}
                          onClick={() => onSelectLeague(league.competition_id)}
                          className="w-full text-left px-6 py-2 text-[11px] font-bold text-slate-500 hover:text-[#10b981] hover:bg-white/5 transition-all truncate uppercase"
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

      {/* Bonus Area: App Download (matches the screenshot footer) */}
      <div className="mt-8 p-4">
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-[10px] font-black text-[#10b981] uppercase mb-2 italic">BonusBet App</span>
            <button className="bg-[#10b981] text-white text-[10px] font-bold px-4 py-2 rounded-lg uppercase">
              Download Now
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

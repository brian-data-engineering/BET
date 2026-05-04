import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Globe, 
  ShieldCheck,
  Fingerprint,
  ChevronDown
} from 'lucide-react';

export default function LeagueMappingPage() {
  const [mappings, setMappings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const sports = ["ALL", "SOCCER", "TENNIS", "BASKETBALL", "ICE HOCKEY"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('league_mappings')
        .select('*')
        .order('is_verified', { ascending: true })
        .order('confidence_score', { ascending: false });

      setMappings(data || []);
    } catch (err) {
      console.error("Lucra Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('league_mappings')
      .update({ is_verified: newStatus })
      .eq('id', id);

    if (!error) {
      setMappings(prev => prev.map(m => 
        m.id === id ? { ...m, is_verified: newStatus } : m
      ));
    }
  };

  // NEW: Handle picking a league from the Discovery Pool
  const handleManualUpdate = async (id, newName) => {
    const { error } = await supabase
      .from('league_mappings')
      .update({ 
        linebet_league_name: newName,
        confidence_score: 100, // Manual override is always 100%
        is_verified: true      // Auto-verify when manually picked
      })
      .eq('id', id);

    if (!error) {
      setMappings(prev => prev.map(m => 
        m.id === id ? { ...m, linebet_league_name: newName, confidence_score: 100, is_verified: true } : m
      ));
    }
  };

  const filteredMappings = mappings.filter(m => {
    const matchesSearch = 
      m.api_display_league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.api_country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.linebet_league_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSport = selectedSport === "ALL" || 
      m.api_sport_key?.toUpperCase() === selectedSport;

    return matchesSearch && matchesSport;
  });

  return (
    <AdminLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Permanent Record Layer</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">League Bridge</h1>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="SEARCH BY LEAGUE OR COUNTRY..."
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#10b981] outline-none transition-all placeholder:opacity-30 text-white"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Sport Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all border ${
                selectedSport === sport 
                ? 'bg-[#10b981] text-[#0b0f1a] border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-[#111926] text-slate-500 border-white/5 hover:border-white/20'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Grid View */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Fetching Golden Mappings...</div>
          ) : filteredMappings.length === 0 ? (
            <div className="py-20 text-center italic font-black text-slate-800 uppercase tracking-widest border-2 border-dashed border-white/5 rounded-[3rem]">
              No {selectedSport !== "ALL" ? selectedSport : ""} Mappings Found
            </div>
          ) : (
            filteredMappings.map((item) => {
              // Parse the discovery pool for the dropdown
              const poolOptions = item.discovery_pool 
                ? [...new Set(item.discovery_pool.split(' ,, ').map(s => s.trim()))]
                : [];

              return (
                <div key={item.id} className={`bg-[#111926] border ${item.is_verified ? 'border-[#10b981]/40 bg-[#10b981]/[0.03]' : 'border-white/5'} p-6 rounded-[2rem] flex flex-col lg:flex-row items-center justify-between gap-6 transition-all hover:border-white/20`}>
                  
                  {/* Left Section: Scraped Source */}
                  <div className="flex items-center gap-6 flex-1 w-full">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase italic">Scraped Source</span>
                        <span className="bg-white/5 text-[8px] px-2 py-0.5 rounded text-slate-400 font-black italic uppercase">
                          {item.api_sport_key}
                        </span>
                      </div>
                      <h3 className="text-lg font-black italic text-white tracking-tight uppercase leading-tight">{item.api_display_league}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Globe size={10} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">{item.api_country}</span>
                      </div>
                    </div>

                    <ArrowRightLeft className={`${item.is_verified ? 'text-[#10b981]' : 'text-slate-700'} hidden lg:block shrink-0`} size={18} />

                    {/* Middle Section: Linebet Discovery Pool Dropdown */}
                    <div className="flex-1 w-full">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">
                        Linebet Match {poolOptions.length > 0 && `(${poolOptions.length} CANDIDATES FOUND)`}
                      </span>
                      
                      <div className="relative">
                        <select 
                          value={item.linebet_league_name || ""}
                          onChange={(e) => handleManualUpdate(item.id, e.target.value)}
                          className={`w-full bg-[#0b0f1a] border ${item.is_verified ? 'border-[#10b981]/30' : 'border-orange-500/30'} rounded-xl py-2 px-4 text-sm font-black uppercase italic appearance-none cursor-pointer outline-none focus:border-[#10b981] transition-all ${item.is_verified ? 'text-[#10b981]' : 'text-orange-400'}`}
                        >
                          {!item.linebet_league_name && <option value="">SELECT FROM HARVESTER POOL...</option>}
                          
                          {/* If current name isn't in pool, add it as first option */}
                          {item.linebet_league_name && !poolOptions.includes(item.linebet_league_name) && (
                            <option value={item.linebet_league_name}>{item.linebet_league_name} (CURRENT)</option>
                          )}

                          {poolOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Fingerprint size={10} className="text-slate-600" />
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">ID: {item.linebet_league_id}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.confidence_score >= 90 ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-orange-500/10 text-orange-500'}`}>
                          {item.confidence_score}% CONFIDENCE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                    <div className="flex flex-col items-end mr-2">
                      <span className="text-[9px] font-black text-slate-600 uppercase italic">Status</span>
                      <span className={`text-[10px] font-black uppercase ${item.is_verified ? 'text-[#10b981]' : 'text-orange-500'}`}>
                        {item.is_verified ? 'Verified Link' : 'Needs Selection'}
                      </span>
                    </div>

                    <button 
                      onClick={() => toggleVerification(item.id, item.is_verified)}
                      className={`shrink-0 h-14 w-14 flex items-center justify-center rounded-2xl transition-all ${
                        item.is_verified 
                        ? 'bg-[#10b981] text-[#0b0f1a] shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                        : 'bg-[#111926] text-slate-600 border border-white/10 hover:border-orange-500/50 hover:text-orange-500'
                      }`}
                    >
                      {item.is_verified ? (
                        <CheckCircle2 size={28} strokeWidth={3} />
                      ) : (
                        <AlertTriangle size={28} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Database, Search, AlertTriangle, CheckCircle2, ArrowRightLeft, Globe } from 'lucide-react';

export default function LeagueMappingPage() {
  const [mappings, setMappings] = useState([]);
  const [soccerLeagues, setSoccerLeagues] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get mappings using your correct schema columns
      const { data: mappingData } = await supabase
        .from('league_mappings')
        .select('*')
        .order('is_verified', { ascending: true })
        .order('created_at', { ascending: false });

      // 2. Get official reference list
      const { data: leagueData } = await supabase
        .from('soccer_leagues')
        .select('league_id, league_name')
        .order('league_name', { ascending: true });

      setMappings(mappingData || []);
      setSoccerLeagues(leagueData || []);
    } catch (err) {
      console.error("Lucra Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMap = async (id, chosenLeagueName) => {
    // We update official_league and set is_verified to true
    const { error } = await supabase
      .from('league_mappings')
      .update({ 
        official_league: chosenLeagueName, 
        is_verified: true 
      })
      .eq('id', id);

    if (!error) {
      setMappings(prev => prev.map(m => 
        m.id === id ? { ...m, official_league: chosenLeagueName, is_verified: true } : m
      ));
    }
  };

  const filteredMappings = mappings.filter(m => 
    m.scraped_league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.official_country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'operator']}>
      <AdminLayout>
        <div className="p-8 bg-[#0b0f1a] min-h-screen text-white space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database size={14} className="text-[#10b981]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Data Reconciliation Layer</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">League Bridge</h1>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="SEARCH SCRAPED OR COUNTRY..."
                className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#10b981] outline-none transition-all placeholder:opacity-30"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table View */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Syncing Lucra Schema...</div>
            ) : (
              filteredMappings.map((item) => (
                <div key={item.id} className={`bg-[#111926] border ${item.is_verified ? 'border-[#10b981]/20' : 'border-orange-500/20'} p-6 rounded-[2rem] flex flex-col lg:flex-row items-center justify-between gap-6 transition-all hover:bg-white/[0.01]`}>
                  
                  {/* Left: Scraped Info */}
                  <div className="flex flex-col lg:flex-row items-center gap-8 flex-1">
                    <div className="text-center lg:text-left min-w-[200px]">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block text-left">Scraped League</span>
                      <h3 className="text-lg font-black italic text-white tracking-tight uppercase leading-tight">{item.scraped_league}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Globe size={10} className="text-[#10b981]" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">{item.official_country || 'Global'}</span>
                      </div>
                    </div>

                    <ArrowRightLeft className="text-slate-800 hidden lg:block shrink-0" size={20} />

                    {/* Middle: Current Target */}
                    <div className="text-center lg:text-left min-w-[180px]">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">Mapping Target</span>
                      <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase ${item.is_verified ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                          {item.official_league || "PENDING_AUTO_MAP"}
                        </span>
                        {item.last_match_at && (
                          <span className="text-[8px] text-slate-600 font-bold mt-1">
                            LAST SEEN: {new Date(item.last_match_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Dropdown */}
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <select 
                      className="flex-1 lg:w-72 bg-[#0b0f1a] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase italic text-slate-300 focus:border-[#10b981] outline-none transition-all cursor-pointer"
                      onChange={(e) => handleManualMap(item.id, e.target.value)}
                      value={item.official_league || ""}
                    >
                      <option value="" disabled>SELECT OFFICIAL LEAGUE...</option>
                      {soccerLeagues.map(l => (
                        <option key={l.league_id} value={l.league_name}>
                          {l.league_name}
                        </option>
                      ))}
                    </select>

                    <div className="shrink-0">
                      {item.is_verified ? (
                        <div className="bg-[#10b981]/10 p-2 rounded-full">
                          <CheckCircle2 className="text-[#10b981]" size={24} />
                        </div>
                      ) : (
                        <div className="bg-orange-500/10 p-2 rounded-full animate-pulse">
                          <AlertTriangle className="text-orange-500" size={24} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

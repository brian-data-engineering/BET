import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Database, Search, AlertTriangle, CheckCircle2, ArrowRightLeft } from 'lucide-react';

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
      // 1. Get the scraped mappings that need reconciliation
      const { data: mappingData } = await supabase
        .from('league_mappings')
        .select('*')
        .order('is_verified', { ascending: true })
        .order('confidence_score', { ascending: true });

      // 2. Get the clean list from soccer_leagues
      const { data: leagueData } = await supabase
        .from('soccer_leagues')
        .select('league_id, league_name, country_name')
        .eq('is_active', true) // Only show active leagues in the dropdown
        .order('league_name', { ascending: true });

      setMappings(mappingData || []);
      setSoccerLeagues(leagueData || []);
    } catch (err) {
      console.error("Lucra Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMap = async (id, chosenLeagueId) => {
    // Update the mapping table: set api_slug to the league_id and verify it
    const { error } = await supabase
      .from('league_mappings')
      .update({ 
        api_slug: chosenLeagueId, 
        is_verified: true 
      })
      .eq('id', id);

    if (!error) {
      // Optimistic update to UI
      setMappings(prev => prev.map(m => 
        m.id === id ? { ...m, api_slug: chosenLeagueId, is_verified: true } : m
      ));
    }
  };

  const filteredMappings = mappings.filter(m => 
    m.betika_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">League Bridge</h1>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="SEARCH SCRAPED NAMES..."
                className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#10b981] outline-none transition-all placeholder:opacity-30"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Grid View */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Initializing Scraper Context...</div>
            ) : (
              filteredMappings.map((item) => (
                <div key={item.id} className={`bg-[#111926] border ${item.is_verified ? 'border-[#10b981]/20' : 'border-orange-500/20'} p-6 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-6 transition-all hover:bg-white/[0.01]`}>
                  
                  {/* Left: Scraped Info */}
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <div className="text-center lg:text-left">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">Scraped Source</span>
                      <h3 className="text-lg font-black italic text-white tracking-tight uppercase">{item.betika_name}</h3>
                      <div className="flex items-center justify-center lg:justify-start gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.confidence_score < 0.7 ? 'bg-orange-500 animate-pulse' : 'bg-[#10b981]'}`} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                          {(item.confidence_score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                    </div>

                    <ArrowRightLeft className="text-slate-800 hidden lg:block" size={24} />

                    {/* Middle: Current Target */}
                    <div className="text-center lg:text-left">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">Target Slug</span>
                      <code className="bg-black/40 px-3 py-1 rounded-lg text-[#f59e0b] font-mono text-xs border border-white/5">
                        {item.api_slug || "NULL_POINTER"}
                      </code>
                    </div>
                  </div>

                  {/* Right: Action Dropdown */}
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <select 
                      className="flex-1 lg:w-72 bg-[#0b0f1a] border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-bold uppercase italic text-slate-300 focus:border-[#10b981] outline-none transition-all cursor-pointer"
                      onChange={(e) => handleManualMap(item.id, e.target.value)}
                      value={item.api_slug || ""}
                    >
                      <option value="" disabled>MAP TO SOCCER_LEAGUE...</option>
                      {soccerLeagues.map(l => (
                        <option key={l.league_id} value={l.league_id}>
                          {l.country_name ? `${l.country_name}: ` : ''}{l.league_name}
                        </option>
                      ))}
                    </select>

                    <div className="shrink-0">
                      {item.is_verified ? (
                        <CheckCircle2 className="text-[#10b981]" size={28} />
                      ) : (
                        <AlertTriangle className="text-orange-500" size={28} />
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

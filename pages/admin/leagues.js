import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { 
  Database, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft 
} from 'lucide-react';

export default function LeagueMappingPage() {
  const [mappings, setMappings] = useState([]);
  const [standardLeagues, setStandardLeagues] = useState([]); // To fetch from your 'leagues' table
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending mappings
      const { data: mappingData } = await supabase
        .from('league_mappings')
        .select('*')
        .order('confidence_score', { ascending: true });

      // 2. Fetch standard league list for the dropdown
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('standard_name, id')
        .order('standard_name', { ascending: true });

      setMappings(mappingData || []);
      setStandardLeagues(leagueData || []);
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMap = async (id, slug) => {
    const { error } = await supabase
      .from('league_mappings')
      .update({ 
        api_slug: slug, 
        is_verified: true 
      })
      .eq('id', id);

    if (!error) fetchData(); // Refresh list
  };

  const filteredMappings = mappings.filter(m => 
    m.betika_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'operator']}>
      <AdminLayout>
        <div className="p-8 bg-[#0b0f1a] min-h-screen text-white space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database size={14} className="text-[#10b981]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Data Reconciliation Layer</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">League Mappings</h1>
            </div>

            <div className="relative group w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="SEARCH SCRAPED NAMES..."
                className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#10b981] outline-none transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Syncing Neural Link...</div>
            ) : (
              filteredMappings.map((item) => (
                <div key={item.id} className={`bg-[#111926] border ${item.is_verified ? 'border-[#10b981]/20' : 'border-orange-500/20'} p-6 rounded-[2rem] flex flex-col lg:flex-row items-center justify-between gap-6 hover:bg-white/[0.01] transition-all`}>
                  
                  <div className="flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Scraped Source</span>
                      <h3 className="text-lg font-black italic text-white tracking-tight uppercase">{item.betika_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.confidence_score < 0.7 ? 'bg-orange-500 animate-pulse' : 'bg-[#10b981]'}`} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                          Confidence: {(item.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <ArrowRightLeft className="text-slate-700 hidden lg:block" size={20} />

                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Current Mapping</span>
                      <code className="bg-[#0b0f1a] px-3 py-1 rounded-lg text-[#f59e0b] font-bold text-xs">
                        {item.api_slug || "NULL_TARGET"}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <select 
                      className="flex-1 lg:w-64 bg-[#0b0f1a] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold uppercase italic text-slate-300 focus:border-[#10b981] outline-none"
                      onChange={(e) => handleManualMap(item.id, e.target.value)}
                      defaultValue={item.api_slug || ""}
                    >
                      <option value="" disabled>Manual Override...</option>
                      {standardLeagues.map(l => (
                        <option key={l.id} value={l.standard_name}>{l.standard_name}</option>
                      ))}
                    </select>

                    {item.is_verified ? (
                      <CheckCircle2 className="text-[#10b981]" size={24} />
                    ) : (
                      <AlertTriangle className="text-orange-500" size={24} />
                    )}
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

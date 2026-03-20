import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Search, FileText, ChevronRight, Hash, Calendar } from 'lucide-react';

export default function AdminReports() {
  const [bets, setBets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBets();
  }, []);

  const fetchBets = async () => {
    const { data } = await supabase
      .from('booked_bets')
      .select('*')
      .order('created_at', { ascending: false });
    setBets(data || []);
    setLoading(false);
  };

  // Filter bets based on search code
  const filteredBets = bets.filter(bet => 
    bet.booking_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">
        {/* Header & Stats Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
              <FileText className="text-lucra-green" size={32} />
              Betting Ledger
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Audit trail for all booked tickets</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-900 border border-gray-800 p-4 rounded-2xl min-w-[140px]">
              <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Total Tickets</p>
              <p className="text-xl font-black text-white">{bets.length}</p>
            </div>
            <div className="bg-slate-900 border border-gray-800 p-4 rounded-2xl min-w-[140px]">
              <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Avg. Selection Count</p>
              <p className="text-xl font-black text-lucra-green">
                {(bets.reduce((acc, b) => acc + b.items.length, 0) / (bets.length || 1)).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-lucra-green transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="SEARCH BY BOOKING CODE (e.g. XZ78Q9)"
            className="w-full bg-slate-900 border border-gray-800 p-5 pl-12 rounded-2xl text-sm font-bold tracking-widest outline-none focus:border-lucra-green transition-all uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Bets List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-gray-600 font-black uppercase text-xs tracking-[0.3em]">
              Syncing Ledger...
            </div>
          ) : filteredBets.length > 0 ? (
            filteredBets.map(bet => (
              <div key={bet.id} className="bg-slate-900 border border-gray-800 rounded-3xl overflow-hidden hover:border-gray-600 transition-all group">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Code and Time */}
                  <div className="flex items-center gap-6">
                    <div className="bg-black px-5 py-3 rounded-xl border border-gray-800 group-hover:border-lucra-green/30 transition-all">
                      <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-tighter">Code</p>
                      <p className="text-2xl font-black text-lucra-green tracking-[0.2em]">{bet.booking_code}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Calendar size={12} />
                        <p className="text-[10px] font-bold uppercase">{new Date(bet.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Hash size={12} />
                        <p className="text-[10px] font-bold">{new Date(bet.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Odds and Action */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest">Parlay Stats</p>
                      <div className="flex items-center gap-3">
                        <span className="bg-gray-800 text-gray-300 text-[10px] font-black px-2 py-0.5 rounded italic">
                          {bet.items.length} SELECTIONS
                        </span>
                        <span className="text-xl font-black text-white tabular-nums">
                          @{parseFloat(bet.total_odds).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-700 group-hover:text-lucra-green transition-colors" />
                  </div>
                </div>

                {/* Optional: Detail expansion or hover preview can go here */}
              </div>
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-gray-900 rounded-3xl">
              <p className="text-gray-700 font-black uppercase text-xs tracking-[0.2em]">No records found for "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

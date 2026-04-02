import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Search, 
  Download,
  Calendar,
  Layers,
  RefreshCcw
} from 'lucide-react';

export default function OperatorReports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, netFlow: 0 });
  const [filter, setFilter] = useState('all'); // all, credit, debit

  const fetchLedgerTrail = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Fetch all ledger rows for this specific user
      // We join profiles to see WHO the 'reference_id' involves for transfers
      const { data: ledgerData, error } = await supabase
        .from('ledger')
        .select(`
          *,
          related_party:profiles!ledger_user_id_fkey(username, role)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error("Ledger Fetch Error:", error);

      let incoming = 0;
      let outgoing = 0;

      const formattedLogs = ledgerData?.map(entry => {
        const amount = Number(entry.amount);
        if (entry.type === 'credit') incoming += amount;
        else outgoing += amount;

        return { ...entry, amount };
      }) || [];

      setLogs(formattedLogs);
      setStats({
        totalIn: incoming,
        totalOut: outgoing,
        netFlow: incoming - outgoing
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLedgerTrail();
  }, [fetchLedgerTrail]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'credit') return log.type === 'credit';
    if (filter === 'debit') return log.type === 'debit';
    return true;
  });

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header & Meta */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <FileText className="text-blue-500" size={32} />
              Audit <span className="text-slate-700">Ledger</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Computed Transaction Integrity</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={fetchLedgerTrail} className="bg-[#111926] border border-white/5 p-3 rounded-xl hover:bg-white/5 transition-all">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => window.print()} className="bg-[#111926] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Trail Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            label="Total Credits" 
            amount={stats.totalIn} 
            icon={<ArrowUpRight className="text-emerald-500" />} 
            trend="Inward Liquidity"
            color="text-emerald-500"
          />
          <ReportCard 
            label="Total Debits" 
            amount={stats.totalOut} 
            icon={<ArrowDownLeft className="text-rose-500" />} 
            trend="Outward Dispatch"
            color="text-rose-500"
          />
          <ReportCard 
            label="Verified Net" 
            amount={stats.netFlow} 
            icon={<Layers className="text-blue-500" />} 
            trend="Current Hub Capacity"
            color="text-blue-500"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between bg-[#111926] p-4 rounded-2xl border border-white/5">
          <div className="flex gap-2">
            {['all', 'credit', 'debit'].map((t) => (
              <button 
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all ${filter === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                {t === 'all' ? 'Full History' : t === 'credit' ? 'Inflow Only' : 'Outflow Only'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-slate-600 px-4 border-l border-white/5">
             <Calendar size={14} />
             <span className="text-[9px] font-black uppercase italic">System Time: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* The Ledger Table */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
              <tr>
                <th className="p-8">Timeline</th>
                <th className="p-8">Source</th>
                <th className="p-8">Type</th>
                <th className="p-8 text-right">Magnitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="4" className="p-20 text-center"><BarChart3 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.01] transition-all group">
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white italic">{new Date(entry.created_at).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{new Date(entry.created_at).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase italic">{entry.source}</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">REF: {entry.reference_id?.slice(0,8) || 'SYSTEM'}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`text-[9px] font-black uppercase italic px-4 py-2 rounded-full border ${entry.type === 'credit' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' : 'text-rose-500 bg-rose-500/5 border-rose-500/10'}`}>
                      {entry.type === 'credit' ? 'Asset Injection' : 'Asset Extraction'}
                    </span>
                  </td>
                  <td className={`p-8 text-right font-black italic text-lg ${entry.type === 'credit' ? 'text-emerald-500' : 'text-white'}`}>
                    {entry.type === 'credit' ? '+' : '-'} {entry.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && !loading && (
            <div className="p-20 text-center space-y-4">
               <Search size={40} className="mx-auto text-slate-800" />
               <p className="text-slate-600 italic text-[10px] uppercase font-black tracking-widest">No ledger entries detected</p>
            </div>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
}

function ReportCard({ label, amount, icon, trend, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-xl">
       <div className="relative z-10 space-y-4">
         <div className="flex justify-between items-start">
           <div className="p-3 bg-[#0b0f1a] rounded-xl border border-white/5">
             {icon}
           </div>
           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{trend}</span>
         </div>
         <div>
           <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest mb-1">{label}</p>
           <h3 className={`text-3xl font-black italic tracking-tighter ${color}`}>
             KES {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </h3>
         </div>
       </div>
    </div>
  );
}

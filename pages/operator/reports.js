import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Search, 
  Filter,
  Download,
  Calendar,
  Layers
} from 'lucide-react';

export default function OperatorReports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, netFlow: 0 });
  const [filter, setFilter] = useState('all'); // all, inflow, outflow

  const fetchMoneyTrail = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Fetch all transactions where the operator is either the SENDER or RECEIVER
      const { data: txData, error } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!transactions_sender_id_fkey(username, role),
          receiver:profiles!transactions_receiver_id_fkey(username, role)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) console.error(error);

      // Calculate the trail metrics
      let incoming = 0;
      let outgoing = 0;

      const formattedLogs = txData?.map(tx => {
        const isIncoming = tx.receiver_id === user.id;
        if (isIncoming) incoming += tx.amount;
        else outgoing += tx.amount;

        return { ...tx, isIncoming };
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
    fetchMoneyTrail();
  }, [fetchMoneyTrail]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'inflow') return log.isIncoming;
    if (filter === 'outflow') return !log.isIncoming;
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
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Comprehensive Asset Traceability</p>
          </div>
          
          <button onClick={() => window.print()} className="bg-[#111926] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2">
            <Download size={14} /> Export Report
          </button>
        </div>

        {/* Trail Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            label="Inflow (Admin Funding)" 
            amount={stats.totalIn} 
            icon={<ArrowUpRight className="text-emerald-500" />} 
            trend="Incoming Liquidity"
            color="text-emerald-500"
          />
          <ReportCard 
            label="Outflow (Terminal Dispatch)" 
            amount={stats.totalOut} 
            icon={<ArrowDownLeft className="text-rose-500" />} 
            trend="Distributed Assets"
            color="text-rose-500"
          />
          <ReportCard 
            label="Net Retained Float" 
            amount={stats.netFlow} 
            icon={<Layers className="text-blue-500" />} 
            trend="Current Hub Capacity"
            color="text-blue-500"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between bg-[#111926] p-4 rounded-2xl border border-white/5">
          <div className="flex gap-2">
            {['all', 'inflow', 'outflow'].map((t) => (
              <button 
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all ${filter === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-slate-600 px-4 border-l border-white/5">
             <Calendar size={14} />
             <span className="text-[9px] font-black uppercase italic">Live Data Feed</span>
          </div>
        </div>

        {/* The Money Trail Table */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
              <tr>
                <th className="p-8">Timestamp</th>
                <th className="p-8">Movement Type</th>
                <th className="p-8">Origin / Destination</th>
                <th className="p-8 text-right">Value (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : filteredLogs.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-all group">
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white italic">{new Date(tx.created_at).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{new Date(tx.created_at).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`text-[9px] font-black uppercase italic px-4 py-2 rounded-full border ${tx.isIncoming ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' : 'text-rose-500 bg-rose-500/5 border-rose-500/10'}`}>
                      {tx.isIncoming ? 'Liquidity Injection' : 'Terminal Dispatch'}
                    </span>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0b0f1a] flex items-center justify-center border border-white/5 text-slate-500">
                         {tx.isIncoming ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase italic text-white">
                          {tx.isIncoming ? `From: ${tx.sender?.username}` : `To: ${tx.receiver?.username}`}
                        </p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase italic">{tx.isIncoming ? tx.sender?.role : tx.receiver?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`p-8 text-right font-black italic text-lg ${tx.isIncoming ? 'text-emerald-500' : 'text-white'}`}>
                    {tx.isIncoming ? '+' : '-'} {tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && !loading && (
            <div className="p-20 text-center space-y-4">
               <Search size={40} className="mx-auto text-slate-800" />
               <p className="text-slate-600 italic text-[10px] uppercase font-black tracking-widest">No transaction trail detected</p>
            </div>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
}

function ReportCard({ label, amount, icon, trend, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-xl group">
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

function Loader2(props) {
  return <BarChart3 {...props} />; // Using BarChart as a themed loader
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Calendar,
  Filter,
  Download,
  FileText
} from 'lucide-react';

export default function AdminReports() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalVolume: 0, deposits: 0, transfers: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTransactions(data || []);
      
      // Calculate Stats
      const vol = data.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      const dep = data.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      const trans = data.filter(t => t.type === 'transfer').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      
      setStats({ totalVolume: vol, deposits: dep, transfers: trans });
    } catch (err) {
      console.error("Report Generation Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Financial Intelligence</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Network Reports</h1>
          </div>
          
          <div className="flex gap-4">
            <select 
              className="bg-[#111926] border border-white/5 p-4 rounded-2xl text-[10px] font-black uppercase italic outline-none focus:border-[#10b981]"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Channels</option>
              <option value="transfer">Transfers Only</option>
              <option value="deposit">Deposits Only</option>
            </select>
            <button className="bg-white text-black p-4 rounded-2xl flex items-center gap-2 hover:bg-[#10b981] transition-all">
              <Download size={16} />
              <span className="text-[10px] font-black uppercase italic">Export CSV</span>
            </button>
          </div>
        </div>

        {/* ANALYTICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Gross Network Volume</span>
              <Wallet size={16} className="text-[#10b981]" />
            </div>
            <p className="text-3xl font-black italic tracking-tighter">KES {stats.totalVolume.toLocaleString()}</p>
          </div>

          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Internal Transfers</span>
              <ArrowUpRight size={16} className="text-blue-400" />
            </div>
            <p className="text-3xl font-black italic tracking-tighter">KES {stats.transfers.toLocaleString()}</p>
          </div>

          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">External Deposits</span>
              <ArrowDownLeft size={16} className="text-[#10b981]" />
            </div>
            <p className="text-3xl font-black italic tracking-tighter">KES {stats.deposits.toLocaleString()}</p>
          </div>
        </div>

        {/* MASTER LEDGER TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
            <FileText size={18} className="text-[#10b981]" />
            <h2 className="text-xs font-black uppercase italic tracking-widest">Master Transaction Ledger</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
                <tr>
                  <th className="p-8 text-center">Protocol</th>
                  <th className="p-8">Origin (Sender)</th>
                  <th className="p-8">Target (Receiver)</th>
                  <th className="p-8">Timestamp</th>
                  <th className="p-8 text-right">Value (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-8 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase italic tracking-widest border ${
                        tx.type === 'transfer' ? 'border-blue-500/20 text-blue-400 bg-blue-500/5' : 'border-[#10b981]/20 text-[#10b981] bg-[#10b981]/5'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-8">
                      <span className="text-sm font-bold uppercase tracking-tighter text-slate-400">
                        {tx.sender_username || 'SYSTEM_RESERVE'}
                      </span>
                    </td>
                    <td className="p-8">
                      <span className="text-sm font-black uppercase italic tracking-tighter text-white">
                        {tx.receiver_username}
                      </span>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-8 text-right font-black italic text-lg text-[#10b981]">
                      {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {transactions.length === 0 && (
              <div className="p-32 text-center opacity-20">
                <Filter size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase italic tracking-widest">No matching ledger entries found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { TrendingUp, TrendingDown, Wallet, Calendar, RefreshCcw, BarChart3, ShieldCheck } from 'lucide-react';

export default function CashierReport() {
  const [stats, setStats] = useState({ sales: 0, payouts: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTodayStats = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FETCH DIRECTLY FROM THE LEDGER
      const { data: ledgerRows, error } = await supabase
        .from('ledger')
        .select('amount, type, source')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const summary = ledgerRows.reduce((acc, row) => {
        const val = parseFloat(row.amount);
        if (row.source === 'bet_placed') {
          acc.sales += val;
          acc.count += 1;
        } else if (row.source === 'bet_won') {
          acc.payouts += val;
        }
        return acc;
      }, { sales: 0, payouts: 0, count: 0 });

      setStats(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodayStats(); }, [fetchTodayStats]);

  const netBalance = stats.sales - stats.payouts;

  return (
    <CashierLayout>
      <div className="p-8 max-w-5xl mx-auto bg-[#0b0f1a] min-h-screen text-white">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-2 text-[#10b981] mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Financial Integrity Audit</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">Shift Audit</h1>
          </div>
          <button onClick={fetchTodayStats} className="p-5 bg-[#111926] rounded-3xl border border-white/5">
            <RefreshCcw size={22} className={`${loading ? 'animate-spin' : ''} text-[#10b981]`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard icon={<TrendingUp size={24} className="text-[#10b981]" />} label="Total Sales (In)" value={stats.sales} trend="Digital Collection" />
          <StatCard icon={<TrendingDown size={24} className="text-red-500" />} label="Total Payouts (Out)" value={stats.payouts} trend="Digital Reimbursement" />
          <StatCard icon={<Wallet size={24} className="text-blue-500" />} label="Expected Cash" value={netBalance} isHighlight color={netBalance >= 0 ? "text-[#10b981]" : "text-red-500"} />
        </div>

        <div className="bg-[#111926] border border-white/5 rounded-[3.5rem] p-12">
           <div className="space-y-8">
              <ReportLine label="Tickets Processed" value={stats.count} />
              <ReportLine label="Net Sales" value={`KES ${stats.sales.toLocaleString()}`} />
              <div className="pt-10 border-t border-white/5 flex justify-between items-end">
                <span className="text-4xl font-black italic text-[#10b981]">
                  TOTAL: KES {netBalance.toLocaleString()}
                </span>
              </div>
           </div>
        </div>
      </div>
    </CashierLayout>
  );
}

// Helpers
function StatCard({ icon, label, value, color, isHighlight, trend }) {
  return (
    <div className={`bg-[#111926] p-8 rounded-[2.5rem] border ${isHighlight ? 'border-blue-500/20' : 'border-white/5'}`}>
      <div className="flex justify-between mb-6"><div className="p-3 bg-[#0b0f1a] rounded-2xl">{icon}</div><span className="text-[8px] font-black opacity-40 uppercase">{trend}</span></div>
      <p className="text-[9px] font-black opacity-50 uppercase mb-1">{label}</p>
      <h3 className={`text-3xl font-black italic ${color || 'text-white'}`}>KES {value.toLocaleString()}</h3>
    </div>
  );
}

function ReportLine({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-4">
      <span className="text-xs font-black opacity-50 uppercase">{label}</span>
      <span className="text-lg font-black italic">{value}</span>
    </div>
  );
}

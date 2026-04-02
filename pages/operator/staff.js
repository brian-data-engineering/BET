import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, PlusCircle, Ticket, Loader2, Send, RefreshCw } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchStaffWithStats = useCallback(async (id) => {
    if (!id) return;
    setFetching(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').eq('parent_id', id).eq('role', 'cashier').order('username', { ascending: true });
      if (!profiles) return;

      const staffWithCounts = await Promise.all(profiles.map(async (cashier) => {
        const [resNow, resSettled] = await Promise.all([
          supabase.from('betsnow').select('id', { count: 'exact', head: true }).eq('cashier_id', cashier.id),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('cashier_id', cashier.id)
        ]);
        return { ...cashier, ticketCount: (resNow.count || 0) + (resSettled.count || 0) };
      }));
      setStaff(staffWithCounts);
    } finally { setFetching(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchStaffWithStats(user.id);
        supabase.channel('staff-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStaffWithStats(user.id)).subscribe();
      }
    };
    init();
  }, [fetchStaffWithStats]);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc('admin_create_cashier', { target_email: form.email, target_password: form.password, target_username: form.username, op_id: operatorId });
    if (error) alert("Deployment Error: " + error.message);
    else { setForm({ email: '', password: '', username: '' }); fetchStaffWithStats(operatorId); }
    setLoading(false);
  };

  const quickFund = async (cashierId, cashierName) => {
    const amount = prompt(`Liquidity amount for ${cashierName.toUpperCase()}:`);
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;

    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: operatorId,              // Match your SQL
      receiver_id: cashierId,             // Match your SQL
      amount_to_transfer: parseFloat(amount) // Match your SQL
    });

    if (error) alert("Transfer Failed: " + error.message);
    else await fetchStaffWithStats(operatorId);
  };

  return (
    <OperatorLayout>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic tracking-widest">
              <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} /> Infrastructure Management
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Network Nodes</h1>
          </div>
          <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic block mb-1">Combined Terminal Liquidity</span>
            <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
              KES {staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
             <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 sticky top-8 shadow-2xl">
                <h2 className="font-black uppercase text-xs italic tracking-widest flex items-center gap-3"><PlusCircle size={18} className="text-blue-500" /> Deploy Node</h2>
                <form onSubmit={handleCreateCashier} className="space-y-5">
                  <input value={form.username} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" placeholder="USERNAME" onChange={e => setForm({...form, username: e.target.value})} required />
                  <input value={form.email} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" placeholder="EMAIL" onChange={e => setForm({...form, email: e.target.value})} required />
                  <input value={form.password} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" type="password" placeholder="PASSWORD" onChange={e => setForm({...form, password: e.target.value})} required />
                  <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-white hover:text-black transition-all italic text-xs uppercase tracking-widest">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Initialize Terminal"}
                  </button>
                </form>
             </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
                  <tr>
                    <th className="p-10">Identity</th>
                    <th className="p-10 text-center">Tickets</th>
                    <th className="p-10 text-center">Balance</th>
                    <th className="p-10 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staff.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-all">
                      <td className="p-10">
                        <div className="flex items-center gap-5">
                          <Monitor size={20} className="text-slate-600" />
                          <div>
                            <p className="font-black uppercase italic text-xl tracking-tighter text-white">{s.username}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase italic">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-10 text-center font-black text-[#10b981] italic">{s.ticketCount}</td>
                      <td className="p-10 text-center font-black text-[#10b981] italic">KES {parseFloat(s.balance || 0).toLocaleString()}</td>
                      <td className="p-10 text-right">
                         <button onClick={() => quickFund(s.id, s.username)} className="bg-white/5 p-4 px-6 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all flex items-center gap-2 ml-auto">
                           <Send size={14} /> <span className="text-[10px] font-black uppercase italic">Fund</span>
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}

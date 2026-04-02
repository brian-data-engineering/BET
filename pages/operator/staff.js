import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, PlusCircle, Loader2, Send, RefreshCw } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchStaffWithStats = useCallback(async (id) => {
    if (!id) return;
    setFetching(true);
    const { data: profiles } = await supabase.from('profiles').select('*').eq('parent_id', id).eq('role', 'cashier').order('username', { ascending: true });
    
    if (profiles) {
      const enriched = await Promise.all(profiles.map(async (c) => {
        const [n, s] = await Promise.all([
          supabase.from('betsnow').select('id', { count: 'exact', head: true }).eq('cashier_id', c.id),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('cashier_id', c.id)
        ]);
        return { ...c, ticketCount: (n.count || 0) + (s.count || 0) };
      }));
      setStaff(enriched);
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchStaffWithStats(user.id);
      }
    };
    init();
  }, [fetchStaffWithStats]);

  const quickFund = async (id, name) => {
    const val = prompt(`Send Float to ${name.toUpperCase()}:`);
    if (!val || isNaN(val) || parseFloat(val) <= 0) return;

    const cleanAmount = Math.floor(parseFloat(val));

    const { error } = await supabase.rpc('transfer_credits', {
      p_sender_id: operatorId,
      p_receiver_id: id,
      p_amount: cleanAmount
    });

    if (error) alert("Transfer Protocol Failed: " + error.message);
    else {
      setTimeout(() => fetchStaffWithStats(operatorId), 400);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc('admin_create_cashier', { 
      target_email: form.email, 
      target_password: form.password, 
      target_username: form.username, 
      op_id: operatorId 
    });
    if (error) alert("Deployment Error: " + error.message);
    else { setForm({ email: '', password: '', username: '' }); fetchStaffWithStats(operatorId); }
    setLoading(false);
  };

  return (
    <OperatorLayout>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic tracking-widest mb-1">
              <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} /> Network Control
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Nodes</h1>
          </div>
          <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic block mb-1">Total Terminal Liquidity</span>
            <span className="text-3xl font-black text-[#10b981] italic">
              KES {Math.floor(staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0)).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 bg-[#111926] p-10 rounded-[3rem] border border-white/5 h-fit sticky top-8 shadow-2xl">
            <h2 className="text-xs font-black uppercase italic mb-8">Deploy New Node</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <input value={form.username} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" placeholder="USERNAME" onChange={e => setForm({...form, username: e.target.value})} required />
              <input value={form.email} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" placeholder="EMAIL" onChange={e => setForm({...form, email: e.target.value})} required />
              <input value={form.password} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500" type="password" placeholder="PASSWORD" onChange={e => setForm({...form, password: e.target.value})} required />
              <button disabled={loading} className="w-full bg-blue-600 py-6 rounded-2xl font-black text-xs uppercase italic tracking-widest hover:bg-white hover:text-black transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Node"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-black/20 text-[9px] font-black uppercase text-slate-600 italic tracking-widest">
                <tr>
                  <th className="p-10">Identity</th>
                  <th className="p-10 text-center">Activity</th>
                  <th className="p-10 text-center">Float</th>
                  <th className="p-10 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-all">
                    <td className="p-10">
                      <div className="flex items-center gap-5">
                        <Monitor size={20} className="text-slate-500" />
                        <div>
                          <p className="font-black uppercase italic text-xl tracking-tighter text-white">{s.username}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase italic">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-10 text-center font-black italic text-[#10b981]">{s.ticketCount}</td>
                    <td className="p-10 text-center font-black italic text-[#10b981]">KES {Math.floor(s.balance || 0).toLocaleString()}</td>
                    <td className="p-10 text-right">
                      <button onClick={() => quickFund(s.id, s.username)} className="bg-white/5 p-4 px-6 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all flex items-center gap-2 ml-auto text-[10px] font-black uppercase italic">
                        <Send size={14} /> Fund
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}

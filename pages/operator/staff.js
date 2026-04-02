import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, RefreshCw } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 1. FRESH DATA FETCH
  const fetchData = useCallback(async (id) => {
    if (!id) return;
    setFetching(true);
    
    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profiles').select('*').eq('parent_id', id).eq('role', 'cashier').order('username', { ascending: true })
    ]);

    if (pRes.data) setOperatorProfile(pRes.data);
    
    if (cRes.data) {
      const enriched = await Promise.all(cRes.data.map(async (c) => {
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

  // 2. INITIALIZE & REALTIME (The Fix is here)
  useEffect(() => {
    let channel;
    
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchData(user.id);

        // CORRECT REALTIME ORDER: .on() then .subscribe()
        channel = supabase
          .channel(`sync-${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            filter: `parent_id=eq.${user.id}` 
          }, () => fetchData(user.id))
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, () => fetchData(user.id))
          .subscribe();
      }
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchData]);

  // 3. TRANSFER LOGIC
  const handleQuickFund = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Send Whole Number Amount to ${name.toUpperCase()}:`);
    if (!val) return; 

    const cleanAmount = Math.trunc(Number(val));
    if (!cleanAmount || cleanAmount <= 0) return;

    setProcessingId(id); 
    try {
      const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: operatorId,
        p_receiver_id: id,
        p_amount: cleanAmount
      });
      if (error) alert(error.message);
      // fetchData is called automatically by Realtime sync above
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null); 
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
    if (error) alert(error.message);
    else { 
      setForm({ email: '', password: '', username: '' }); 
      fetchData(operatorId);
    }
    setLoading(false);
  };

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1">
              <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} /> System Sync
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Nodes</h1>
          </div>
          <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Network Float</span>
            <span className="text-3xl font-black text-[#10b981] italic">
              KES {Math.floor(staff.reduce((acc, s) => acc + Number(s.balance || 0), 0)).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* DEPLOY FORM */}
          <div className="lg:col-span-4 bg-[#111926] p-10 rounded-[3rem] border border-white/5 h-fit shadow-2xl">
            <h2 className="text-xs font-black uppercase italic mb-8">Deploy Node</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <input value={form.username} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none" placeholder="USERNAME" onChange={e => setForm({...form, username: e.target.value})} required />
              <input value={form.email} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none" placeholder="EMAIL" onChange={e => setForm({...form, email: e.target.value})} required />
              <input value={form.password} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none" type="password" placeholder="PASSWORD" onChange={e => setForm({...form, password: e.target.value})} required />
              <button disabled={loading} className="w-full bg-blue-600 py-6 rounded-2xl font-black text-xs uppercase italic tracking-widest hover:bg-white hover:text-black transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Node"}
              </button>
            </form>
          </div>

          {/* STAFF TABLE (Now inside the same file) */}
          <div className="lg:col-span-8 bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-black/20 text-[9px] font-black uppercase text-slate-600 italic tracking-widest">
                <tr>
                  <th className="p-10">ID</th>
                  <th className="p-10 text-center">Bets</th>
                  <th className="p-10 text-center">Float</th>
                  <th className="p-10 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-10 font-bold uppercase italic">{s.username}</td>
                    <td className="p-10 text-center font-black italic text-[#10b981]">{s.ticketCount}</td>
                    <td className="p-10 text-center font-black italic text-[#10b981]">KES {Math.floor(s.balance || 0).toLocaleString()}</td>
                    <td className="p-10 text-right">
                      <button 
                        disabled={processingId !== null}
                        onClick={() => handleQuickFund(s.id, s.username)}
                        className="bg-white/5 p-4 px-6 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all text-[10px] font-black uppercase italic"
                      >
                        {processingId === s.id ? <Loader2 className="animate-spin" /> : <Send size={14} />}
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

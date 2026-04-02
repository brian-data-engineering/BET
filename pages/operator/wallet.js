import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, RefreshCw } from 'lucide-react';
import StaffList from './staff'; 

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null); // Added this
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = useCallback(async (id) => {
    if (!id) return;
    setFetching(true);
    
    // 1. Fetch Operator's own balance for the Layout/Wallet
    const { data: opData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (opData) setOperatorProfile(opData);

    // 2. Fetch Staff
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', id)
      .eq('role', 'cashier')
      .order('username', { ascending: true });
    
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
        fetchData(user.id); 
      }
    };
    init();
  }, [fetchData]);

  const handleQuickFund = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Send Whole Number Amount to ${name.toUpperCase()}:`);
    if (val === null) return; 

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
      else await fetchData(operatorId);
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
      await fetchData(operatorId); 
    }
    setLoading(false);
  };

  return (
    <OperatorLayout profile={operatorProfile}> 
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
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
          <div className="lg:col-span-4 bg-[#111926] p-10 rounded-[3rem] border border-white/5 h-fit shadow-2xl">
            <h2 className="text-xs font-black uppercase italic mb-8">Deploy Node</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <input value={form.username} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white" placeholder="USERNAME" onChange={e => setForm({...form, username: e.target.value})} required />
              <input value={form.email} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white" placeholder="EMAIL" onChange={e => setForm({...form, email: e.target.value})} required />
              <input value={form.password} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white" type="password" placeholder="PASSWORD" onChange={e => setForm({...form, password: e.target.value})} required />
              <button disabled={loading} className="w-full bg-blue-600 py-6 rounded-2xl font-black text-xs uppercase italic tracking-widest hover:bg-white hover:text-black transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Node"}
              </button>
            </form>
          </div>

          <StaffList 
            staff={staff} 
            onSelectStaff={handleQuickFund} 
            processingId={processingId} 
          />
        </div>
      </div>
    </OperatorLayout>
  );
}

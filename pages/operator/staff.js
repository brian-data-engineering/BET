import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, Database, UserPlus, X, ShieldCheck } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // --- FORM STATE ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      setOperatorProfile(profile);
      
      const { data: cashiers } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'cashier')
        .order('username', { ascending: true });

      if (cashiers) setStaff(cashiers);
    }
    setFetching(false);
  }, []);

  useEffect(() => { 
    fetchData();
    const channel = supabase
      .channel('staff-mgmt-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    // GHOST LOGIC: Auto-generate the internal email address
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

    try {
      // Calling your new dedicated API Route
      const response = await fetch('/api/admin/create-cashier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          operatorId: operatorProfile.id // Bridges the hierarchy
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize terminal node');
      }

      alert(`NODE INITIALIZED: Cashier ${form.username} is now active.`);
      setForm({ username: '', password: '' });
      setShowAddForm(false);
      fetchData(); // Refresh the list

    } catch (error) {
      alert(`PROVISIONING ERROR: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDispatch = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Enter KES amount to dispatch to ${name.toUpperCase()}:`);
    if (!val) return;
    const amount = Math.trunc(Number(val));
    if (!amount || amount <= 0) return;

    setProcessingId(id);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: id,
        p_amount: amount
      });
      if (error) alert(`Dispatch Rejection: ${error.message}`);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Database size={12} /> Network Integrity
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Nodes</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={`${showAddForm ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2 border`}
            >
              {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
              {showAddForm ? 'Cancel' : 'Register Cashier'}
            </button>

            <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Active Network Float</span>
              <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
                KES {parseFloat(staff.reduce((acc, s) => acc + (s.balance || 0), 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ADD CASHIER FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateCashier} className="bg-[#111926] p-8 rounded-[2.5rem] border border-blue-500/20 flex flex-wrap gap-4 items-end animate-in fade-in zoom-in duration-200">
            <div className="flex-[2] min-w-[240px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Operator Identity (Username)</label>
              <div className="relative">
                <input 
                  required 
                  placeholder="e.g. cashier_01"
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Access Key (Password)</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
            </div>

            <button disabled={creating} className="bg-[#10b981] text-black h-[54px] px-10 rounded-2xl font-black uppercase italic text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {creating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {creating ? 'Initalizing...' : 'Activate Node'}
            </button>
          </form>
        )}

        {/* DATA TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-[9px] font-black uppercase text-slate-600 italic tracking-widest">
              <tr>
                <th className="p-10">Node ID</th>
                <th className="p-10 text-center">Current Liquidity</th>
                <th className="p-10 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff.length === 0 ? (
                <tr><td colSpan="3" className="p-20 text-center text-slate-500 italic uppercase font-black text-xs">No active terminal nodes found</td></tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-10">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Monitor size={20} /></div>
                        <div>
                          <span className="font-black uppercase italic text-xl tracking-tight block">{s.username}</span>
                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">ID: {s.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-10 text-center font-black italic text-[#10b981] text-2xl">
                      KES {parseFloat(s.balance || 0).toLocaleString()}
                    </td>
                    <td className="p-10 text-right">
                      <button 
                        onClick={() => handleDispatch(s.id, s.username)}
                        disabled={processingId !== null}
                        className="bg-white/5 p-5 px-8 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all text-xs font-black uppercase italic group"
                      >
                        {processingId === s.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <div className="flex items-center gap-2">
                            DISPATCH <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </OperatorLayout>
  );
}

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
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get current Operator's full profile (including their tenant_id and logo)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);
      
      // 2. Fetch only AGENTS that belong to this Operator
      const { data: agents } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'agent') // Filter specifically for agents
        .order('username', { ascending: true });

      if (agents) setStaff(agents);
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

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

    try {
      // INHERITANCE: Passing down the Operator's brand DNA
      const response = await fetch('/api/admin/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName || form.username,
          operatorId: operatorProfile.id,
          tenantId: operatorProfile.tenant_id, // Inherited
          logoUrl: operatorProfile.logo_url    // Inherited
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to initialize Agent');

      alert(`AGENT PROVISIONED: ${form.username} is now active under your brand.`);
      setForm({ username: '', password: '', displayName: '' });
      setShowAddForm(false);
      fetchData(); 

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
              <Database size={12} /> Network Infrastructure
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Manage Agents</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={`${showAddForm ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2 border border-transparent`}
            >
              {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
              {showAddForm ? 'Cancel' : 'Register New Agent'}
            </button>

            <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Total Agent Float</span>
              <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
                KES {staff.reduce((acc, s) => acc + (parseFloat(s.balance) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ADD AGENT FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateAgent} className="bg-[#111926] p-8 rounded-[2.5rem] border border-blue-500/20 flex flex-wrap gap-4 items-end animate-in fade-in zoom-in duration-200">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Agent Username</label>
              <input required placeholder="agent_alpha" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Display Name (Optional)</label>
              <input placeholder="City Center Hub" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Login Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>

            <button disabled={creating} className="bg-[#10b981] text-black h-[54px] px-10 rounded-2xl font-black uppercase italic text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {creating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {creating ? 'Provising...' : 'Activate Agent'}
            </button>
          </form>
        )}

        {/* AGENT LIST */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-[9px] font-black uppercase text-slate-600 italic tracking-widest">
              <tr>
                <th className="p-10">Agent Identity</th>
                <th className="p-10 text-center">Liquidity / Float</th>
                <th className="p-10 text-right">Fund Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff.length === 0 ? (
                <tr><td colSpan="3" className="p-20 text-center text-slate-500 italic uppercase font-black text-xs tracking-widest">No agents deployed in your network</td></tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                          {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover rounded-xl" alt="" /> : <Monitor size={20} />}
                        </div>
                        <div>
                          <span className="font-black uppercase italic text-xl tracking-tight block">{s.username}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{s.display_name || 'Generic Agent'}</span>
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
                        className="bg-white/5 p-5 px-8 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all text-xs font-black uppercase italic group flex items-center gap-2 ml-auto"
                      >
                        {processingId === s.id ? <Loader2 className="animate-spin" size={16} /> : <>DISPATCH <Send size={14} className="group-hover:translate-x-1 transition-transform" /></>}
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

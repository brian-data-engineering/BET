import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, Database, UserPlus, X, ShieldCheck, Search, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);
      const { data: agents } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'agent')
        .order('username', { ascending: true });

      if (agents) setStaff(agents);
    }
    setFetching(false);
  }, []);

  useEffect(() => { 
    fetchData();
  }, [fetchData]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

    try {
      const response = await fetch('/api/admin/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          operatorId: operatorProfile.id,
          tenantId: operatorProfile.tenant_id,
          logoUrl: operatorProfile.logo_url
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Provisioning failed");
      }

      setForm({ username: '', password: '', displayName: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      alert(error.message);
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
      else fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Logic
  const filteredStaff = staff.filter(s => 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.display_name && s.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (fetching) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION */}
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
              className={`${showAddForm ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-blue-600 text-white'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2 border border-transparent`}
            >
              {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
              {showAddForm ? 'Cancel' : 'Register New Agent'}
            </button>

            <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Agent Network Float</span>
              <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
                KES {staff.reduce((acc, s) => acc + (parseFloat(s.balance) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ADD AGENT FORM - Animated Reveal */}
        {showAddForm && (
          <form onSubmit={handleCreateAgent} className="bg-[#111926] p-8 rounded-[2.5rem] border border-blue-500/20 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Username</label>
              <input required placeholder="agent_alpha" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Display Name</label>
              <input required placeholder="Nairobi Branch" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button disabled={creating} className="bg-[#10b981] text-black h-[56px] px-10 rounded-2xl font-black uppercase italic text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {creating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {creating ? 'PROVISIONING...' : 'ACTIVATE AGENT'}
            </button>
          </form>
        )}

        {/* SEARCH & TABLE SECTION */}
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="FAST LOOKUP: SEARCH BY USERNAME OR BRANCH..." 
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-xs font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>

          <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
               <div className="flex items-center gap-3">
                <Database size={20} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase italic tracking-[0.2em]">Active Agent Ledger</h2>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 disabled:opacity-30" disabled={currentPage === 1}><ChevronLeft size={16}/></button>
                  <span className="text-[10px] font-black px-2 text-blue-500">PAGE {currentPage} OF {totalPages || 1}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 disabled:opacity-30" disabled={currentPage === totalPages || totalPages === 0}><ChevronRight size={16}/></button>
               </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                <tr>
                  <th className="p-8">Agent Identity</th>
                  <th className="p-8 text-center">Liquidity / Float</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentStaff.length > 0 ? currentStaff.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-black border border-white/5 overflow-hidden flex items-center justify-center">
                          {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover" alt="" /> : <Monitor className="text-slate-700" size={20} />}
                        </div>
                        <div>
                          <span className="font-black uppercase italic text-xl tracking-tight block text-white">{s.username}</span>
                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{s.display_name || 'Lucra Agent'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <span className="font-black text-[#10b981] italic tracking-tighter text-2xl">KES {parseFloat(s.balance || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-8 text-right">
                      <button 
                        onClick={() => handleDispatch(s.id, s.username)}
                        disabled={processingId !== null}
                        className="bg-white/5 p-4 px-8 rounded-xl hover:bg-[#10b981] hover:text-black transition-all text-[10px] font-black uppercase italic group flex items-center gap-2 ml-auto"
                      >
                        {processingId === s.id ? <Loader2 className="animate-spin" size={14} /> : <>DISPATCH <Send size={12} className="group-hover:translate-x-1 transition-transform" /></>}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.5em] text-xs">No Agents found in your network</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}

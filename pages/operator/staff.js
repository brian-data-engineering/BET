import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  Monitor, 
  Loader2, 
  Send, 
  Database, 
  UserPlus, 
  X, 
  ShieldCheck, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Activity 
} from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [creating, setCreating] = useState(false);

  // --- DATA SYNC ---
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Operator Context
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);
      // 2. Fetch only direct child Agents
      const { data: agents } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (agents) setStaff(agents);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- PROVISIONING LOGIC ---
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    // Ghost email scoped to this brand
    const ghostEmail = `${form.username.toLowerCase().trim()}@${operatorProfile.username}.internal`;

    try {
      const response = await fetch('/api/admin/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          role: 'agent', // Explicitly creating agents
          parentId: operatorProfile.id,
          tenantId: operatorProfile.tenant_id,
          logoUrl: operatorProfile.logo_url // Inherit Brand Logo
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Provisioning failed");

      setForm({ username: '', password: '', displayName: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  // --- FINANCIAL DISPATCH ---
  const handleDispatch = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Enter KES amount to dispatch to ${name.toUpperCase()}:`);
    if (!val) return;
    
    const amount = Math.trunc(Number(val));
    if (!amount || amount <= 0) return alert("Invalid amount");

    setProcessingId(id);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: id,
        p_amount: amount
      });
      
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert(`Dispatch Failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // --- FILTER & PAGINATION ---
  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, searchTerm]);

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (fetching) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
      <Activity className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans selection:bg-blue-500/30">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-white/5 pb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-[0.3em]">
              <Database size={12} /> Regional Network Control
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Manage Agents</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={`${showAddForm ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]'} px-8 py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border`}
            >
              {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
              {showAddForm ? 'Close Portal' : 'Register New Agent'}
            </button>

            <div className="bg-[#111926] px-8 py-4 rounded-2xl border border-white/5">
              <span className="text-[8px] font-black text-slate-500 uppercase block tracking-widest mb-1">Total Agent Float</span>
              <span className="text-2xl font-black text-[#10b981] italic tracking-tighter">
                KES {staff.reduce((acc, s) => acc + (parseFloat(s.balance) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateAgent} className="bg-[#111926] p-10 rounded-[3rem] border border-blue-500/30 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Username</label>
              <input required placeholder="agent_meru_01" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Display Name</label>
              <input required placeholder="Meru Town Hub" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div className="flex items-end">
              <button disabled={creating} className="w-full bg-[#10b981] text-black h-[54px] rounded-xl font-black uppercase italic text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                {creating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                {creating ? 'AUTHORIZING...' : 'ACTIVATE AGENT'}
              </button>
            </div>
          </form>
        )}

        {/* SEARCH & LEDGER */}
        <div className="space-y-6">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="GLOBAL SEARCH: AGENT NAME OR USERNAME..." 
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-blue-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>

          <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
               <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-400">Agent Network Ledger</h2>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 disabled:opacity-20" disabled={currentPage === 1}><ChevronLeft size={16}/></button>
                    <span className="text-[9px] font-black px-3 text-blue-500 uppercase">Page {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 disabled:opacity-20" disabled={currentPage === totalPages || totalPages === 0}><ChevronRight size={16}/></button>
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[8px] font-black tracking-[0.4em] italic">
                  <tr>
                    <th className="p-8">Identity & Node ID</th>
                    <th className="p-8 text-center">Liquidity Status</th>
                    <th className="p-8 text-right">Network Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentStaff.length > 0 ? currentStaff.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-black border border-white/5 overflow-hidden flex items-center justify-center relative">
                            {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover opacity-80" alt="" /> : <Monitor className="text-slate-800" size={24} />}
                            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
                          </div>
                          <div>
                            <span className="font-black uppercase italic text-2xl tracking-tighter block text-white group-hover:text-blue-400 transition-colors">{s.username}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{s.display_name || 'Lucra Agent'}</span>
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <span className="text-[7px] font-mono text-slate-600">ID: {s.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="inline-block px-6 py-2 rounded-xl bg-black/40 border border-white/5">
                          <span className="text-[8px] font-black text-slate-500 block uppercase mb-1">Available Float</span>
                          <span className="font-black text-[#10b981] italic tracking-tighter text-2xl">KES {parseFloat(s.balance || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                        <button 
                          onClick={() => handleDispatch(s.id, s.username)}
                          disabled={processingId !== null}
                          className="bg-white/5 p-4 px-8 rounded-xl hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase italic group flex items-center gap-3 ml-auto border border-white/5"
                        >
                          {processingId === s.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <>
                              Transmit Float 
                              <Send size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-32 text-center">
                        <div className="opacity-20 flex flex-col items-center gap-4">
                          <Database size={48} />
                          <span className="font-black uppercase tracking-[0.5em] text-xs">Network Registry Empty</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}

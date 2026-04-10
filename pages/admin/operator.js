import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  UserPlus, 
  ShieldCheck, 
  Database, 
  ImageIcon, 
  Search,
  Network,
  Store,
  Monitor,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function ManageOperators() {
  // --- STATE MANAGEMENT ---
  const [allProfiles, setAllProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [provisionType, setProvisionType] = useState('operator'); 
  
  const [form, setForm] = useState({ 
    password: '', 
    username: '', 
    displayName: '', 
    logoUrl: '',
    selectedOperatorId: '',
    selectedAgentId: '',
    selectedShopId: ''
  });

  // --- DATA SYNCING ---
  const syncNetworkState = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error.message);
    setAllProfiles(profiles || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminId(user.id);
        syncNetworkState();
      }
    };
    init();
  }, [syncNetworkState]);

  // --- MEMOIZED ROLE FILTERING ---
  const operators = useMemo(() => allProfiles.filter(p => p.role === 'operator'), [allProfiles]);
  const agents = useMemo(() => allProfiles.filter(p => p.role === 'agent'), [allProfiles]);
  const shops = useMemo(() => allProfiles.filter(p => p.role === 'shop'), [allProfiles]);

  const filteredNodes = useMemo(() => {
    return allProfiles.filter(p => 
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProfiles, searchTerm]);

  // --- CORE LOGIC ---
  const handleAction = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingNode) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: form.displayName, logo_url: form.logoUrl })
        .eq('id', editingNode.id);
      
      if (error) alert(error.message);
    } else {
      // 1. Determine Chain IDs
      let finalParentId = adminId;
      if (provisionType === 'agent') finalParentId = form.selectedOperatorId;
      if (provisionType === 'shop') finalParentId = form.selectedAgentId;
      if (provisionType === 'cashier') finalParentId = form.selectedShopId;

      const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

      try {
        // 2. Call the Unified Provisioning Engine
        const response = await fetch('/api/admin/provision-node', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ghostEmail,
            password: form.password,
            username: form.username.trim(),
            displayName: form.displayName,
            logoUrl: form.logoUrl,
            role: provisionType,
            parentId: finalParentId,
            tenantId: provisionType === 'operator' ? null : form.selectedOperatorId 
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Provisioning failed");
        
      } catch (err) {
        alert(err.message);
      }
    }

    // Reset
    setEditingNode(null);
    setForm({ password: '', username: '', displayName: '', logoUrl: '', selectedOperatorId: '', selectedAgentId: '', selectedShopId: '' });
    syncNetworkState();
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans selection:bg-blue-500/30">
        
        {/* TOP STATS BAR */}
        <div className="flex flex-col xl:flex-row justify-between gap-8 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none select-none">Lucra Core</h1>
            <p className="text-blue-500 font-bold text-xs mt-4 uppercase tracking-[0.3em] italic">Network Infrastructure & Provisioning</p>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 shadow-2xl flex gap-10 items-center">
            <div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Global Network Liquidity</span>
              <span className="text-4xl font-black italic tracking-tighter text-white">
                KES {allProfiles.reduce((a, b) => a + (parseFloat(b.balance) || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="h-12 w-px bg-white/5 hidden md:block" />
            <div className="hidden md:block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Active Nodes</span>
              <span className="text-2xl font-black italic">{allProfiles.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* PROVISIONING FORM */}
          <div className="lg:col-span-5">
            <div className={`sticky top-8 p-10 rounded-[3rem] border transition-all duration-500 ${editingNode ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]' : 'border-white/5 bg-[#111926]'}`}>
              
              {/* DYNAMIC ROLE PICKER */}
              {!editingNode && (
                <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8 border border-white/5">
                  {[
                    { id: 'operator', icon: ShieldCheck, label: 'Owner' },
                    { id: 'agent', icon: Network, label: 'Agent' },
                    { id: 'shop', icon: Store, label: 'Shop' },
                    { id: 'cashier', icon: Monitor, label: 'Node' }
                  ].map(r => (
                    <button 
                      key={r.id}
                      onClick={() => setProvisionType(r.id)}
                      className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${provisionType === r.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      <r.icon size={16} />
                      <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">{r.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <h2 className="font-black uppercase text-sm italic tracking-widest mb-6 flex items-center gap-3 text-blue-500">
                <UserPlus size={18}/> {editingNode ? 'Identity Update' : `Register New ${provisionType}`}
              </h2>

              <form onSubmit={handleAction} className="space-y-5">
                
                {/* CASCADING SELECTION LOGIC */}
                {!editingNode && provisionType !== 'operator' && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">1. Select Brand Operator</label>
                      <select required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold focus:border-blue-500 outline-none transition-all" value={form.selectedOperatorId} onChange={e => setForm({...form, selectedOperatorId: e.target.value})}>
                        <option value="">Select Root Operator...</option>
                        {operators.map(op => <option key={op.id} value={op.id}>{op.display_name} (@{op.username})</option>)}
                      </select>
                    </div>

                    {['shop', 'cashier'].includes(provisionType) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">2. Select Parent Agent</label>
                        <select required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold outline-none" value={form.selectedAgentId} onChange={e => setForm({...form, selectedAgentId: e.target.value})}>
                          <option value="">Select Local Agent...</option>
                          {agents.filter(a => a.parent_id === form.selectedOperatorId).map(ag => (
                            <option key={ag.id} value={ag.id}>{ag.display_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {provisionType === 'cashier' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">3. Select Destination Shop</label>
                        <select required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold outline-none" value={form.selectedShopId} onChange={e => setForm({...form, selectedShopId: e.target.value})}>
                          <option value="">Select Shop Branch...</option>
                          {shops.filter(s => s.parent_id === form.selectedAgentId).map(sh => (
                            <option key={sh.id} value={sh.id}>{sh.display_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Username</label>
                    <input required value={form.username} disabled={!!editingNode} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold disabled:opacity-50" placeholder="nairobi_001" onChange={e => setForm({...form, username: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Password</label>
                    <input required={!editingNode} type="password" disabled={!!editingNode} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold disabled:opacity-50" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Display / Brand Name</label>
                  <input required value={form.displayName} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold focus:border-blue-600 transition-all outline-none" placeholder="e.g. Lucra Meru Hub" onChange={e => setForm({...form, displayName: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest flex justify-between">
                    Logo Asset URL <span>{form.logoUrl ? '✓' : '∅'}</span>
                  </label>
                  <input value={form.logoUrl} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold" placeholder="https://cloud.lucra.com/asset.png" onChange={e => setForm({...form, logoUrl: e.target.value})} />
                </div>

                <button disabled={loading} className={`w-full font-black py-5 rounded-2xl transition-all italic text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 ${editingNode ? 'bg-white text-black' : 'bg-blue-600 text-white shadow-xl hover:scale-[1.02]'}`}>
                  {loading ? <Activity className="animate-spin" size={16}/> : editingNode ? 'Commit Identity Update' : `Authorize ${provisionType} node`}
                </button>

                {editingNode && (
                  <button type="button" onClick={() => { setEditingNode(null); setForm({ ...form, displayName: '', logoUrl: '' }); }} className="w-full text-[9px] font-black text-slate-500 uppercase tracking-widest">Cancel Editing</button>
                )}
              </form>
            </div>
          </div>

          {/* MASTER NETWORK LEDGER */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="GLOBAL NETWORK SEARCH: USERNAME, BRAND, OR ROLE..."
                className="w-full bg-[#111926] border border-white/5 rounded-[2rem] py-6 pl-16 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-blue-500/50 transition-all shadow-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Database size={18} className="text-blue-500" />
                  <h2 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">Master Identity Ledger</h2>
                </div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Sync: Healthy</span>
              </div>

              <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto custom-scrollbar">
                {filteredNodes.length > 0 ? filteredNodes.map(node => (
                  <div key={node.id} className="p-7 flex items-center justify-between hover:bg-white/[0.02] transition-all group relative overflow-hidden">
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-black border flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50 ${node.role === 'operator' ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'}`}>
                        {node.logo_url ? <img src={node.logo_url} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-800" size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-white uppercase italic text-xl tracking-tighter">{node.username}</span>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                            node.role === 'operator' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                            node.role === 'agent' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
                            'bg-slate-500/10 text-slate-500 border-white/10'
                          }`}>{node.role}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{node.display_name || 'Lucra Node'}</p>
                          <ArrowRight size={10} className="text-slate-700" />
                          <span className="text-[8px] font-mono text-slate-600 uppercase">UID: {node.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right relative z-10">
                      <span className="block text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest italic group-hover:text-blue-500 transition-colors">Vault Balance</span>
                      <span className="text-2xl font-black italic tracking-tighter text-white">KES {parseFloat(node.balance || 0).toLocaleString()}</span>
                      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                         <button 
                          onClick={() => {
                            setEditingNode(node);
                            setForm({ ...form, displayName: node.display_name, logoUrl: node.logo_url });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="text-[9px] font-black text-blue-500 hover:text-white transition-colors uppercase italic tracking-[0.2em]"
                         >
                           Configure Identity
                         </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-20 text-center opacity-20 italic text-sm">No network nodes found matching search...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  UserPlus, 
  ShieldCheck, 
  Database, 
  Edit3, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ImageIcon, 
  Search,
  Network,
  Store,
  Monitor
} from 'lucide-react';

export default function ManageOperators() {
  const [operators, setOperators] = useState([]);
  const [agents, setAgents] = useState([]); // Context for dropdowns
  const [shops, setShops] = useState([]);   // Context for dropdowns
  const [searchTerm, setSearchTerm] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [editingNode, setEditingNode] = useState(null);
  const [provisionType, setProvisionType] = useState('operator'); // operator | agent | shop | cashier
  
  const [form, setForm] = useState({ 
    password: '', 
    username: '', 
    displayName: '', 
    logoUrl: '',
    selectedOperatorId: '',
    selectedAgentId: '',
    selectedShopId: ''
  });

  // SYNC: Fetch the entire network for assignment dropdowns
  const syncNetworkState = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error.message);
    
    setOperators(profiles.filter(p => p.role === 'operator') || []);
    setAgents(profiles.filter(p => p.role === 'agent') || []);
    setShops(profiles.filter(p => p.role === 'shop') || []);
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

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingNode) {
      // Update existing
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: form.displayName, logo_url: form.logoUrl })
        .eq('id', editingNode.id);
      if (error) alert(error.message);
    } else {
      // PROVISIONING LOGIC: Determine parent and tenant based on role
      const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;
      
      // Determine IDs based on the "Lucra Chain"
      let finalParentId = adminId;
      let finalTenantId = null; // Will be set by API for Operators, or inherited for others

      if (provisionType === 'agent') finalParentId = form.selectedOperatorId;
      if (provisionType === 'shop') finalParentId = form.selectedAgentId;
      if (provisionType === 'cashier') finalParentId = form.selectedShopId;

      try {
        const response = await fetch(`/api/admin/create-${provisionType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ghostEmail,
            password: form.password,
            username: form.username.trim(),
            displayName: form.displayName,
            logoUrl: form.logoUrl,
            parentId: finalParentId,
            // If creating anything below Operator, we must pass the tenantId of that branch
            tenantId: provisionType === 'operator' ? null : form.selectedOperatorId 
          }),
        });
        if (!response.ok) throw new Error("Provisioning failed");
      } catch (err) { alert(err.message); }
    }

    setEditingNode(null);
    setForm({ password: '', username: '', displayName: '', logoUrl: '', selectedOperatorId: '', selectedAgentId: '', selectedShopId: '' });
    syncNetworkState();
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between gap-8 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Lucra Core</h1>
            <p className="text-blue-500 font-bold text-xs mt-4 uppercase tracking-[0.3em] italic">System Root & Network Architect</p>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Global Liquidity Pool</span>
            <span className="text-4xl font-black italic tracking-tighter">KES {operators.reduce((a, b) => a + (parseFloat(b.balance) || 0), 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* PROVISIONING PANEL */}
          <div className="lg:col-span-5">
            <div className={`p-10 rounded-[3rem] border transition-all ${editingNode ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-[#111926] shadow-2xl'}`}>
              
              {/* ROLE PICKER */}
              {!editingNode && (
                <div className="flex bg-black/40 p-1 rounded-2xl mb-8 border border-white/5">
                  {[
                    { id: 'operator', icon: ShieldCheck, label: 'Owner' },
                    { id: 'agent', icon: Network, label: 'Agent' },
                    { id: 'shop', icon: Store, label: 'Shop' },
                    { id: 'cashier', icon: Monitor, label: 'Node' }
                  ].map(role => (
                    <button 
                      key={role.id}
                      onClick={() => setProvisionType(role.id)}
                      className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${provisionType === role.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      <role.icon size={16} />
                      <span className="text-[8px] font-black uppercase mt-1">{role.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <h2 className="font-black uppercase text-sm italic tracking-widest mb-6 flex items-center gap-3 text-blue-500">
                <UserPlus size={18}/> {editingNode ? 'Modify Identity' : `Register ${provisionType}`}
              </h2>

              <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                
                {/* HIERARCHY DROPDOWNS (THE CASCADING LOGIC) */}
                {!editingNode && (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    {['agent', 'shop', 'cashier'].includes(provisionType) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Select Parent Operator</label>
                        <select 
                          required
                          className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold appearance-none"
                          value={form.selectedOperatorId}
                          onChange={e => setForm({...form, selectedOperatorId: e.target.value})}
                        >
                          <option value="">Choose Brand...</option>
                          {operators.map(op => <option key={op.id} value={op.id}>{op.display_name} ({op.username})</option>)}
                        </select>
                      </div>
                    )}

                    {['shop', 'cashier'].includes(provisionType) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Select Parent Agent</label>
                        <select 
                          required
                          className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold appearance-none"
                          value={form.selectedAgentId}
                          onChange={e => setForm({...form, selectedAgentId: e.target.value})}
                        >
                          <option value="">Choose Agent...</option>
                          {agents.filter(a => a.parent_id === form.selectedOperatorId).map(ag => (
                            <option key={ag.id} value={ag.id}>{ag.display_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {provisionType === 'cashier' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Select Shop Branch</label>
                        <select 
                          required
                          className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold appearance-none"
                          value={form.selectedShopId}
                          onChange={e => setForm({...form, selectedShopId: e.target.value})}
                        >
                          <option value="">Choose Shop...</option>
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
                    <input value={form.username} disabled={!!editingNode} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold" placeholder="nairobi_hub" onChange={e => setForm({...form, username: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Password</label>
                    <input type="password" disabled={!!editingNode} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Display / Brand Name</label>
                  <input value={form.displayName} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold focus:border-blue-600 transition-all outline-none" placeholder="e.g. Lucra Nairobi" onChange={e => setForm({...form, displayName: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest flex justify-between">
                    Logo URL <span>{form.logoUrl ? '✅' : '❌'}</span>
                  </label>
                  <input value={form.logoUrl} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold" placeholder="https://..." onChange={e => setForm({...form, logoUrl: e.target.value})} />
                </div>

                <button disabled={loading} className={`w-full font-black py-6 rounded-2xl transition-all italic text-xs uppercase tracking-[0.4em] ${editingNode ? 'bg-white text-black' : 'bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]'}`}>
                  {loading ? 'SYNCHRONIZING CORE...' : editingNode ? 'COMMIT UPDATES' : `AUTHORIZE ${provisionType}`}
                </button>
              </form>
            </div>
          </div>

          {/* LIST PANEL */}
          <div className="lg:col-span-7 space-y-6">
             <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="GLOBAL SEARCH: USERNAME, BRAND, OR ROLE..."
                className="w-full bg-[#111926] border border-white/5 rounded-[2rem] py-6 pl-16 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-blue-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Database size={20} className="text-blue-500" />
                  <h2 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">Master Identity Ledger</h2>
                </div>
              </div>

              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {operators.filter(op => op.username.includes(searchTerm.toLowerCase())).map(op => (
                  <div key={op.id} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 overflow-hidden flex items-center justify-center">
                        {op.logo_url ? <img src={op.logo_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-800" size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white uppercase italic text-2xl tracking-tighter">{op.username}</span>
                          <span className="bg-blue-500/10 text-blue-500 text-[8px] font-black px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">Operator</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{op.display_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-slate-600 uppercase mb-1">Vault Balance</span>
                      <span className="text-2xl font-black italic tracking-tighter text-white">KES {parseFloat(op.balance || 0).toLocaleString()}</span>
                      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setEditingNode(op)} className="text-[9px] font-black text-blue-500 hover:text-white transition-colors uppercase italic tracking-widest">Configure Node</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

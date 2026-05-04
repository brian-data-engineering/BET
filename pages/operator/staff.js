import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  Monitor, Loader2, Send, Database, UserPlus, X, 
  ShieldCheck, Search, ChevronLeft, ChevronRight, 
  Network, Store, HardDrive 
} from 'lucide-react';

export default function ManageStaff() {
  const [allNodes, setAllNodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [provisionType, setProvisionType] = useState('agent'); 
  const [form, setForm] = useState({ 
    username: '', 
    password: '', 
    displayName: '',
    selectedParentId: '' 
  });
  const [creating, setCreating] = useState(false);

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);
      // Fetch the entire tree for this brand/tenant
      const { data: nodes } = await supabase.from('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('role', { ascending: true });

      if (nodes) setAllNodes(nodes);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- HIERARCHY DROPDOWN LOGIC ---
  const potentialParents = useMemo(() => {
    if (provisionType === 'agent') return []; // Operator is the parent
    if (provisionType === 'shop') return allNodes.filter(n => n.role === 'agent');
    if (provisionType === 'cashier') return allNodes.filter(n => n.role === 'shop');
    return [];
  }, [provisionType, allNodes]);

  // --- PROVISIONING ---
  const handleCreateNode = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    // STRICT LUCRA GHOST EMAIL FORMAT
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;
    
    // Determine the immediate supervisor (parent)
    const finalParentId = provisionType === 'agent' ? operatorProfile.id : form.selectedParentId;

    if (provisionType !== 'agent' && !finalParentId) {
      alert("Missing Parent: Please select who this node reports to.");
      setCreating(false);
      return;
    }

    try {
      const response = await fetch('/api/operator/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          role: provisionType,
          parentId: finalParentId,
          tenantId: operatorProfile.tenant_id,
          logoUrl: operatorProfile.logo_url
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deployment failed");

      setForm({ username: '', password: '', displayName: '', selectedParentId: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Infrastructure</h1>
            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Active Tenant: {operatorProfile?.display_name}</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${showAddForm ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-600 text-white'}`}
          >
            {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
            {showAddForm ? 'Cancel' : 'Deploy Node'}
          </button>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateNode} className="bg-[#111926] p-10 rounded-[3rem] border border-blue-500/30 space-y-8 animate-in slide-in-from-top-4">
            
            {/* TYPE SELECTION */}
            <div className="flex bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5">
              {[
                { id: 'agent', label: 'Agent', icon: Network },
                { id: 'shop', label: 'Shop', icon: Store },
                { id: 'cashier', label: 'Cashier', icon: HardDrive }
              ].map(type => (
                <button 
                  key={type.id} 
                  type="button"
                  onClick={() => { setProvisionType(type.id); setForm({...form, selectedParentId: ''}); }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${provisionType === type.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  <type.icon size={14} />
                  <span className="text-[10px] font-black uppercase">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* DROPDOWN FOR ROLLING DOWN THE CHAIN */}
              {provisionType !== 'agent' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Parent Assignment</label>
                  <select 
                    required 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-blue-500"
                    value={form.selectedParentId}
                    onChange={e => setForm({...form, selectedParentId: e.target.value})}
                  >
                    <option value="">Select Parent...</option>
                    {potentialParents.map(p => (
                      <option key={p.id} value={p.id}>{p.username} ({p.display_name})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Username</label>
                <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" placeholder="e.g. agent001" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Display Name</label>
                <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" placeholder="Nairobi Hub" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Access Key</label>
                <input required type="password" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>

            <button disabled={creating} className="w-full bg-[#10b981] text-black py-5 rounded-2xl font-black uppercase italic text-xs tracking-[0.2em]">
              {creating ? 'DEPLOYING...' : `ACTIVATE ${provisionType.toUpperCase()}`}
            </button>
          </form>
        )}

        {/* LEDGER TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[8px] font-black tracking-[0.4em] italic">
              <tr>
                <th className="p-8">Node Identity</th>
                <th className="p-8 text-center">Balance</th>
                <th className="p-8 text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allNodes.filter(n => n.id !== operatorProfile?.id).map(node => (
                <tr key={node.id} className="hover:bg-white/[0.02]">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${node.role === 'agent' ? 'border-blue-500/20 bg-blue-500/5 text-blue-500' : 'border-slate-500/20 bg-slate-500/5 text-slate-500'}`}>
                        {node.role === 'agent' ? <Network size={16}/> : node.role === 'shop' ? <Store size={16}/> : <Monitor size={16}/>}
                      </div>
                      <div>
                        <span className="font-black uppercase italic text-lg block">{node.username}</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{node.role} • {node.display_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-8 text-center font-black text-[#10b981] italic tracking-tighter text-2xl">
                    KES {parseFloat(node.balance || 0).toLocaleString()}
                  </td>
                  <td className="p-8 text-right">
                    <button className="bg-white/5 p-4 px-6 rounded-xl hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase italic">
                      Dispatch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OperatorLayout>
  );
}

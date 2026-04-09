import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, ShieldCheck, Database, Edit3, X, ChevronLeft, ChevronRight, ImageIcon, Search } from 'lucide-react';

export default function ManageOperators() {
  const [operators, setOperators] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // New State for Search
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [editingNode, setEditingNode] = useState(null);
  const [form, setForm] = useState({ password: '', username: '', displayName: '', logoUrl: '' });

  const isFormValid = form.username && form.displayName && form.logoUrl && (editingNode ? true : form.password);

  const syncNetworkState = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, balance, role, logo_url, created_at')
      .eq('role', 'operator')
      .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error.message);
    setOperators(profiles || []);
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

  // FILTER LOGIC: Real-time search across multiple fields
  const filteredOperators = operators.filter(op => 
    op.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (op.display_name && op.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOperators = filteredOperators.slice(indexOfFirstItem, indexOfLastItem);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingNode) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: form.displayName, logo_url: form.logoUrl })
        .eq('id', editingNode.id);

      if (error) alert(error.message);
      else {
        setEditingNode(null);
        setForm({ password: '', username: '', displayName: '', logoUrl: '' });
      }
    } else {
      const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;
      try {
        const response = await fetch('/api/admin/create-operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ghostEmail,
            password: form.password,
            username: form.username.trim(),
            adminId: adminId,
            displayName: form.displayName,
            logoUrl: form.logoUrl
          }),
        });
        if (!response.ok) throw new Error("Provisioning failed");
        setForm({ password: '', username: '', displayName: '', logoUrl: '' });
      } catch (err) { alert(err.message); }
    }
    syncNetworkState();
    setLoading(false);
  };

  const startEdit = (op) => {
    setEditingNode(op);
    setForm({
      username: op.username,
      displayName: op.display_name || '',
      logoUrl: op.logo_url || '',
      password: '****' 
    });
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between gap-8">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Operator Control</h1>
            <p className="text-blue-500 font-bold text-xs mt-2 uppercase tracking-widest italic">Hierarchy & Branding Master</p>
          </div>
          <div className="bg-[#111926] p-6 rounded-[2rem] border border-white/5 text-right">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Network Float</span>
            <span className="text-2xl font-black italic tracking-tighter">KES {operators.reduce((a, b) => a + (parseFloat(b.balance) || 0), 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM PANEL */}
          <div className="lg:col-span-4">
            <div className={`p-10 rounded-[3rem] border transition-all ${editingNode ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-[#111926]'}`}>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${editingNode ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="font-black uppercase text-xs italic tracking-widest">{editingNode ? 'Modify Brand' : 'Provision Brand'}</h2>
                </div>
                {editingNode && <button onClick={() => {setEditingNode(null); setForm({ password: '', username: '', displayName: '', logoUrl: '' });}}><X className="text-slate-500" /></button>}
              </div>

              <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Username</label>
                  <input value={form.username} disabled={!!editingNode} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold" placeholder="nairobi_hub" onChange={e => setForm({...form, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Display/Brand Name</label>
                  <input value={form.displayName} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold" placeholder="e.g. Lucra Nairobi" onChange={e => setForm({...form, displayName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className={`text-[8px] font-black uppercase ml-2 tracking-widest ${!form.logoUrl ? 'text-red-500' : 'text-slate-500'}`}>Logo URL {!form.logoUrl && '(REQUIRED)'}</label>
                  <input value={form.logoUrl} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold" placeholder="https://..." onChange={e => setForm({...form, logoUrl: e.target.value})} />
                </div>
                {!editingNode && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Master Key</label>
                    <input type="password" value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-sm font-bold" onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                )}
                <button disabled={!isFormValid || loading} className={`w-full font-black py-5 rounded-xl transition-all italic text-xs uppercase tracking-widest ${!isFormValid ? 'bg-white/5 text-slate-600' : editingNode ? 'bg-white text-black' : 'bg-blue-600 text-white shadow-lg'}`}>
                  {loading ? 'SYNCING...' : editingNode ? 'UPDATE BRAND' : 'ACTIVATE OPERATOR'}
                </button>
              </form>
            </div>
          </div>

          {/* TABLE PANEL + SEARCH */}
          <div className="lg:col-span-8 space-y-4">
            {/* FAST LOOKUP SEARCH BAR */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="FAST LOOKUP: SEARCH BY USERNAME OR BRAND..."
                className="w-full bg-[#111926] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-xs font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>

            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden">
              <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                   <div className="flex items-center gap-3">
                    <Database size={20} className="text-blue-500" />
                    <h2 className="text-xs font-black uppercase italic tracking-[0.2em]">Active Operator Ledger</h2>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><ChevronLeft size={16}/></button>
                      <span className="text-[10px] font-black px-2 text-blue-500">PAGE {currentPage}</span>
                      <button onClick={() => setCurrentPage(p => p+1)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><ChevronRight size={16}/></button>
                   </div>
              </div>

              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                  <tr>
                    <th className="p-6">Brand Identity</th>
                    <th className="p-6 text-center">Liquidity</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentOperators.length > 0 ? currentOperators.map(op => (
                    <tr key={op.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-black border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {op.logo_url ? <img src={op.logo_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-800" size={16} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase italic text-lg tracking-tighter">{op.username}</span>
                            <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{op.display_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="font-black text-white italic tracking-tighter text-xl">KES {parseFloat(op.balance || 0).toLocaleString()}</span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => startEdit(op)} className="text-[10px] font-black text-white border border-white/10 px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all uppercase italic">Edit</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.5em] text-xs">No Operators Found Matching "{searchTerm}"</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

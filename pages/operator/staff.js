import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, Database, UserPlus, X, ShieldCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Search & Pagination Logic
  const filteredStaff = staff.filter(s => 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.display_name && s.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  if (fetching) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION - Same style as Operator Page */}
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
              className={`${showAddForm ? 'bg-red-500/20 text-red-500' : 'bg-blue-600 text-white'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2`}
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

        {/* SEARCH BAR - Matching Admin style */}
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH AGENT NETWORK..." 
            className="w-full bg-[#111926] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-xs font-black uppercase tracking-widest outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FORM & TABLE UI ... rest of your UI code follows the same pattern */}
      </div>
    </OperatorLayout>
  );
}

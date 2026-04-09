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

    // 1. Get current Operator's full profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);
      
      // 2. Fetch only AGENTS that belong to this Operator's network
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
    
    // Safety check: Ensure the Operator identity is loaded
    if (!operatorProfile?.tenant_id) {
      alert("Network Error: Operator identity not fully loaded. Please refresh.");
      return;
    }

    setCreating(true);
    const cleanUsername = form.username.toLowerCase().trim();
    const ghostEmail = `${cleanUsername}@lucra.internal`;

    try {
      const response = await fetch('/api/admin/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: cleanUsername,
          displayName: form.displayName || form.username,
          operatorId: operatorProfile.id,
          tenantId: operatorProfile.tenant_id, 
          logoUrl: operatorProfile.logo_url   
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Provisioning sequence failed');

      alert(`SUCCESS: Agent ${cleanUsername} is now online.`);
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

    // Optional: Frontend balance check
    if (amount > (operatorProfile?.balance || 0)) {
        alert("Insufficient Float: You cannot dispatch more than your current balance.");
        return;
    }

    setProcessingId(id);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: id,
        p_amount: amount
      });
      if (error) throw error;
      alert(`DISPATCH COMPLETE: KES ${amount.toLocaleString()} sent to ${name}.`);
    } catch (err) {
      alert(`Dispatch Rejected: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (fetching) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );

  return (
    <OperatorLayout profile={operatorProfile}>
        {/* Your existing UI code... */}
    </OperatorLayout>
  );
}

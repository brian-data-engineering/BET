import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, RefreshCw, Database } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchLedgerData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFetching(true);

    // 1. Get Profiles
    const [pRes, sRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('parent_id', user.id).eq('role', 'cashier').order('username', { ascending: true })
    ]);

    // 2. Compute Ledger Balances (The Source of Truth)
    const userIds = [user.id, ...(sRes.data?.map(s => s.id) || [])];
    const { data: ledgerRows } = await supabase
      .from('ledger')
      .select('user_id, type, amount')
      .in('user_id', userIds);

    const getBalance = (uid) => {
      return (ledgerRows || [])
        .filter(row => row.user_id === uid)
        .reduce((acc, row) => row.type === 'credit' ? acc + Number(row.amount) : acc - Number(row.amount), 0);
    };

    if (pRes.data) {
      setOperatorProfile({ ...pRes.data, balance: getBalance(user.id) });
    }

    if (sRes.data) {
      setStaff(sRes.data.map(s => ({ ...s, balance: getBalance(s.id) })));
    }
    
    setFetching(false);
  }, []);

  useEffect(() => { fetchLedgerData(); }, [fetchLedgerData]);

  const handleDispatch = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Confirm Ledger Dispatch to ${name.toUpperCase()}:`);
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

      if (error) alert(`Vault Rejection: ${error.message}`);
      else await fetchLedgerData(); // Refresh ledger sums
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* LEDGER STATUS HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Database size={12} /> Ledger-Verified State
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Nodes</h1>
          </div>
          <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Total System Float</span>
            <span className="text-3xl font-black text-[#10b981] italic">
              KES {Math.floor(staff.reduce((acc, s) => acc + (s.balance || 0), 0)).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="lg:col-span-12 bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-[9px] font-black uppercase text-slate-600 italic tracking-widest">
              <tr>
                <th className="p-10">Node ID</th>
                <th className="p-10 text-center">Computed Balance</th>
                <th className="p-10 text-right">Liquidity Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Monitor size={20} /></div>
                      <span className="font-black uppercase italic text-xl tracking-tight">{s.username}</span>
                    </div>
                  </td>
                  <td className="p-10 text-center font-black italic text-[#10b981] text-2xl">
                    KES {Math.floor(s.balance || 0).toLocaleString()}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OperatorLayout>
  );
}

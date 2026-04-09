import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import { Send, Loader2, Database } from 'lucide-react';

export default function AgentFunding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: c } = await supabase.from('profiles').select('*').eq('parent_id', user.id).eq('role', 'cashier');
    setProfile(p);
    setCashiers(c || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDispatch = async () => {
    const val = Math.trunc(Number(amount));
    if (!targetId || val <= 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: profile.id,
        p_receiver_id: targetId,
        p_amount: val
      });
      if (error) throw error;
      setAmount('');
      setTargetId('');
      alert("TERMINAL FUNDED");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
      fetchData();
    }
  };

  return (
    <AgentLayout profile={profile}>
      <div className="p-8 max-w-4xl mx-auto space-y-10">
        <header className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter">Dispatch</h1>
            <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mt-2 italic">Push Liquidity to Terminals</p>
          </div>
          <div className="text-right">
             <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Available to Send</span>
             <span className="text-4xl font-black text-green-500 italic tracking-tighter">KES {parseFloat(profile?.balance || 0).toLocaleString()}</span>
          </div>
        </header>

        <div className="bg-[#111926] p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Select Target Cashier</label>
            <select 
              className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-blue-500 transition-all"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
            >
              <option value="">Choose Terminal Node...</option>
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>{c.username.toUpperCase()} (Bal: {parseFloat(c.balance || 0).toLocaleString()})</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Amount to Dispatch (KES)</label>
            <input 
              type="number"
              placeholder="0"
              className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-5xl font-black text-blue-500 outline-none"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <button 
            onClick={handleDispatch}
            disabled={isProcessing || !targetId || !amount}
            className="w-full bg-blue-600 text-white font-black py-7 rounded-2xl hover:bg-white hover:text-black transition-all italic text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={16} />}
            {isProcessing ? 'Updating Network...' : 'Confirm Node Funding'}
          </button>
        </div>
      </div>
    </AgentLayout>
  );
}

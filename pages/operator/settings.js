import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';

export default function OperatorSettings() {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState({
    cashier_selection_limit: 20,
    lock_stake: true,
    min_stake: 10,
    max_payout: 500000
  });

  // Fetch initial operator profile data
  useEffect(() => {
    async function loadProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          setUser(profile);
          setConfig({
            cashier_selection_limit: profile.cashier_selection_limit || 20,
            lock_stake: profile.lock_stake ?? true,
            min_stake: profile.min_stake || 10,
            max_payout: profile.max_payout || 500000
          });
        }
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Apply these settings to all profiles belonging to this Operator's tenant
      const { error } = await supabase
        .from('profiles')
        .update({ 
          cashier_selection_limit: config.cashier_selection_limit,
          lock_stake: config.lock_stake,
          min_stake: config.min_stake,
          max_payout: config.max_payout
        })
        .eq('tenant_id', user.tenant_id);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save Error:", err.message);
      alert("Failed to sync settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Settings className="text-[#10b981]" size={32} />
              Terminal <span className="text-slate-700">Control</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Shop Policy & Risk Configuration</p>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 shadow-2xl
              ${saveSuccess ? 'bg-[#10b981] text-black' : 'bg-[#111926] border border-white/5 hover:bg-white/5 text-white'}`}
          >
            {loading ? <Zap size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saveSuccess ? "Settings Applied" : "Save Configuration"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Slip Restrictions */}
          <section className="bg-[#111926] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <Sliders className="text-[#10b981]" size={20} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Betting Logic</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block mb-4">Max Selections Per Ticket</label>
                <div className="grid grid-cols-3 gap-3">
                  {[10, 13, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setConfig({...config, cashier_selection_limit: num})}
                      className={`py-4 rounded-2xl font-black italic transition-all border ${config.cashier_selection_limit === num ? 'bg-[#10b981] text-black border-[#10b981]' : 'bg-black/20 text-white border-white/5 hover:border-white/20'}`}
                    >
                      {num} <span className="text-[8px] uppercase not-italic opacity-60">Games</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block mb-4">Minimum Entry Stake</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">KSH</span>
                  <input 
                    type="number"
                    value={config.min_stake}
                    onChange={(e) => setConfig({...config, min_stake: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black italic text-white outline-none focus:border-[#10b981] transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Security & Payouts */}
          <section className="bg-[#111926] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <ShieldCheck className="text-rose-500" size={20} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Liability & Security</h2>
            </div>

            <div className="space-y-6">
              <div 
                onClick={() => setConfig({...config, lock_stake: !config.lock_stake})}
                className={`flex items-center justify-between p-6 rounded-3xl border cursor-pointer transition-all ${config.lock_stake ? 'bg-[#10b981]/5 border-[#10b981]/20' : 'bg-black/20 border-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${config.lock_stake ? 'bg-[#10b981] text-black' : 'bg-slate-800 text-slate-500'}`}>
                    {config.lock_stake ? <Lock size={18} /> : <Unlock size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic">Stake Lock</h4>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Enforce customer-originated stakes</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-all ${config.lock_stake ? 'bg-[#10b981]' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.lock_stake ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block mb-4">Maximum Liability Per Ticket</label>
                <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">KSH</span>
                   <input 
                    type="number"
                    value={config.max_payout}
                    onChange={(e) => setConfig({...config, max_payout: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black italic text-rose-500 outline-none focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Warning Footer */}
        <div className="bg-[#10b981]/5 border border-[#10b981]/10 p-6 rounded-3xl flex items-center gap-4">
          <AlertTriangle className="text-[#10b981]" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]/80">
            Note: Changes will propagate to all cashier terminals connected to your operator ID immediately.
          </p>
        </div>

      </div>
    </OperatorLayout>
  );
}

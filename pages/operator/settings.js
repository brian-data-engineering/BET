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
  Target
} from 'lucide-react';

export default function OperatorSettings() {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState({
    cashier_selection_limit: 20,
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
      // Sync these settings to all profiles in this Operator's tenant
      const { error } = await supabase
        .from('profiles')
        .update({ 
          cashier_selection_limit: config.cashier_selection_limit,
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
      <div className="p-8 max-w-5xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Settings className="text-[#10b981]" size={32} />
              Terminal <span className="text-slate-700">Control</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Risk & Selection Policy</p>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 shadow-2xl
              ${saveSuccess ? 'bg-[#10b981] text-black' : 'bg-[#111926] border border-white/5 hover:bg-white/5 text-white'}`}
          >
            {loading ? <Zap size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saveSuccess ? "Policy Applied" : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Game Selection Limit (Range Slider) */}
          <section className="bg-[#111926] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <Target className="text-[#10b981]" size={20} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Game Constraints</h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-6">
                  <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block">Selection Limit</label>
                  <span className="text-4xl font-black italic text-[#10b981] leading-none">
                    {config.cashier_selection_limit} <span className="text-xs uppercase not-italic text-slate-600">Events</span>
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="5"
                  max="20"
                  value={config.cashier_selection_limit}
                  onChange={(e) => setConfig({...config, cashier_selection_limit: parseInt(e.target.value)})}
                  className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                />
                
                <div className="flex justify-between mt-4 text-[10px] font-black text-slate-700 uppercase italic">
                  <span>Min: 5</span>
                  <span>Max: 20</span>
                </div>
              </div>
            </div>
          </section>

          {/* Maximum Payout Section */}
          <section className="bg-[#111926] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <ShieldCheck className="text-rose-500" size={20} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Financial Liability</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest block mb-4">Max Payout Per Ticket</label>
                <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">KSH</span>
                   <input 
                    type="number"
                    value={config.max_payout}
                    onChange={(e) => setConfig({...config, max_payout: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black italic text-rose-500 outline-none focus:border-rose-500 transition-all"
                  />
                </div>
                <p className="text-[8px] text-slate-600 font-bold uppercase mt-4">Calculated potential winnings cannot exceed this value.</p>
              </div>
            </div>
          </section>

        </div>

        {/* Warning Footer */}
        <div className="bg-[#10b981]/5 border border-[#10b981]/10 p-6 rounded-3xl flex items-center gap-4">
          <AlertTriangle className="text-[#10b981]" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]/80">
            System Note: Updates are instantaneous across all active Lucra terminals.
          </p>
        </div>

      </div>
    </OperatorLayout>
  );
}

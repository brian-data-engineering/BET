import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path based on your structure
import { Settings, Save, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';

export default function OperatorSettings({ user }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    cashier_selection_limit: 20,
    lock_stake: true,
    min_stake: 10,
    max_payout: 500000
  });

  // Load current settings from the Operator's profile
  useEffect(() => {
    if (user) {
      setSettings({
        cashier_selection_limit: user.cashier_selection_limit || 20,
        lock_stake: user.lock_stake ?? true,
        min_stake: user.min_stake || 10,
        max_payout: user.max_payout || 500000
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);

    // Update the profile of the Operator AND all their Cashiers
    // This ensures the limit applies across the whole shop/tenant
    const { error } = await supabase
      .from('profiles')
      .update({ 
        cashier_selection_limit: settings.cashier_selection_limit,
        lock_stake: settings.lock_stake,
        min_stake: settings.min_stake,
        max_payout: settings.max_payout
      })
      .eq('tenant_id', user.tenant_id);

    if (error) {
      alert("Error updating settings: " + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-yellow-500/10 rounded-2xl">
          <Settings className="text-yellow-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Shop Settings</h1>
          <p className="text-slate-500 text-sm">Configure limits and rules for your cashiers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Betting Limits Section */}
        <div className="bg-[#1c2636] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Sliders size={20} />
            <h2 className="font-bold uppercase text-sm tracking-wider">Betting Constraints</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                Max Selections (Games per Ticket)
              </label>
              <select 
                value={settings.cashier_selection_limit}
                onChange={(e) => setSettings({...settings, cashier_selection_limit: parseInt(e.target.value)})}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-yellow-500 transition-all"
              >
                <option value={10}>10 Games</option>
                <option value={13}>13 Games</option>
                <option value={15}>15 Games</option>
                <option value={20}>20 Games (Standard)</option>
                <option value={30}>30 Games (Max)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                Minimum Stake (KSh)
              </label>
              <input 
                type="number"
                value={settings.min_stake}
                onChange={(e) => setSettings({...settings, min_stake: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-yellow-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Security / Risk Section */}
        <div className="bg-[#1c2636] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShieldAlert size={20} />
            <h2 className="font-bold uppercase text-sm tracking-wider">Risk Management</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
              <div>
                <p className="text-white font-bold text-sm">Lock Booking Stake</p>
                <p className="text-[10px] text-slate-500 uppercase">Prevent cashiers from editing customer stake</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, lock_stake: !settings.lock_stake})}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.lock_stake ? 'bg-yellow-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.lock_stake ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                Max Potential Payout (KSh)
              </label>
              <input 
                type="number"
                value={settings.max_payout}
                onChange={(e) => setSettings({...settings, max_payout: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-yellow-500 transition-all"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-tighter transition-all active:scale-95
            ${success ? 'bg-green-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-xl shadow-yellow-500/10'}`}
        >
          {loading ? (
            <span className="animate-pulse">Saving...</span>
          ) : success ? (
            <><CheckCircle2 size={20} /> Updated Successfully</>
          ) : (
            <><Save size={20} /> Save Configuration</>
          )}
        </button>
      </div>
    </div>
  );
}

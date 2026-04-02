import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, UserCheck, AlertCircle, Zap, ShieldAlert } from 'lucide-react';

export default function OperatorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Initial Auth Check
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      // 2. Immediate Role Verification (The "Anti-Sneak" Guard)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      const allowedRoles = ['operator', 'cashier', 'admin', 'super_admin'];
      
      if (profileError || !allowedRoles.includes(profile?.role)) {
        // KILL SESSION IMMEDIATELY if role is wrong
        await supabase.auth.signOut();
        throw new Error("ACCESS DENIED: Credentials lack Operator clearance.");
      }

      // SUCCESS: Route to the encrypted dashboard
      router.push('/operator/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#10b981]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#111926] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative z-10">
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-[#10b981]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#10b981]/20 shadow-lg shadow-[#10b981]/5">
              <Zap className="text-[#10b981]" size={40} />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white">Lucra<span className="text-[#10b981]">Node</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] italic">Operator Terminal Access</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 animate-shake">
              <ShieldAlert className="text-red-500 shrink-0" size={20} />
              <p className="text-[11px] font-black uppercase italic text-red-500 leading-tight tracking-wider">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 italic tracking-widest">Node Identity (Email)</label>
              <input 
                type="email" 
                placeholder="staff_auth@lucra.bet" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold text-white placeholder:text-white/10" 
                onChange={e => setEmail(e.target.value)} 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 italic tracking-widest">Encryption Key (Password)</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold text-white placeholder:text-white/10" 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white transition-all active:scale-[0.98] shadow-xl shadow-[#10b981]/10 flex items-center justify-center gap-3 italic uppercase text-xs tracking-[0.2em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={16} />
                Initialize Session
              </>
            )}
          </button>
        </form>
      </div>

      {/* Security Footer */}
      <div className="absolute bottom-10 text-center w-full">
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.5em] italic">
          Authorized Personnel Only // Encrypted by Lucra Core v2.0
        </p>
      </div>
    </div>
  );
}

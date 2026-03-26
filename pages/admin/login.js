import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setErrorMsg("Account profile not found.");
      setLoading(false);
      return;
    }

    const allowedRoles = ['super_admin', 'operator', 'cashier'];
    
    if (allowedRoles.includes(profile.role)) {
      router.push('/admin/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("Access Denied: Unauthorized Personnel.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#111926] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#10b981]/10 blur-[80px] rounded-full" />
        
        <form onSubmit={handleLogin} className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#10b981]/20">
              <ShieldCheck className="text-[#10b981]" size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">Lucra Terminal</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Secure Access Required</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-xs font-bold text-red-400 leading-tight">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black uppercase ml-1 italic">Identity Email</label>
              <input 
                type="email" 
                placeholder="operator@lucra.bet" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-medium text-white" 
                onChange={e => setEmail(e.target.value)} 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-black uppercase ml-1 italic">Access Key</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-medium text-white" 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl hover:bg-white transition-all active:scale-[0.98] shadow-lg shadow-[#10b981]/5 flex items-center justify-center gap-2 group italic uppercase"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} className="fill-current" />
                INITIATE ACCESS
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

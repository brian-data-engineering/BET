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

    // 1. Authenticate with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // 2. Fetch the role from your custom profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      // Success: Proceed to dashboard
      router.push('/admin/dashboard');
    } else {
      // Failure: Log them out and show error
      await supabase.auth.signOut();
      setErrorMsg("Unauthorized: This terminal is for Admin personnel only.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-gray-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-lucra-green/10 blur-[80px] rounded-full" />
        
        <form onSubmit={handleLogin} className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-lucra-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-lucra-green/20">
              <ShieldCheck className="text-lucra-green" size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Lucra Admin</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Secure Access Required</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 animate-shake">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-xs font-bold text-red-400 leading-tight">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Administrator Email</label>
              <input 
                type="email" 
                placeholder="admin@lucra.bet" 
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl outline-none focus:border-lucra-green transition-all text-sm font-medium" 
                onChange={e => setEmail(e.target.value)} 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Access Key</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl outline-none focus:border-lucra-green transition-all text-sm font-medium" 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-lucra-green text-black font-black py-5 rounded-2xl hover:bg-white transition-all active:scale-[0.98] shadow-lg shadow-lucra-green/5 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} className="fill-current" />
                LOGIN TO TERMINAL
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

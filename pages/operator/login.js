import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, UserCheck, AlertCircle } from 'lucide-react';

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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !['operator', 'cashier', 'admin', 'super_admin'].includes(profile?.role)) {
      await supabase.auth.signOut();
      setErrorMsg("Access Denied: Operator Clearance Required.");
      setLoading(false);
      return;
    }

    // SUCCESS: Send to the Operator Dashboard
    router.push('/operator/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
        
        {/* Subtle background glow - Blue for Operator */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full" />
        
        <form onSubmit={handleLogin} className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <UserCheck className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900">Operator Desk</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Staff Identity Required</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-xs font-bold text-red-600 leading-tight">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-black uppercase ml-1 italic">Staff Email</label>
              <input 
                type="email" 
                placeholder="staff@lucra.bet" 
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300" 
                onChange={e => setEmail(e.target.value)} 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-black uppercase ml-1 italic">Access Key</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300" 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 italic uppercase"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} className="fill-current" />
                Open Terminal
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

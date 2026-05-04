import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Ticket, Lock, AlertCircle, ShieldCheck, User } from 'lucide-react';

export default function CashierLogin() {
  const [username, setUsername] = useState(''); // Changed from email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // LOGIC: Convert simple username to the internal "Ghost Email"
    const internalEmail = `${username.toLowerCase().trim()}@lucra.internal`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email: internalEmail, 
      password 
    });

    if (authError) {
      // Custom error for terminal vibe
      setErrorMsg("INVALID IDENTITY: Credentials rejected by Lucra Protocol.");
      setLoading(false);
      return;
    }

    /** * ROLE VERIFICATION
     */
    const role = data?.user?.user_metadata?.role;
    const authorizedRoles = ['cashier', 'super_admin', 'operator'];

    if (authorizedRoles.includes(role)) {
      router.push('/cashier/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("PROTOCOL ERROR: Access Denied. Lacks Terminal Authorization.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#10b981]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <div className="bg-[#111926] border border-white/5 rounded-[3rem] p-10 shadow-2xl">
          {/* Logo Section */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#10b981]/20">
              <Ticket className="text-black" size={32} />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Lucra Terminal</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2 italic">Authentication Protocol</p>
          </div>

          {/* Error Display */}
          {errorMsg && (
            <div className="mb-8 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-red-200/80 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Input (Ghost Logic) */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 italic tracking-widest">Operator Username</label>
              <div className="relative">
                <input 
                  type="text" // Changed from email
                  placeholder="e.g. brayo" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold placeholder:text-slate-800" 
                  value={username}
                  onChange={e => setUsername(e.target.value)} 
                  required
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 italic tracking-widest">Access Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  autoComplete="current-password"
                  placeholder="••••••••" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold placeholder:text-slate-800" 
                  value={password}
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading} 
              className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-3 italic disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  <span className="text-sm uppercase tracking-widest">Initialize Terminal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

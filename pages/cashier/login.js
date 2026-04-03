import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Ticket, Lock, AlertCircle, ShieldCheck, Cpu } from 'lucide-react';

export default function CashierLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Initial Authentication
    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email: email.toLowerCase().trim(), // Ensure clean email formatting
      password 
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    /** * ROLE VERIFICATION
     * We check user_metadata because that is where the 'role' is stored 
     * during the Admin/Operator provisioning process.
     */
    const role = data?.user?.user_metadata?.role;

    const authorizedRoles = ['cashier', 'super_admin', 'operator'];

    if (authorizedRoles.includes(role)) {
      router.push('/cashier/dashboard');
    } else {
      // Clean up the session if the role is unauthorized
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
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Lucra Terminal</h1>
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
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 italic tracking-widest">Operator Identity</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="id@lucra.network" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold" 
                  onChange={e => setEmail(e.target.value)} 
                  required
                />
                <Cpu className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
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
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold" 
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

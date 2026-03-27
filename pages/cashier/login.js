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

    // 1. Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // 2. Identify Role from Metadata
    const user = data?.user;
    const role = user?.app_metadata?.role;

    // Allow both Cashiers and Admins to access the terminal
    if (role === 'cashier' || role === 'super_admin' || role === 'operator') {
      router.push('/cashier/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("PROTOCOL ERROR: Your credentials lack Terminal Authorization.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans">
      {/* Background Decorative Element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#10b981]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <div className="bg-[#111926] border border-white/5 rounded-[3rem] p-10 shadow-2xl backdrop-blur-sm">
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#10b981]/20 rotate-3 group-hover:rotate-0 transition-transform">
              <Ticket className="text-black" size={32} />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter italic">Lucra Terminal</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2 italic">Authentication Protocol</p>
          </div>

          {errorMsg && (
            <div className="mb-8 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-red-500 uppercase italic">System Alert</span>
                <p className="text-xs font-bold text-red-200/80 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 italic tracking-widest">Operator Identity</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="ID@LUCRA.NETWORK" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold uppercase placeholder:text-slate-800" 
                  onChange={e => setEmail(e.target.value)} 
                  required
                />
                <Cpu className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4 italic tracking-widest">Access Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-bold placeholder:text-slate-800" 
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-3 mt-4 italic shadow-xl shadow-[#10b981]/10 disabled:opacity-30"
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

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
             <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.5em] italic">
               SECURED BY LUCRA ENCRYPTION MESH
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

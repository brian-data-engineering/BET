import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, ShieldCheck, AlertCircle, User } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function AdminLogin() {
  const [username, setUsername] = useState(''); // Unified username state
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // GHOST LOGIC: Bridge admin username to internal domain
      const internalEmail = `${username.toLowerCase().trim()}@lucra.internal`;

      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: internalEmail, 
        password 
      });

      if (authError) throw authError;

      // 2. Fetch profile to check authorization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Terminal link failed. Admin profile not detected.");
      }

      // 3. ALLOWED ROLES CHECK
      // Super admins and admins have access here
      const authorizedRoles = ['super_admin', 'admin'];
      
      if (authorizedRoles.includes(profile.role)) {
        router.push('/admin/dashboard');
      } else {
        await supabase.auth.signOut();
        throw new Error("Access Denied: High-Level Clearance Required.");
      }

    } catch (err) {
      setErrorMsg("ENGINE ERROR: " + err.message);
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#111926] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#10b981]/10 blur-[80px] rounded-full" />
          
          <form onSubmit={handleLogin} className="relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#10b981]/20">
                <ShieldCheck className="text-[#10b981]" size={32} />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">Lucra Engine Room</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Developer Access Only</p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs font-bold text-red-400 leading-tight">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 italic">Admin Identity</label>
                <div className="relative">
                  <input 
                    type="text" // Changed from email
                    placeholder="e.g. superadmin" 
                    className="w-full bg-[#0b0f1a] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-medium text-white placeholder:text-white/5" 
                    onChange={e => setUsername(e.target.value)} 
                    required
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" size={16} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 italic">Master Key</label>
                <input 
                  type="password" 
                  autoComplete="current-password"
                  placeholder="••••••••" 
                  className="w-full bg-[#0b0f1a] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#10b981] transition-all text-sm font-medium text-white placeholder:text-white/5" 
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              type="submit"
              className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl hover:bg-white transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 italic uppercase disabled:opacity-50"
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
    </AdminLayout>
  );
}

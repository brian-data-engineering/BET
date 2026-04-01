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

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // Fetch role from profiles
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // STRICT CHECK: Only Super Admins allowed in the Engine Room
    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("Access Denied: High-Level Clearance Required.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6">
      {/* ... Your UI Code (Lucra Terminal Design) ... */}
      {/* Change "Lucra Terminal" to "Lucra Engine Room" in the H1 */}
    </div>
  );
}

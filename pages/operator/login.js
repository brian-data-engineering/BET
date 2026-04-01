import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { User, ShieldCheck, AlertCircle } from 'lucide-react';

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

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // STAFF CHECK: Operators and Admins can see the cashier desk
    if (['operator', 'cashier', 'super_admin', 'admin'].includes(profile?.role)) {
      router.push('/operator/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("Unauthorized: This terminal is for staff only.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6">
       {/* Use a lighter version of your UI here so it looks like a clean desk */}
       <h1 className="text-2xl font-black italic text-slate-900">Operator Desk</h1>
       {/* ... rest of your beautiful UI code ... */}
    </div>
  );
}

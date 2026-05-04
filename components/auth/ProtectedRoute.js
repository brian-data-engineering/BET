import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      // 1. No User? Go to Login
      if (error || !user) {
        if (router.pathname !== '/admin/login') router.push('/admin/login');
        return;
      }

      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;

      // 2. Role Check
      const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(userRole);

      if (!hasAccess) {
        // Only redirect if they are actually in the wrong place
        const homePath = userRole === 'super_admin' ? '/admin/dashboard' : '/operator/dashboard';
        
        if (router.pathname !== homePath) {
          router.push(homePath);
        } else {
          setAuthorized(true);
        }
        return;
      }

      // 3. Success
      setAuthorized(true);
    };

    checkUser();
  }, [router.pathname, allowedRoles, router]);

  // Loading State
  if (!authorized) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verifying Credentials...</span>
        </div>
      </div>
    );
  }

  return children;
}

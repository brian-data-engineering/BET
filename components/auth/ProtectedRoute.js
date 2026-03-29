import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        if (router.pathname !== '/admin/login') {
          router.push('/admin/login');
        }
        return;
      }

      // Check both metadata locations
      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        const homePath = userRole === 'super_admin' ? '/admin/dashboard' : '/operator/dashboard';
        
        // ONLY redirect if we aren't already there
        if (router.pathname !== homePath) {
          router.push(homePath);
        } else {
          // If we are already on the homePath but the role check failed, 
          // we should probably allow it or show a specific "Unauthorized" state
          setAuthorized(true); 
        }
        return;
      }

      setAuthorized(true);
    };

    checkUser();
  }, [router.pathname, allowedRoles]); // Added router.pathname to dependencies

  if (!authorized) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">
            Authenticating Node...
          </span>
        </div>
      </div>
    );
  }

  return children;
}

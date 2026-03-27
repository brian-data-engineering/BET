import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // No session? Back to the only login page we have
        router.push('/admin/login');
        return;
      }

      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;

      // If allowedRoles is empty, any logged-in user can see it
      // Otherwise, check if their role is in the allowed list
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        // Wrong role? Send them to THEIR dashboard
        const homePath = userRole === 'super_admin' ? '/admin/dashboard' : '/operator/dashboard';
        router.push(homePath);
        return;
      }

      setAuthorized(true);
    };

    checkUser();
  }, [router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

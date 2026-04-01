import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import OperatorSidebar from './OperatorSidebar';

export default function OperatorLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkOperator = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role || user?.user_metadata?.role;

      // Allow Operators AND Admins to see the Cashier Desk
      const isStaff = ['operator', 'cashier', 'admin', 'super_admin'].includes(role);

      if (!user || !isStaff) {
        router.push('/operator/login');
      } else {
        setAuthorized(true);
      }
    };
    checkOperator();
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <OperatorSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

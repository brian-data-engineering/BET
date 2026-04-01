import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role || user?.user_metadata?.role;

      // Only let Admins in. Everyone else gets kicked to Admin Login.
      if (!user || (role !== 'admin' && role !== 'super_admin')) {
        router.push('/admin/login');
      } else {
        setAuthorized(true);
      }
    };
    checkAdmin();
  }, [router]);

  if (!authorized) return null; // Or your "Verifying..." spinner

  return (
    <div className="flex min-h-screen bg-[#0b0f1a] text-white font-sans">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

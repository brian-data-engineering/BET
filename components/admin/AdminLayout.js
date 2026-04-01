import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      // 1. If we are literally ON the login page, don't protect it!
      if (router.pathname === '/admin/login') {
        setLoading(false);
        setAuthorized(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        await supabase.auth.signOut();
        router.push('/admin/login');
      } else {
        setAuthorized(true);
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  // While checking the database, show nothing or a small spinner
  if (loading && router.pathname !== '/admin/login') {
    return <div className="h-screen bg-[#0b0f1a]" />; 
  }

  // If we are on the login page, just show the login form (no sidebar)
  if (router.pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Otherwise, show the full Admin Dashboard with Sidebar
  return (
    <div className="flex min-h-screen bg-[#0b0f1a] text-white">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

// We create a Context so all Admin pages can access the LIVE profile/balance
export const AdminContext = createContext();

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let channel;

    const checkAdminAndSubscribe = async () => {
      // 1. Skip protection for login page
      if (router.pathname === '/admin/login') {
        setLoading(false);
        setAuthorized(true);
        return;
      }

      // 2. Strict Auth Check
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        handleSecureSignOut();
        return;
      }

      // 3. Role Validation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*') // Get everything: balance, role, username
        .eq('id', user.id)
        .single();

      if (profileError || !['admin', 'super_admin'].includes(profileData?.role)) {
        console.error("Unauthorized access attempt");
        handleSecureSignOut();
        return;
      }

      // 4. Set Initial State
      setProfile(profileData);
      setAuthorized(true);
      setLoading(false);

      // 5. REALTIME OBJECTIVE: Listen for balance/role changes
      channel = supabase
        .channel(`admin-live-profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log("Admin Profile Synced Realtime");
            setProfile(payload.new);
          }
        )
        .subscribe();
    };

    checkAdminAndSubscribe();

    // Cleanup subscription on unmount or route change
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  // STALENESS-FREE OBJECTIVE: Hard Reset on Sign Out
  const handleSecureSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthorized(false);
    // Force a full reload to clear all React state/cache
    window.location.href = '/admin/login';
  };

  if (loading && router.pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse">
          Authenticating Lucra Session...
        </div>
      </div>
    );
  }

  if (router.pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminContext.Provider value={{ profile, handleSecureSignOut }}>
      <div className="flex min-h-screen bg-[#0b0f1a] text-white">
        {/* Pass the live profile to the sidebar so the balance there is also realtime */}
        <AdminSidebar profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {authorized && children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

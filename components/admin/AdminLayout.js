import { useEffect, useState, createContext, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

// 1. Initialize with a default object to prevent destructuring errors
export const AdminContext = createContext({
  profile: null,
  handleSecureSignOut: () => {}
});

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  // STALENESS-FREE: Define signout early so it can be passed to the provider
  const handleSecureSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthorized(false);
    // Force a full reload to nukes all cached React state
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  };

  useEffect(() => {
    let channel;

    const checkAdminAndSubscribe = async () => {
      // Skip check for login page
      if (router.pathname === '/admin/login') {
        setLoading(false);
        setAuthorized(true);
        return;
      }

      // Strict Auth Check
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        handleSecureSignOut();
        return;
      }

      // Role Validation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !['admin', 'super_admin'].includes(profileData?.role)) {
        console.error("Access Denied: Invalid Role");
        handleSecureSignOut();
        return;
      }

      setProfile(profileData);
      setAuthorized(true);
      setLoading(false);

      // REALTIME: Sync balance and role changes instantly
      channel = supabase
        .channel(`admin-live-profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log("Admin Profile Synced");
            setProfile(payload.new);
          }
        )
        .subscribe();
    };

    checkAdminAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router.pathname]); // Listen to path changes specifically

  // Memoize the value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ 
    profile, 
    handleSecureSignOut 
  }), [profile]);

  // Loading Screen (prevents flash of unauthorized content)
  if (loading && router.pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-1 bg-emerald-500/20 overflow-hidden rounded-full">
          <div className="w-full h-full bg-emerald-500 animate-[loading_1.5s_infinite_ease-in-out]" />
        </div>
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">
          Securing Session
        </div>
      </div>
    );
  }

  // Login Page View
  if (router.pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-[#0b0f1a] text-white">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto relative">
          {/* Only render children if authorized */}
          {authorized && children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

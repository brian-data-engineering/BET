import { useEffect, useState, createContext, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

export const AdminContext = createContext({
  profile: null,
  handleSecureSignOut: () => {}
});

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  const handleSecureSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  };

  useEffect(() => {
    let channel;

    const checkAuth = async () => {
      // 1. Bypass check for login page
      if (router.pathname === '/admin/login') {
        setLoading(false);
        return;
      }

      // 2. Get Authenticated User
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        handleSecureSignOut();
        return;
      }

      // 3. Fetch Profile Row
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Layout Auth Error:", profileError?.message);
        setLoading(false); 
        return; 
      }

      // 4. Set State & Stop Loading
      setProfile(profileData);
      setLoading(false);

      // 5. Realtime Profile Sync (Balance updates, etc)
      channel = supabase
        .channel(`live-profile-${user.id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${user.id}` 
        }, (payload) => {
          setProfile(payload.new);
        }).subscribe();
    };

    checkAuth();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [router.pathname]);

  const contextValue = useMemo(() => ({ profile, handleSecureSignOut }), [profile]);

  // Loading Screen for Auth Check
  if (loading && router.pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse">
          Securing Lucra Session...
        </div>
      </div>
    );
  }

  // Login page doesn't get the Sidebar/Provider wrapper
  if (router.pathname === '/admin/login') return <>{children}</>;

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-[#0b0f1a] text-white font-sans">
        <AdminSidebar profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {/* Ensure children only render if profile exists to prevent build crashes */}
          {profile ? children : (
            <div className="p-20 text-center text-slate-800 font-black uppercase italic">
              Terminal Unauthorized
            </div>
          )}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

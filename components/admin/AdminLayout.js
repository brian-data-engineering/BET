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
      if (router.pathname === '/admin/login') {
        setLoading(false);
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        handleSecureSignOut();
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Layout Error:", profileError?.message);
        setLoading(false); 
        return; 
      }

      setProfile(profileData);
      setLoading(false);

      // Realtime Sync
      channel = supabase
        .channel(`live-profile-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, 
          (payload) => setProfile(payload.new)
        ).subscribe();
    };

    checkAuth();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [router.pathname]);

  const contextValue = useMemo(() => ({ profile, handleSecureSignOut }), [profile]);

  // Prevent "Flash of Content" or "Stuck Spinner"
  if (loading && router.pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse">
          Authenticating Lucra Session...
        </div>
      </div>
    );
  }

  if (router.pathname === '/admin/login') return <>{children}</>;

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-[#0b0f1a] text-white">
        <AdminSidebar profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {/* Only render children if profile exists */}
          {profile ? children : (
            <div className="p-20 text-center text-slate-700 font-black uppercase italic">
              Access Denied: Terminal Unauthorized
            </div>
          )}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

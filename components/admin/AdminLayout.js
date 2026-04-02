import { useEffect, useState, createContext, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

export const AdminContext = createContext({
  profile: null,
  handleSecureSignOut: () => {}
});

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  const handleSecureSignOut = async () => {
    console.log("LAYOUT DEBUG: Executing Secure Sign Out...");
    await supabase.auth.signOut();
    setProfile(null);
    setAuthorized(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  };

  useEffect(() => {
    let channel;

    const checkAdminAndSubscribe = async () => {
      console.log("LAYOUT DEBUG: Init Auth Check for path:", router.pathname);

      if (router.pathname === '/admin/login') {
        console.log("LAYOUT DEBUG: On Login Page. Bypassing protection.");
        setLoading(false);
        setAuthorized(true);
        return;
      }

      // 1. Check Supabase Auth Session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("LAYOUT DEBUG: No Auth User found. Redirecting to login.", authError);
        handleSecureSignOut();
        return;
      }

      console.log("LAYOUT DEBUG: Auth User found ID:", user.id);

      // 2. Check Profiles Table (The likely failure point)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("LAYOUT DEBUG: Database Fetch Error:", profileError.message);
        console.log("LAYOUT DEBUG: Check if RLS is enabled or if user exists in 'profiles' table.");
        // If there's an error fetching the profile, we can't authorize
        setLoading(false); // Stop the spinner so we can see errors
        return; 
      }

      if (!profileData) {
        console.error("LAYOUT DEBUG: No profile found in DB for this Auth ID.");
        handleSecureSignOut();
        return;
      }

      console.log("LAYOUT DEBUG: Profile loaded successfully. Role:", profileData.role);

      setProfile(profileData);
      setAuthorized(true);
      setLoading(false);

      // 3. Subscription
      channel = supabase
        .channel(`admin-live-profile-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, 
          (payload) => {
            console.log("LAYOUT DEBUG: Realtime Profile Update Received:", payload.new);
            setProfile(payload.new);
          }
        ).subscribe();
    };

    checkAdminAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router.pathname]);

  const contextValue = useMemo(() => ({ profile, handleSecureSignOut }), [profile]);

  // Loading Screen
  if (loading && router.pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse">
          Securing Session...
        </div>
        <p className="text-slate-500 text-[9px] italic">Checking Layout Debug Logs...</p>
      </div>
    );
  }

  if (router.pathname === '/admin/login') return <>{children}</>;

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-[#0b0f1a] text-white">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {authorized ? children : (
            <div className="p-20 text-center text-red-500 font-black uppercase italic">
              Authorization Failed: Invalid Role or Missing Profile
            </div>
          )}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

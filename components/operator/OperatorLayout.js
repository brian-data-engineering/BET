import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import OperatorSidebar from './OperatorSidebar';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function OperatorLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Kill staleness with a Live Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthorized(false);
        router.push('/operator/login');
      }
    });

    const checkSecurity = async () => {
      try {
        // ALWAYS fetch fresh user data, never trust local storage
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/operator/login');
          return;
        }

        // Deep-check the role from both metadata sources
        const role = user.app_metadata?.role || user.user_metadata?.role;
        const allowedRoles = ['operator', 'cashier', 'admin', 'super_admin'];

        if (!allowedRoles.includes(role)) {
          console.error("SECURITY BREACH: Unauthorized role attempt.");
          router.push('/operator/login');
        } else {
          setAuthorized(true);
        }
      } catch (err) {
        router.push('/operator/login');
      } finally {
        setLoading(false);
      }
    };

    checkSecurity();

    return () => {
      subscription.unsubscribe(); // Cleanup the listener
    };
  }, [router]);

  // Prevent "Sneak Peeks" during the auth check
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0b0f1a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="text-[#10b981] animate-spin" size={40} />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Encrypting Session...</span>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-[#0b0f1a] text-white font-sans selection:bg-[#10b981] selection:text-black">
      {/* Sidebar gets the user context to ensure it only shows relevant links */}
      <OperatorSidebar />
      
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle security overlay texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
        
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}

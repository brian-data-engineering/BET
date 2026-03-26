import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';
import OperatorSidebar from './OperatorSidebar'; // You'll create this next

export default function AdminLayout({ children }) {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Check metadata badge first (fastest)
      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
      setRole(userRole);
    };
    getUserRole();
  }, []);

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* 🚀 THE FIX: Switch sidebars based on the role */}
      {role === 'operator' ? (
        <OperatorSidebar /> 
      ) : (
        <AdminSidebar />
      )}
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', username: '' });

  const fetchStaff = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('*')
      .eq('parent_id', user.id).eq('role', 'cashier');
    setStaff(data || []);
  };

  const handleHire = async (e) => {
    e.preventDefault();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { username: form.username, role: 'cashier', parent_id: admin.id } }
    });

    if (!error) {
      alert("Terminal Activated!");
      fetchStaff();
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  return (
    <AdminLayout>
       {/* Use the UI structure from your previous ManageOperatorStaff component here */}
       {/* Just ensure the SignUp options data role is 'cashier' */}
    </AdminLayout>
  );
}

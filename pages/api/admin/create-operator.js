// pages/api/admin/create-operator.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Initialize a "Super Admin" client using the Service Role Key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, adminId } = req.body;

  // 2. Use the Admin API to create the user
  // This bypasses email confirmation and DOES NOT log you out
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Automatically confirms the account
    user_metadata: { 
      username: username, 
      role: 'operator', 
      parent_id: adminId 
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Operator Node Provisioned', user: data.user });
}

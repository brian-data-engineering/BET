import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, operatorId } = req.body;

  if (!email || !password || !operatorId) {
    return res.status(400).json({ error: "Missing node parameters" });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      username: username, 
      role: 'cashier', 
      parent_id: operatorId // Tied to the Operator who created them
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ message: 'Terminal Node Active', user: data.user });
}

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, parentId, tenantId } = req.body;

  try {
    // 1. Auth Creation (Internal domain)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'cashier', tenant_id: tenantId }
    });

    if (authError) throw authError;

    // 2. Profile Creation
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      {
        id: authUser.user.id,
        username: username,
        display_name: displayName,
        role: 'cashier',
        parent_id: parentId,
        tenant_id: tenantId,
        balance: 0
      }
    ]);

    if (profileError) throw profileError;

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

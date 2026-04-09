import { createClient } from '@supabase/supabase-js';

// Initialize admin client with SERVICE ROLE KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, agentId, tenantId, logoUrl } = req.body;

  try {
    // 1. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'shop', tenant_id: tenantId }
    });

    if (authError) throw authError;

    // 2. Create the profile in the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authUser.user.id,
          username: username,
          display_name: displayName,
          role: 'shop',
          parent_id: agentId,
          tenant_id: tenantId,
          logo_url: logoUrl,
          balance: 0
        }
      ]);

    if (profileError) throw profileError;

    return res.status(200).json({ success: true, userId: authUser.user.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

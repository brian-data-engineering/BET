import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, parentId, tenantId } = req.body;

  // 1. HIERARCHY GUARD: Stop immediately if the chain is broken
  if (!parentId || !tenantId) {
    return res.status(400).json({ error: "PROVISIONING FAILED: Parent Node or Tenant context missing." });
  }

  const cleanUsername = username.toLowerCase().trim();

  try {
    // 2. PRE-FLIGHT CHECK: Check Profiles first to avoid 'profiles_pkey' violation later
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: `TERMINAL ID "${cleanUsername}" ALREADY IN USE.` });
    }

    // 3. AUTH CREATION
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'cashier', tenant_id: tenantId }
    });

    if (authError) throw authError;

    // 4. PROFILE CREATION
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      {
        id: authUser.user.id,
        username: cleanUsername,
        display_name: displayName,
        role: 'cashier',
        parent_id: parentId, // Links to Shop
        tenant_id: tenantId,
        balance: 0
      }
    ]);

    // 5. ATOMIC CLEANUP: If Profile fails (e.g. DB constraint), kill the Auth user
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

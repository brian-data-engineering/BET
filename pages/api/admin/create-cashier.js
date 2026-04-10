import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, parentId, tenantId } = req.body;

  // CRITICAL: Ensure we don't proceed if the hierarchy link is missing
  if (!parentId) {
    return res.status(400).json({ error: "PROVISIONING ERROR: Parent Node ID is missing." });
  }

  try {
    // 1. PRE-FLIGHT CHECK: Check if username already exists in profiles
    // This prevents the "Half-Created" state where Auth succeeds but Profile fails
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: `CONFLICT: Username "${username}" is already taken.` });
    }

    // 2. AUTH CREATION
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'cashier', tenant_id: tenantId }
    });

    if (authError) throw authError;

    // 3. PROFILE CREATION
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      {
        id: authUser.user.id,
        username: username.toLowerCase().trim(),
        display_name: displayName,
        role: 'cashier',
        parent_id: parentId, // The essential link in the Lucra chain
        tenant_id: tenantId,
        balance: 0
      }
    ]);

    // 4. ATOMIC CLEANUP: If Profile fails, delete the Auth user so they aren't stuck in limbo
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, parentId, tenantId } = req.body;
  const cleanUsername = username.toLowerCase().trim();

  if (!parentId || !tenantId) {
    return res.status(400).json({ error: "Context Missing (Parent/Tenant)" });
  }

  try {
    // 1. PRE-FLIGHT: Check if username is taken in Profiles
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: "Terminal ID already in use." });

    // 2. Auth Creation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'cashier', username: cleanUsername }
    });

    if (authError) throw authError;
    const newUser = authData.user;

    // 3. Provision via UPDATE (Cue from Operator script)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: cleanUsername,
        display_name: displayName,
        role: 'cashier',
        parent_id: parentId, 
        tenant_id: tenantId, 
        balance: 0
      })
      .eq('id', newUser.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'CASHIER NODE ACTIVE' });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, role, parentId, tenantId, logoUrl } = req.body;
  const cleanUsername = username.toLowerCase().trim();

  try {
    // 1. PRE-FLIGHT: Check if username exists globally
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: "Username already in use." });

    // 2. Auth Creation (Ghost Email logic preserved)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: { role, username: cleanUsername }
    });

    if (authError) throw authError;
    const newUser = authData.user;

    // 3. Provision Profile
    // We strictly use the role passed (shop or cashier)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role, 
        username: cleanUsername,
        display_name: displayName,
        tenant_id: tenantId, // Inherited from Agent (The Operator's ID)
        parent_id: parentId, // Could be the Agent ID (for Shop) or Shop ID (for Cashier)
        logo_url: logoUrl,
        balance: 0 
      })
      .eq('id', newUser.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw profileError;
    }

    return res.status(200).json({ 
      success: true, 
      message: `${role.toUpperCase()} PROVISIONED`,
      id: newUser.id 
    });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

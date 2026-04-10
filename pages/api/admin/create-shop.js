import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, agentId, displayName, tenantId, logoUrl } = req.body;
  const cleanUsername = username.toLowerCase().trim();

  try {
    // 1. PRE-FLIGHT
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: "Shop username already in use." });

    // 2. Auth Creation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'shop', username: cleanUsername }
    });

    if (authError) throw authError;
    const newShop = authData.user;

    // 3. Provision via UPDATE (Inheriting Agent's Tenant ID)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'shop',
        username: cleanUsername,
        display_name: displayName,
        tenant_id: tenantId, // The Operator's ID inherited from Agent
        parent_id: agentId,  // The Agent's ID
        logo_url: logoUrl,
        balance: 0 
      })
      .eq('id', newShop.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newShop.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'SHOP PROVISIONED' });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

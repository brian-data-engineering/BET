import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, agentId, displayName, tenantId, logoUrl } = req.body;

  try {
    // 1. Create the Shop Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'shop',
        username: username 
      }
    });

    if (authError) throw authError;
    const newShop = authData.user;

    // 2. Provision Shop Profile
    // tenant_id = the Agent's tenant_id (linking them to the same brand)
    // parent_id = the Agent's specific ID
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'shop',
        username: username,
        display_name: displayName,
        tenant_id: tenantId, 
        parent_id: agentId,  
        logo_url: logoUrl,
        balance: 0 
      })
      .eq('id', newShop.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newShop.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'SHOP PROVISIONED', id: newShop.id });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

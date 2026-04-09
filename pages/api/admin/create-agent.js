import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, operatorId, tenantId, logoUrl } = req.body;

  try {
    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'agent', username }
    });

    if (authError) throw authError;

    // 2. Provision the Agent Profile (Inheriting Operator Brand)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'agent',
        username: username,
        display_name: displayName || username,
        tenant_id: tenantId,    // Inherited from Operator
        parent_id: operatorId,  // Linked to creating Operator
        logo_url: logoUrl,      // Inherited from Operator
        balance: 0 
      })
      .eq('id', authData.user.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'AGENT ACTIVATED' });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

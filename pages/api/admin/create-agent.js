// pages/api/admin/create-agent.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, displayName, operatorId, tenantId, logoUrl } = req.body;

  try {
    // 1. Create Auth Account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'agent', username }
    });

    if (authError) throw authError;

    // 2. Initialize Agent Profile with Inheritance
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'agent',
        username: username,
        display_name: displayName,
        tenant_id: tenantId,    // Inherited from Operator
        parent_id: operatorId,  // Linked to Operator
        logo_url: logoUrl,      // Inherited from Operator
        balance: 0
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

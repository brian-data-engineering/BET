import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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

    // 2. Provision the Profile using UPSERT
    // This merges your API data with whatever the trigger created
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: username,
        role: 'agent',
        display_name: displayName || username,
        tenant_id: tenantId,    // Inherited from testoperator
        parent_id: operatorId,  // Linked to testoperator
        logo_url: logoUrl,      // Inherited brand
        balance: 0
      }, { onConflict: 'id' });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, role, parentId, tenantId, logoUrl } = req.body;

  try {
    // 1. Mandatory Metadata Check
    if (!tenantId || !role) throw new Error("Missing Network Context");

    // 2. Auth Provisioning
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, username, tenantId }
    });

    if (authError) throw authError;

    // 3. Profile Sync (Locked to Operator's Tenant)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role,
        username: username.toLowerCase().trim(),
        display_name: displayName,
        tenant_id: tenantId,  // Stays locked to the Brand
        parent_id: parentId,  // The immediate supervisor
        logo_url: logoUrl,    // Brand Identity inheritance
        balance: 0 
      })
      .eq('id', authData.user.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: `${role.toUpperCase()} DEPLOYED` });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

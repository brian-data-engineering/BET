import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, displayName, operatorId, tenantId, logoUrl } = req.body;

  // Debug: Log the incoming data to Vercel Logs
  console.log("Provisioning Agent:", { username, tenantId, operatorId });

  try {
    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'agent', username }
    });

    if (authError) throw authError;

    // 2. Use UPSERT to handle the profile
    // This bypasses issues if a trigger already created a partial row
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: username,
        role: 'agent',
        display_name: displayName || username,
        tenant_id: tenantId,    // Must not be null
        parent_id: operatorId,  // Must not be null
        logo_url: logoUrl,
        balance: 0,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' }); // Ensures we target the right row

    if (profileError) {
      // Rollback Auth user if profile setup fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Initialize Admin Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, operatorId, tenantId, logoUrl } = req.body;

  // 2. Safety Check: Ensure the hierarchy DNA exists
  if (!tenantId || !operatorId) {
    return res.status(400).json({ error: "Missing hierarchy data: tenantId or operatorId is null." });
  }

  try {
    // 3. Create Auth Account
    // We send username in metadata to satisfy the DB Trigger: handle_new_user()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'agent', 
        username: username.trim() 
      }
    });

    if (authError) throw authError;

    // 4. Update the Profile row created by the trigger
    // Using upsert ensures we don't get "duplicate key" errors from the trigger
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: username.trim(),
        role: 'agent',
        display_name: displayName || username,
        tenant_id: tenantId,    // Inherited (Root ID)
        parent_id: operatorId,  // Link to Creator
        logo_url: logoUrl,      // Brand Image
        balance: 0
      }, { onConflict: 'id' });

    if (profileError) {
      // Rollback: Clean up Auth if DB write fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'Agent Active' });
  } catch (error) {
    console.error("Provisioning Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

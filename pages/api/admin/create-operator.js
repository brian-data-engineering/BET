import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Initialize Supabase Admin (Bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, username, adminId, displayName, logoUrl } = req.body;

  try {
    // 2. Create the User in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        role: 'operator',
        username: username 
      }
    });

    if (authError) throw authError;

    const newUser = authData.user;

    // 3. Provision the Profile 
    // CRITICAL: For Operators, tenant_id = their own ID (New Root)
    // parent_id = your Super Admin ID
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'operator',
        username: username,
        display_name: displayName,
        tenant_id: newUser.id, // They start their own brand chain
        parent_id: adminId,    // Linked to the Super Admin who created them
        logo_url: logoUrl,
        balance: 0 
      })
      .eq('id', newUser.id);

    if (profileError) {
      // Cleanup: If profile fails, remove the auth user to prevent "ghost" accounts
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw profileError;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'OPERATOR PROVISIONED', 
      id: newUser.id 
    });

  } catch (error) {
    console.error("Provisioning Fatal Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

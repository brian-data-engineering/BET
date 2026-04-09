import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Initialize with Service Role Key to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, adminId, displayName, logoUrl } = req.body;

  // CRITICAL VALIDATION: Ensure the logo exists before proceeding
  if (!logoUrl) {
    return res.status(400).json({ error: "Operator Logo URL is mandatory for hierarchy branding." });
  }

  const targetRole = 'operator';

  // 1. Provision the User in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, 
    user_metadata: { 
      username: username, 
      role: targetRole, 
      parent_id: adminId,
      display_name: displayName || username,
      logo_url: logoUrl // Storing in metadata for frontend accessibility on session load
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const newUser = data.user;

  /**
   * 2. TENANT INITIALIZATION
   * For Operators, they are the Root. tenant_id = their own user ID.
   */
  const finalTenantId = newUser.id;

  // 3. Update the profile with Tenant ID, Role, and the Crucial Logo
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      tenant_id: finalTenantId,
      role: targetRole,
      display_name: displayName || username,
      logo_url: logoUrl // The pasted link
    })
    .eq('id', newUser.id);

  if (profileError) {
    return res.status(201).json({ 
      warning: "Auth account created, but profile data sync failed.",
      error: profileError.message,
      user: newUser 
    });
  }

  return res.status(200).json({ 
    message: 'OPERATOR NODE ACTIVATED', 
    user: newUser,
    tenant_id: finalTenantId,
    logo_url: logoUrl
  });
}

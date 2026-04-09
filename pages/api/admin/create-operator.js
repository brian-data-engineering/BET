import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Initialize with Service Role Key to bypass RLS and Auth restrictions
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, adminId, displayName } = req.body;

  // 1. Force the role to 'operator' for this specific endpoint
  const targetRole = 'operator';

  // 2. Provision the User in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, 
    user_metadata: { 
      username: username, 
      role: targetRole, 
      parent_id: adminId, // The Super Admin's ID
      display_name: displayName || username
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const newUser = data.user;

  /**
   * 3. TENANT INITIALIZATION
   * For Operators, the tenant_id IS their own user ID.
   * This marks them as the 'Root' of their own brand/network.
   */
  const finalTenantId = newUser.id;

  // 4. Update the profile with the Tenant ID
  // We use a small delay or a retry if your DB trigger is slow, 
  // but typically 'update' works immediately after createUser.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      tenant_id: finalTenantId,
      role: targetRole // Ensuring the profile role matches the auth role
    })
    .eq('id', newUser.id);

  if (profileError) {
    // If the profile update fails, we return a 201 because the user WAS created,
    // but warn about the profile sync issue.
    return res.status(201).json({ 
      warning: "Auth account created, but profile tenant linking failed.",
      error: profileError.message,
      user: newUser 
    });
  }

  return res.status(200).json({ 
    message: 'OPERATOR NODE ACTIVATED', 
    user: newUser,
    tenant_id: finalTenantId
  });
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email, password, username, adminId, role, tenantId, displayName, shopName } = req.body;

  // 1. Determine the Role (Default to operator if not specified)
  const targetRole = role || 'operator';

  // 2. Provision the User in Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, 
    user_metadata: { 
      username: username, 
      role: targetRole, 
      parent_id: adminId,
      display_name: displayName || username,
      shop_name: shopName || null
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  const newUser = data.user;

  // 3. TENANT INITIALIZATION LOGIC
  // If it's a new Operator, they ARE the tenant (tenant_id = their own id)
  // If it's anyone else, they inherit the tenant_id passed from the form
  const finalTenantId = targetRole === 'operator' ? newUser.id : tenantId;

  // 4. Update the profile with the Tenant ID
  // (Since the profile is usually created via a trigger, we update it here)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ tenant_id: finalTenantId })
    .eq('id', newUser.id);

  if (profileError) {
    return res.status(500).json({ error: "Auth created, but Tenant Link failed: " + profileError.message });
  }

  return res.status(200).json({ 
    message: `${targetRole.toUpperCase()} Node Provisioned`, 
    user: newUser,
    tenant_id: finalTenantId
  });
}

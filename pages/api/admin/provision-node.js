import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    email, 
    password, 
    username, 
    displayName, 
    logoUrl, 
    role, // 'operator' | 'agent' | 'shop' | 'cashier'
    parentId, 
    tenantId 
  } = req.body;

  try {
    // 1. VALIDATION: Ensure we aren't creating orphans
    if (!role || !parentId) {
      throw new Error("Missing Chain Metadata: Role and ParentID are required.");
    }

    // 2. AUTH PROVISIONING
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role, username }
    });

    if (authError) throw authError;
    const newUser = authData.user;

    // 3. THE LUCRA HIERARCHY LOGIC
    // - If Operator: tenant_id is THEIR OWN ID (Root of a new brand)
    // - If Agent/Shop/Cashier: tenant_id is INHERITED from the chosen Operator
    const finalTenantId = role === 'operator' ? newUser.id : tenantId;

    if (!finalTenantId && role !== 'operator') {
      throw new Error("Downline nodes must inherit a Tenant ID.");
    }

    // 4. PROFILE SYNCHRONIZATION
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role,
        username: username.toLowerCase().trim(),
        display_name: displayName,
        tenant_id: finalTenantId, 
        parent_id: parentId, 
        logo_url: logoUrl,
        balance: 0 
      })
      .eq('id', newUser.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw profileError;
    }

    return res.status(200).json({ 
      success: true, 
      message: `${role.toUpperCase()} PROVISIONED`, 
      id: newUser.id,
      chain: { parentId, tenantId: finalTenantId }
    });

  } catch (error) {
    console.error("Lucra Provisioning Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

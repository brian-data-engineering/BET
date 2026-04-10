import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, username, displayName, parentId, tenantId } = req.body;

  // 1. Guard the Chain
  if (!parentId || !tenantId) {
    return res.status(400).json({ error: "Context Missing (Parent/Tenant)" });
  }

  try {
    // 2. Auth Creation (Same as your working Operator script)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'cashier', username }
    });

    if (authError) throw authError;
    const newUser = authData.user;

    // 3. Provision via UPDATE (Matching your Operator script logic)
    // This works whether or not a trigger created the row already.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username.toLowerCase().trim(),
        display_name: displayName,
        role: 'cashier',
        parent_id: parentId, // Linked to the Shop Manager
        tenant_id: tenantId, // Linked to the Agent's brand
        balance: 0
      })
      .eq('id', newUser.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw profileError;
    }

    return res.status(200).json({ success: true, message: 'CASHIER NODE ACTIVE' });

  } catch (error) {
    console.error("Provisioning Fatal Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

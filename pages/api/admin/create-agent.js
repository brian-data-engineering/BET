import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Initialize with Service Role Key to bypass RLS for admin actions
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { 
    email, 
    password, 
    username, 
    operatorId,  // The ID of the Operator creating the Agent
    tenantId,    // The Operator's Tenant ID (Passed from frontend)
    logoUrl,     // The Operator's Logo URL (Passed from frontend)
    displayName 
  } = req.body;

  // Validation: Ensure the Agent is being linked to an existing brand
  if (!tenantId || !logoUrl) {
    return res.status(400).json({ 
      error: "Inheritance Failure: Agent must receive Tenant ID and Logo from the Operator." 
    });
  }

  const targetRole = 'agent';

  // 1. Provision the Agent in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, 
    user_metadata: { 
      username: username, 
      role: targetRole, 
      parent_id: operatorId, // Links Agent to specific Operator
      tenant_id: tenantId,   // Inherited Brand ID
      logo_url: logoUrl,     // Inherited Brand Logo
      display_name: displayName || username
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const newUser = data.user;

  /**
   * 2. SYNC TO PROFILES TABLE
   * Unlike Operators (who are roots), Agents are leaf nodes.
   * They use the operator's tenant_id and parent_id.
   */
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      tenant_id: tenantId,   // Link to the Operator's network
      parent_id: operatorId, // Direct hierarchy link
      role: targetRole,
      display_name: displayName || username,
      logo_url: logoUrl,      // Ensure brand consistency
      balance: 0             // Agents start with zero liquidity
    })
    .eq('id', newUser.id);

  if (profileError) {
    return res.status(201).json({ 
      warning: "Auth account created, but profile sync failed.",
      error: profileError.message,
      user: newUser 
    });
  }

  return res.status(200).json({ 
    message: 'AGENT NODE PROVISIONED', 
    user: newUser,
    parent_id: operatorId,
    tenant_id: tenantId
  });
}

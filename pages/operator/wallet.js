import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';

export default function ShopWallet() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');

  const handleTransfer = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // RPC call to a custom function to handle the math safely
    const { error } = await supabase.rpc('transfer_float', {
      sender_id: user.id,
      receiver_id: targetId,
      amount: parseFloat(amount)
    });

    if (error) alert(error.message);
    else alert("Float Transferred Successfully!");
  };

  return (
    <AdminLayout>
      <div className="p-8 text-white">
        <h2 className="text-xl font-black uppercase italic">Distribute Float</h2>
        {/* Simple form to select cashier and enter amount */}
      </div>
    </AdminLayout>
  );
}

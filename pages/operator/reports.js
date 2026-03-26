import AdminLayout from '../../components/admin/AdminLayout';

export default function ShopReports() {
  return (
    <AdminLayout>
      <div className="p-8 text-white space-y-4">
        <h1 className="text-2xl font-black uppercase italic">Financial Reports</h1>
        <div className="bg-[#111926] p-10 rounded-[2rem] border border-white/5 text-center">
          <p className="text-slate-500 font-bold uppercase text-xs">Analytics for this terminal will appear here after the first bet is placed.</p>
        </div>
      </div>
    </AdminLayout>
  );
}

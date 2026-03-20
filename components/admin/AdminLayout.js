import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

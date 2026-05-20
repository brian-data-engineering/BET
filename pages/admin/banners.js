import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Plus, 
  Trash2, 
  Save, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Hash, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function BannerManagementPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBanner, setNewBanner] = useState({
    image_url: '',
    target_url: '',
    display_order: 1,
    is_active: true
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error("Error fetching banners:", err);
      alert("Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
    } catch (err) {
      console.error("Error toggling banner status:", err);
      alert("Failed to update status");
    }
  };

  const handleUpdateBanner = async (banner) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('banners')
        .update({
          image_url: banner.image_url,
          target_url: banner.target_url,
          display_order: banner.display_order
        })
        .eq('id', banner.id);

      if (error) throw error;
      alert("Banner updated successfully");
    } catch (err) {
      console.error("Error updating banner:", err);
      alert("Failed to update banner");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .insert([newBanner])
        .select();

      if (error) throw error;
      
      setBanners(prev => [...prev, data[0]].sort((a, b) => a.display_order - b.display_order));
      setNewBanner({
        image_url: '',
        target_url: '',
        display_order: 1,
        is_active: true
      });
      setShowAddForm(false);
      alert("Banner added successfully");
    } catch (err) {
      console.error("Error adding banner:", err);
      alert("Failed to add banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBanners(prev => prev.filter(b => b.id !== id));
      alert("Banner deleted");
    } catch (err) {
      console.error("Error deleting banner:", err);
      alert("Failed to delete banner");
    }
  };

  const handleInputChange = (id, field, value) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 bg-[#0b0f1a] min-h-screen text-white space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 md:pt-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon size={14} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Visual Content Layer</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-white leading-none">Banner Manager</h1>
          </div>

          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#10b981] text-black px-6 py-4 md:py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest hover:bg-[#059669] transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)]"
          >
            {showAddForm ? <XCircle size={18} /> : <Plus size={18} />}
            {showAddForm ? 'Cancel' : 'Add New Banner'}
          </button>
        </div>

        {/* Add Banner Form */}
        {showAddForm && (
          <div className="bg-[#111926] border border-[#10b981]/30 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg md:text-xl font-black italic uppercase mb-6 flex items-center gap-2">
              <Plus size={20} className="text-[#10b981]" />
              Provision New Banner
            </h2>
            <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    required
                    type="url" 
                    value={newBanner.image_url}
                    onChange={(e) => setNewBanner({...newBanner, image_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs font-bold focus:border-[#10b981] outline-none transition-all placeholder:opacity-30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">Target URL (Optional)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="url" 
                    value={newBanner.target_url}
                    onChange={(e) => setNewBanner({...newBanner, target_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs font-bold focus:border-[#10b981] outline-none transition-all placeholder:opacity-30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">Display Order</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    required
                    type="number" 
                    value={newBanner.display_order}
                    onChange={(e) => setNewBanner({...newBanner, display_order: parseInt(e.target.value)})}
                    className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs font-bold focus:border-[#10b981] outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button 
                  disabled={saving}
                  type="submit"
                  className="w-full bg-[#10b981] text-black h-[50px] md:h-[46px] rounded-xl font-black uppercase italic text-xs tracking-widest hover:bg-[#059669] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Execute Deployment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banners Grid */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Syncing Banners...</div>
          ) : banners.length === 0 ? (
            <div className="py-20 text-center italic font-black text-slate-800 uppercase tracking-widest border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[3rem]">
              No Banners Registered
            </div>
          ) : (
            banners.map((banner) => (
              <div key={banner.id} className={`bg-[#111926] border ${banner.is_active ? 'border-[#10b981]/20' : 'border-rose-500/20'} p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] flex flex-col lg:flex-row gap-6 md:gap-8 transition-all hover:bg-[#131d2d]`}>
                
                {/* Preview */}
                <div className="w-full lg:w-64 h-40 md:h-36 rounded-2xl overflow-hidden bg-black border border-white/5 relative group shrink-0">
                  <img 
                    src={banner.image_url} 
                    alt="Banner Preview" 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
                  />
                  {!banner.is_active && (
                    <div className="absolute inset-0 bg-rose-500/20 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-black/80 text-rose-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-rose-500/30">Inactive</span>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase italic">Image Endpoint</label>
                    <input 
                      type="text" 
                      value={banner.image_url}
                      onChange={(e) => handleInputChange(banner.id, 'image_url', e.target.value)}
                      className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-2 px-4 text-[11px] font-bold focus:border-[#10b981] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase italic">Target Destination</label>
                    <input 
                      type="text" 
                      value={banner.target_url || ''}
                      onChange={(e) => handleInputChange(banner.id, 'target_url', e.target.value)}
                      className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-2 px-4 text-[11px] font-bold focus:border-[#10b981] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase italic">Priority Order</label>
                    <input 
                      type="number" 
                      value={banner.display_order}
                      onChange={(e) => handleInputChange(banner.id, 'display_order', parseInt(e.target.value))}
                      className="w-full bg-[#0b0f1a] border border-white/5 rounded-xl py-2 px-4 text-[11px] font-bold focus:border-[#10b981] outline-none md:w-24"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 md:pt-4">
                     <button 
                       onClick={() => handleUpdateBanner(banner)}
                       disabled={saving}
                       className="flex-1 bg-white/5 hover:bg-[#10b981] hover:text-black text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                     >
                       <Save size={14} /> Commit Changes
                     </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center justify-center gap-3 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 md:pt-6 lg:pt-0 lg:pl-8">
                  <button 
                    onClick={() => handleToggleActive(banner.id, banner.is_active)}
                    title={banner.is_active ? "Deactivate" : "Activate"}
                    className={`flex-1 lg:flex-none h-14 md:h-12 w-full lg:w-12 rounded-xl flex items-center justify-center transition-all ${banner.is_active ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                  >
                    {banner.is_active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    <span className="lg:hidden ml-2 font-black uppercase text-[10px]">{banner.is_active ? 'Active' : 'Inactive'}</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="flex-1 lg:flex-none h-14 md:h-12 w-full lg:w-12 rounded-xl flex items-center justify-center bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 size={20} />
                    <span className="lg:hidden ml-2 font-black uppercase text-[10px]">Delete</span>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="bg-[#10b981]/5 border border-[#10b981]/10 p-5 md:p-6 rounded-[2rem] flex items-start gap-4">
          <AlertCircle className="text-[#10b981] shrink-0" size={20} />
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase italic text-[#10b981]">Banner System Protocol</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Banners are prioritized by their <span className="text-slate-300 italic">Priority Order</span> (lowest numbers first). 
              Changes are immediate across all nodes. Ensure image endpoints use HTTPS.
            </p>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [mounted, setMounted] = useState(false); // Prevents Hydration Error

  useEffect(() => {
    setMounted(true); // Tells React we are now on the client side
    async function getBanners() {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error("Supabase Error:", error.message);
      } else {
        setBanners(data || []);
      }
    }
    getBanners();
  }, []);

  // Don't render anything until the component has mounted on the client
  if (!mounted || banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden pt-4 bg-[#0b0f1a]">
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory no-scrollbar">
        {banners.map((banner) => (
          <div 
            key={banner.id} 
            className="min-w-[85%] md:min-w-[45%] snap-center shrink-0"
          >
            <a 
              href={banner.target_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block h-32 rounded-2xl bg-cover bg-center shadow-lg border border-white/5 overflow-hidden"
              style={{ 
                backgroundImage: `url('${banner.image_url}')`,
                backgroundColor: '#1c2636'
              }}
            >
              <div className="w-full h-full" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

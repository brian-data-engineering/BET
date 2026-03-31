import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    async function getBanners() {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) setBanners(data);
    }
    getBanners();
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-[#0b0f1a]">
      {/* Reduced height to h-20 and made it full width */}
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full">
        {banners.map((banner) => (
          <a 
            key={banner.id}
            href={banner.target_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full h-20 md:h-24 snap-center shrink-0 border-x border-white/5 transition-opacity hover:opacity-90"
            style={{ 
              backgroundImage: `url('${banner.image_url}')`,
              backgroundSize: 'cover', // Use 'cover' to fill the width
              backgroundPosition: 'center',
              backgroundColor: '#1c2636'
            }}
          >
            {/* Subtle overlay for depth */}
            <div className="w-full h-full bg-gradient-to-r from-black/40 via-transparent to-black/40" />
          </a>
        ))}
      </div>
    </div>
  );
}

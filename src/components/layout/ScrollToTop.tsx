/**
 * Scroll To Top component (layout)
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';

export function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable browser scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Cleanup on unmount (optional, but good practice)
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Target ALL potential scroll containers
      const targets = [
        window,
        document.documentElement,
        document.body,
        document.getElementById('root')
      ];

      targets.forEach(target => {
        if (!target) return;
        
        if (target === window) {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant' as any
          });
        } else {
          (target as HTMLElement).scrollTop = 0;
        }
      });
      
      logger.info(`[ScrollToTop] Reset triggered for: ${pathname}`);
    };

    // 1. Immediate reset
    handleScroll();

        const frame1 = requestAnimationFrame(handleScroll);
    
        const timer = setTimeout(handleScroll, 100);
    const timer2 = setTimeout(handleScroll, 500); // Fail-safe for slow loading content

    return () => {
      cancelAnimationFrame(frame1);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [pathname]);

  return null;
}

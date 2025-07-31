import { Link, LinkProps } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface PreloadableLinkProps extends LinkProps {
  preload?: () => Promise<any>;
  children: React.ReactNode;
}

// Map of route paths to their lazy import functions
const routePreloaders: Record<string, () => Promise<any>> = {
  '/events': () => import('@/pages/Events'),
  '/magazine': () => import('@/pages/Magazine'),
  '/classes': () => import('@/pages/Classes'),
  '/community': () => import('@/pages/Community'),
  '/dashboard': () => import('@/pages/Dashboard'),
};

// Track which routes have been preloaded
const preloadedRoutes = new Set<string>();

export const PreloadableLink = ({ to, preload, children, ...props }: PreloadableLinkProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handlePreload = () => {
    const path = typeof to === 'string' ? to : to.pathname || '';
    
    // Check if we have a preloader for this route
    const routePreloader = preload || routePreloaders[path];
    
    if (routePreloader && !preloadedRoutes.has(path)) {
      // Preload after a short delay to avoid loading on accidental hovers
      preloadTimeoutRef.current = setTimeout(() => {
        routePreloader()
          .then(() => {
            preloadedRoutes.add(path);
            console.log(`✅ Preloaded route: ${path}`);
          })
          .catch((error) => {
            console.error(`❌ Failed to preload route ${path}:`, error);
          });
      }, 100); // 100ms delay
    }
  };
  
  const cancelPreload = () => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }
  };
  
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    
    // Preload on hover or focus
    link.addEventListener('mouseenter', handlePreload);
    link.addEventListener('focus', handlePreload);
    link.addEventListener('mouseleave', cancelPreload);
    link.addEventListener('blur', cancelPreload);
    
    return () => {
      link.removeEventListener('mouseenter', handlePreload);
      link.removeEventListener('focus', handlePreload);
      link.removeEventListener('mouseleave', cancelPreload);
      link.removeEventListener('blur', cancelPreload);
      cancelPreload();
    };
  }, [to]);
  
  return (
    <Link ref={linkRef} to={to} {...props}>
      {children}
    </Link>
  );
};

// Helper hook to preload routes programmatically
export const useRoutePreloader = () => {
  return {
    preloadRoute: (path: string) => {
      const preloader = routePreloaders[path];
      if (preloader && !preloadedRoutes.has(path)) {
        return preloader().then(() => {
          preloadedRoutes.add(path);
        });
      }
      return Promise.resolve();
    },
    isPreloaded: (path: string) => preloadedRoutes.has(path),
  };
};
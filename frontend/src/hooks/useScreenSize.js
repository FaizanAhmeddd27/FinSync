import { useEffect, useState } from 'react';

const breakpoints = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

export function useScreenSize() {
  const [size, setSize] = useState('md');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1536) setSize('2xl');
      else if (w >= 1280) setSize('xl');
      else if (w >= 1024) setSize('lg');
      else if (w >= 768) setSize('md');
      else if (w >= 640) setSize('sm');
      else setSize('xs');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const lessThan = (bp) => (breakpoints[size] || 0) < (breakpoints[bp] || 0);
  const greaterThan = (bp) => (breakpoints[size] || 0) > (breakpoints[bp] || 0);

  return { size, lessThan, greaterThan, isMobile: lessThan('md') };
}
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Every navigation starts the new page from the very top. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

import { useState, useEffect } from 'react';

export function useSkeleton(delay: number = 100) {
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return showSkeleton;
}
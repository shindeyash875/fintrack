import React, { useEffect, useState } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

/**
 * AnimatedCounter component rolls numbers smoothly with spring physics.
 * @param {number|string} value - The numeric value to animate to
 * @param {string} prefix - Optional currency or symbol prefix (e.g. '₹')
 * @param {number} decimals - Decimal places (default 2 for currency)
 * @param {string} className - Tailwind CSS classes
 */
export const AnimatedCounter = ({
  value = 0,
  prefix = '',
  decimals = 2,
  className = '',
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    damping: 24,
    stiffness: 120,
  });

  const [displayValue, setDisplayValue] = useState(
    prefix + numericValue.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );

  useEffect(() => {
    motionVal.set(numericValue);
  }, [numericValue, motionVal]);

  useEffect(() => {
    const unsubscribe = springVal.on('change', (latest) => {
      const isNegative = latest < 0;
      const absVal = Math.abs(latest);
      const formatted = absVal.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      setDisplayValue((isNegative ? '- ' : '') + prefix + formatted);
    });

    return () => unsubscribe();
  }, [springVal, prefix, decimals]);

  return <span className={`tabular-nums font-['Outfit'] ${className}`}>{displayValue}</span>;
};

export default AnimatedCounter;

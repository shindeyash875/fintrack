import React, { useState, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

/**
 * SpotlightCard creates the luxury Linear/Apple cursor spotlight effect.
 * When the user moves the mouse over the card, a soft glowing radial beam
 * follows the cursor, illuminating the border and frosted glass texture.
 */
export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(16, 185, 129, 0.14)',
  darkSpotlightColor = 'rgba(16, 185, 129, 0.22)',
  onClick,
  ...props
}) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const lightBackground = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;
  const darkBackground = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${darkSpotlightColor}, transparent 80%)`;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden glass-card glass-card-hover ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Light Sheen */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 dark:hidden"
        style={{
          background: lightBackground,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Dynamic Cursor Spotlight Dark Sheen */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 hidden dark:block"
        style={{
          background: darkBackground,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SpotlightCard;

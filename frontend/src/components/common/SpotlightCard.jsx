import React, { useState, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * SpotlightCard creates the luxury Linear/Apple cursor spotlight and 3D parallax tilt effect.
 * When the user moves the mouse over the card, a soft glowing radial beam
 * follows the cursor, illuminating the border and frosted glass texture,
 * while the card tilts in 3D perspective space.
 */
export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(16, 185, 129, 0.14)',
  darkSpotlightColor = 'rgba(16, 185, 129, 0.22)',
  enableTilt = true,
  onClick,
  ...props
}) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Normalized -0.5 to 0.5 for 3D tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  // Smooth springs for 3D tilt inertia
  const tiltXSpring = useSpring(tiltX, { stiffness: 260, damping: 22 });
  const tiltYSpring = useSpring(tiltY, { stiffness: 260, damping: 22 });

  const rotateX = useTransform(tiltYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(tiltXSpring, [-0.5, 0.5], ['-7deg', '7deg']);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const currentX = e.clientX - left;
    const currentY = e.clientY - top;

    mouseX.set(currentX);
    mouseY.set(currentY);

    if (enableTilt) {
      tiltX.set((currentX - width / 2) / width);
      tiltY.set((currentY - height / 2) / height);
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (enableTilt) {
      tiltX.set(0);
      tiltY.set(0);
    }
  };

  const lightBackground = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;
  const darkBackground = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${darkSpotlightColor}, transparent 80%)`;

  return (
    <div className={enableTilt ? 'perspective-1000' : ''}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: enableTilt ? rotateX : 0,
          rotateY: enableTilt ? rotateY : 0,
          transformStyle: enableTilt ? 'preserve-3d' : 'flat',
        }}
        className={`relative rounded-2xl overflow-hidden glass-card glass-card-hover transition-shadow duration-300 ${className}`}
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

        {/* Content Container with 3D child preservation */}
        <div className="relative z-10 preserve-3d">{children}</div>
      </motion.div>
    </div>
  );
};

export default SpotlightCard;


import React from 'react';

/**
 * Sparkline component renders a sleek SVG mini-chart trend.
 * @param {Array<number>} data - Array of numeric values
 * @param {string} color - Stroke color (hex or tailwind stroke)
 * @param {string} gradientId - Unique ID for SVG gradient fill
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {string} className - Additional CSS classes
 */
export const Sparkline = ({
  data = [12, 18, 15, 25, 20, 32, 28],
  color = '#10b981',
  gradientId = 'sparkline-emerald',
  width = 120,
  height = 36,
  className = '',
}) => {
  const points = Array.isArray(data) && data.length > 0 ? data : [0, 0, 0, 0, 0];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const stepX = width / Math.max(points.length - 1, 1);

  // Generate SVG path coordinates
  const coords = points.map((val, idx) => {
    const x = idx * stepX;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const pathD = coords.reduce(
    (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill under the sparkline */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Main stroked sparkline */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint pulse dot */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};

export default Sparkline;

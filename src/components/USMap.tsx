import { useState, useRef, useCallback } from 'react';
import statePathsData from '../data/us-states-paths.json';

interface StateEntry {
  name: string;
  d?: string;
  cx?: string;
  cy?: string;
  r?: string;
  type?: string;
}

const statePaths = statePathsData as Record<string, StateEntry>;

// Map state abbreviation to URL slug
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
}

// Top states get a subtle highlight (slightly brighter fill)
const TOP_STATES = new Set([
  'tx', 'fl', 'ca', 'ga', 'nc', 'ny', 'az', 'tn', 'oh', 'co',
  'nv', 'il', 'pa', 'va', 'wa', 'md', 'in', 'sc', 'mo', 'al',
]);

export default function USMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipName, setTooltipName] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent, abbr: string, name: string) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
    });
    setHovered(abbr);
    setTooltipName(name);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
  }, []);

  return (
    <div className="relative">
      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-white border border-gray-200 px-3.5 py-2 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
            animation: 'fadeIn 100ms ease-out',
          }}
        >
          <p className="text-sm font-semibold text-navy whitespace-nowrap">{tooltipName}</p>
          <p className="text-[11px] font-medium text-navy-mid whitespace-nowrap">View DSCR loans &rarr;</p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 959 593"
        className="w-full h-auto"
        role="img"
        aria-label="Interactive map of the United States showing DSCR loan coverage"
      >
        {Object.entries(statePaths).map(([abbr, state]) => {
          const isHovered = hovered === abbr;
          const isTop = TOP_STATES.has(abbr);
          const slug = toSlug(state.name);
          const href = `/states/${slug}/`;

          // Base fill colors (light context: brand-soft tints, navy hover)
          const baseFill = isTop ? '#C9D3E8' : '#E8ECF5';
          const hoverFill = '#1A2540';
          const fill = isHovered ? hoverFill : baseFill;

          // DC is a circle
          if (state.type === 'circle' && state.cx && state.cy && state.r) {
            return (
              <a key={abbr} href={href} aria-label={`${state.name} DSCR loans`}>
                <circle
                  cx={state.cx}
                  cy={state.cy}
                  r={isHovered ? '7' : state.r}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  className="cursor-pointer"
                  style={{
                    transition: 'all 200ms ease-out',
                    filter: isHovered ? 'drop-shadow(0 0 10px rgba(26,37,64,0.4))' : 'none',
                  }}
                  onMouseEnter={(e) => handleMouseMove(e as any, abbr, state.name)}
                  onMouseMove={(e) => handleMouseMove(e as any, abbr, state.name)}
                  onMouseLeave={handleMouseLeave}
                />
              </a>
            );
          }

          if (!state.d) return null;

          return (
            <a key={abbr} href={href} aria-label={`${state.name} DSCR loans`}>
              <path
                d={state.d}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeLinejoin="round"
                className="cursor-pointer"
                style={{
                  transition: 'fill 200ms ease-out, filter 200ms ease-out, transform 200ms ease-out',
                  filter: isHovered ? 'drop-shadow(0 0 10px rgba(26,37,64,0.4))' : 'none',
                  transformOrigin: 'center',
                  transformBox: 'fill-box',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                }}
                onMouseEnter={(e) => handleMouseMove(e as any, abbr, state.name)}
                onMouseMove={(e) => handleMouseMove(e as any, abbr, state.name)}
                onMouseLeave={handleMouseLeave}
              />
            </a>
          );
        })}
      </svg>
    </div>
  );
}

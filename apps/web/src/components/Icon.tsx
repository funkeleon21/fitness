import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'body'
  | 'leaf'
  | 'dumbbell'
  | 'insights'
  | 'bell'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'sparkle'
  | 'star'
  | 'moon'
  | 'sun'
  | 'footprints'
  | 'water'
  | 'muscle'
  | 'body-fat'
  | 'plus'
  | 'mic'
  | 'camera'
  | 'text'
  | 'pulse'
  | 'pattern'
  | 'lever'
  | 'check'
  | 'x'
  | 'photo-stack'
  | 'flame'
  | 'edit'
  | 'pause'
  | 'logout'
  | 'wheat'
  | 'droplet'
  | 'search'
  | 'filter'
  | 'chevrons-up-down';

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.6,
  fill = 'none',
  stroke = 'currentColor',
  style,
  className,
  title,
}: IconProps) {
  const label = title ?? name;
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    className,
    role: 'img' as const,
    'aria-label': label,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
        </svg>
      );
    case 'body':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="12" cy="5" r="2.2" />
          <path d="M9 9.2c.7 1.1 1.7 1.7 3 1.7s2.3-.6 3-1.7M8.4 21l1.2-7.6c.3-1.7 1.3-2.6 2.4-2.6s2.1.9 2.4 2.6L15.6 21" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 19c0-7 5.5-13 14-13 0 8.5-6 14-14 14M5 19c1.5-3 4-5.5 8-7" />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M3 9v6M6 7v10M9 10v4M15 10v4M18 7v10M21 9v6M9 12h6" />
        </svg>
      );
    case 'insights':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 3a7 7 0 0 0-4 12.7V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 3z" />
          <path d="M10 22h4" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M6 15V11a6 6 0 1 1 12 0v4l1.5 2.5h-15L6 15z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 9l7 7 7-7" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'arrow-up-right':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <title>{label}</title>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </svg>
      );
    case 'footprints':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M7 4c-1.5 0-2.5 1.5-2.5 3.5S5.5 11 7 11s2.5-1.5 2.5-3.5S8.5 4 7 4zM7 13c-1 0-1.8.7-2 1.7l-.4 2.3c-.2 1 .5 2 1.5 2h1.8c1 0 1.7-1 1.5-2L9 14.7c-.2-1-1-1.7-2-1.7z" />
          <path d="M17 8c-1.5 0-2.5 1.5-2.5 3.5S15.5 15 17 15s2.5-1.5 2.5-3.5S18.5 8 17 8zM17 17c-1 0-1.8.7-2 1.7l-.4 2c-.2 1 .5 1.8 1.5 1.8h1.8c1 0 1.7-.8 1.5-1.8L19 18.7c-.2-1-1-1.7-2-1.7z" />
        </svg>
      );
    case 'water':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z" />
        </svg>
      );
    case 'muscle':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 15c0-3 1.5-5 4-5 1.5 0 2.5.5 3.5 1.5s2 1.5 3.5 1.5c2 0 3 1 3 3v3H5v-4z" />
          <circle cx="11" cy="7" r="2.5" />
        </svg>
      );
    case 'body-fat':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 14.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 5-.5" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...props}>
          <title>{label}</title>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M3 8h4l2-3h6l2 3h4v11H3z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case 'text':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 6h14M5 12h14M5 18h9" />
        </svg>
      );
    case 'pulse':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </svg>
      );
    case 'pattern':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="18" cy="6" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="6" cy="18" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
          <circle cx="18" cy="18" r="1.5" />
        </svg>
      );
    case 'lever':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="6" cy="12" r="2.5" />
          <path d="M8.5 12H20M16 8l4 4-4 4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M5 12l5 5L20 6" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      );
    case 'photo-stack':
      return (
        <svg {...props}>
          <title>{label}</title>
          <rect x="3" y="6" width="14" height="14" rx="2" />
          <path d="M7 3h14v14" />
          <path d="M3 16l3.5-3.5 4 4 3-3L17 17" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7 0 2-1 3-2 3 0-3-1-5-3-7-1 4-5 6-5 11 0 4 3 7 6 7z" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <path d="M14 6l4 4" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...props}>
          <title>{label}</title>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    case 'wheat':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 22V8M12 22c-3 0-5-2-5-5 3 0 5 2 5 5zM12 22c3 0 5-2 5-5-3 0-5 2-5 5zM12 17c-3 0-5-2-5-5 3 0 5 2 5 5zM12 17c3 0 5-2 5-5-3 0-5 2-5 5zM12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5z" />
        </svg>
      );
    case 'droplet':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M12 3.5s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <title>{label}</title>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
      );
    case 'chevrons-up-down':
      return (
        <svg {...props}>
          <title>{label}</title>
          <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
        </svg>
      );
    default:
      return null;
  }
}

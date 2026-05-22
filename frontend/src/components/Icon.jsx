/**
 * Minimal inline SVG icon set. Keeping icons inline avoids shipping a
 * separate icon library and lets every glyph inherit `currentColor`.
 */

const ICONS = {
  play: (
    <path d="M5 3.5v17l14-8.5z" fill="currentColor" />
  ),
  pause: (
    <g fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </g>
  ),
  skip: (
    <path d="M5 6l8 6-8 6V6zm10 0h2v12h-2V6z" fill="currentColor" />
  ),
  rewind: (
    <path d="M19 6l-8 6 8 6V6zM7 6h2v12H7V6z" fill="currentColor" />
  ),
  send: (
    <path
      d="M3 11l18-8-8 18-2-8-8-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  upload: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4M6 10l6-6 6 6" />
      <path d="M4 20h16" />
    </g>
  ),
  users: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M21 18c0-2.2-1.8-4-4-4" />
    </g>
  ),
  arrow_left: (
    <path
      d="M14 6l-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  arrow_right: (
    <path
      d="M10 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  lock: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </g>
  ),
  plus: (
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  door: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M15 21V3H5v18" />
      <path d="M5 12h-2" />
      <path d="M19 21h2V8l-6-5" />
      <circle cx="12" cy="13" r="0.6" fill="currentColor" />
    </g>
  ),
  arrow_join: (
    <path
      d="M5 12h12M12 5l7 7-7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  settings: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </g>
  ),
  sync: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 4v6h6" />
      <path d="M20 20v-6h-6" />
      <path d="M4 10c1.5-3.5 5-6 9-6 3.5 0 6.5 1.8 8.5 4.5" />
      <path d="M20 14c-1.5 3.5-5 6-9 6-3.5 0-6.5-1.8-8.5-4.5" />
    </g>
  ),
  chat: (
    <path
      d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H10l-5 4v-4H6a2 2 0 01-2-2V5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  activity: (
    <path
      d="M3 12h4l3-9 4 18 3-9h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  copy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </g>
  ),
  check: (
    <path
      d="M4 12l5 5L20 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  exit: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 12H3" />
      <path d="M9 6l-6 6 6 6" />
      <path d="M21 5v14" />
    </g>
  ),
  sound: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 9v6h3l5 4V5L7 9H4z" />
      <path d="M16 8a5 5 0 010 8" />
    </g>
  ),
  muted: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 9v6h3l5 4V5L7 9H4z" />
      <path d="M16 8l5 8M21 8l-5 8" />
    </g>
  ),
  fullscreen: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6" />
    </g>
  ),
  cc: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M9 10c-1.2-1-3-1-4 .2-1 1.2-.6 3 .6 3.8 1 .6 2.4.4 3.4-.6" />
      <path d="M17 10c-1.2-1-3-1-4 .2-1 1.2-.6 3 .6 3.8 1 .6 2.4.4 3.4-.6" />
    </g>
  ),
  edit: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
    </g>
  ),
  crown: (
    <g fill="currentColor">
      <path d="M3 7l3 6 3-7 3 8 3-8 3 7 3-6-2 12H5L3 7z" />
    </g>
  ),
  sparkle: (
    <path
      d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z"
      fill="currentColor"
    />
  ),
};

export function Icon({ name, size = 16, className = '' }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {path}
    </svg>
  );
}

export default Icon;

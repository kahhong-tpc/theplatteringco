type IconProps = { size?: number; className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  "aria-hidden": true,
} as const;

export const MenuIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <path d="M2 5h14M2 9h14M2 13h14" />
  </svg>
);

export const SearchIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <circle cx="7.5" cy="7.5" r="5" />
    <path d="M11.2 11.2L16 16" />
  </svg>
);

export const HeartIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <path d="M9 15.5s-6-3.6-6-8A3.3 3.3 0 019 5.6a3.3 3.3 0 016 1.9c0 4.4-6 8-6 8z" />
  </svg>
);

export const UserIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <circle cx="9" cy="6" r="3" />
    <path d="M3 16c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
  </svg>
);

export const BagIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <path d="M3 6h12l-1 10H4L3 6z" />
    <path d="M6.5 6V4.5a2.5 2.5 0 015 0V6" />
  </svg>
);

export const CloseIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" className={className} {...base}>
    <path d="M4 4l10 10M14 4L4 14" />
  </svg>
);

export const ChevronRight = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} {...base}>
    <path d="M5 2l5 5-5 5" />
  </svg>
);

export const ChevronLeft = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} {...base}>
    <path d="M9 2L4 7l5 5" />
  </svg>
);

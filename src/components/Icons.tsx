import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m7 7 10 10M17 7 7 17" />
  </IconBase>
);

export const MinusIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 12h12" />
  </IconBase>
);

export const PinIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m8 4 8 0-1 5 3 3H6l3-3-1-5Z" />
    <path d="M12 12v8" />
  </IconBase>
);

export const FlipIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 7h-9a4 4 0 0 0-4 4v1" />
    <path d="m17 4 3 3-3 3M4 17h9a4 4 0 0 0 4-4v-1" />
    <path d="m7 20-3-3 3-3" />
  </IconBase>
);

export const MotionIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 14c2.5-6.5 5.5-6.5 8 0s5.5 6.5 8 0" />
    <path d="M4 9c2-3.5 4-3.5 6 0M14 9c2-3.5 4-3.5 6 0" opacity=".55" />
  </IconBase>
);

export const CameraIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-2h4.6l1.2 2h2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </IconBase>
);

export const RotateCameraIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 11a8 8 0 0 0-14.7-4.3L4 9" />
    <path d="M4 4v5h5" />
    <path d="M4 13a8 8 0 0 0 14.7 4.3L20 15" />
    <path d="M20 20v-5h-5" />
    <circle cx="12" cy="12" r="2.5" />
  </IconBase>
);

export const CopyIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </IconBase>
);

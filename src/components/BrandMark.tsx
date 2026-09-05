type BrandMarkProps = {
  className?: string;
};

/** Custom Elite Drive mark — luxury sedan silhouette */
export function BrandMark({ className = "h-full w-full" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M8 30.5c0-1.1.9-2 2-2h1.2l2.4-5.2c.8-1.7 2.5-2.8 4.4-2.8h13.8c1.9 0 3.6 1.1 4.4 2.8l2.4 5.2H38c1.1 0 2 .9 2 2v2.5c0 .8-.7 1.5-1.5 1.5h-1.2c-.8 0-1.5-.7-1.5-1.5 0-1.1-.9-2-2-2h-22c-1.1 0-2 .9-2 2 0 .8-.7 1.5-1.5 1.5H9.5C8.7 34.5 8 33.8 8 33V30.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M14.5 22.5h19l-2-4.3c-.5-1-1.5-1.7-2.7-1.7H19.2c-1.2 0-2.2.7-2.7 1.7l-2 4.3Z"
        fill="white"
        fillOpacity="0.75"
      />
      <circle cx="15.5" cy="31" r="2.8" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="1.5" />
      <circle cx="32.5" cy="31" r="2.8" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="1.5" />
      <path
        d="M24 10.5l1.8 3.2 3.6.5-2.6 2.5.6 3.6L24 18.8l-3.4 1.8.6-3.6-2.6-2.5 3.6-.5L24 10.5Z"
        fill="white"
        fillOpacity="0.9"
      />
    </svg>
  );
}

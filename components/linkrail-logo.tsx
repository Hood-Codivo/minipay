import clsx from "clsx";

export function LinkRailLogo({ className }: { className?: string }) {
  return (
    <span className={clsx("linkrail-logo", className)} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img" focusable="false">
        <path
          className="linkrail-logo-rail"
          d="M12 15.5C12 11.36 15.36 8 19.5 8H36v8H20.5C18.57 16 17 17.57 17 19.5S18.57 23 20.5 23H27.5C32.19 23 36 26.81 36 31.5S32.19 40 27.5 40H12v-8H27.5C28.33 32 29 31.33 29 30.5S28.33 29 27.5 29H20.5C15.81 29 12 25.19 12 20.5V15.5Z"
        />
        <path
          className="linkrail-logo-link"
          d="M12 32H5V24H12V32ZM43 24H36V16H43V24Z"
        />
      </svg>
    </span>
  );
}

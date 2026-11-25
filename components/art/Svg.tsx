import type { ReactNode } from "react";

/** Props every art component accepts. */
export interface ArtProps {
  /** Width and height in px (or any CSS length). Defaults to 1em so icons follow the font size. */
  size?: number | string;
  className?: string;
  /**
   * Accessible name. Leave it out for decorative art (the default): the SVG is then
   * aria-hidden. Only pass a title when the picture is the only thing carrying meaning.
   */
  title?: string;
}

/** Shared SVG wrapper: decorative (aria-hidden) unless a title is given. */
export function Svg({
  size = "1em",
  className,
  title,
  viewBox = "0 0 24 24",
  width,
  height,
  preserveAspectRatio,
  children,
}: ArtProps & { viewBox?: string; width?: number | string; height?: number | string; preserveAspectRatio?: string; children: ReactNode }) {
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const, focusable: "false" as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width ?? size}
      height={height ?? size}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      {...a11y}
    >
      {children}
    </svg>
  );
}

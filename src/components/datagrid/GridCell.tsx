"use client";

type Align = "left" | "right" | "center" | "actions";

export function GridCell({
  children,
  align = "left",
  truncate = false,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  align?: Align;
  truncate?: boolean;
}) {
  const alignClass =
    align === "right"
      ? "datagrid__cell--right"
      : align === "center"
        ? "datagrid__cell--center"
        : align === "actions"
          ? "datagrid__cell--actions"
          : "";
  const truncateClass = truncate ? "datagrid__cell--truncate" : "";
  return (
    <div
      className={`datagrid__cell ${alignClass} ${truncateClass} ${className}`.trim()}
      style={style}
      role="cell"
      {...props}
    >
      {truncate && typeof children === "string" ? (
        <span title={children}>{children}</span>
      ) : (
        children
      )}
    </div>
  );
}

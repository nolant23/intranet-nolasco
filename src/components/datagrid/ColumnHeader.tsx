"use client";

export function ColumnHeader({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div
      className={`datagrid__head-cell ${className}`.trim()}
      style={style}
      role="columnheader"
      {...props}
    >
      {children}
    </div>
  );
}

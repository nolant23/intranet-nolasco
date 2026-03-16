"use client";

export function GridRow({
  children,
  clickable = false,
  selected = false,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  clickable?: boolean;
  selected?: boolean;
}) {
  const clickableClass = clickable ? "datagrid__row--clickable" : "";
  const selectedClass = selected ? "datagrid__row--selected" : "";
  return (
    <div
      className={`datagrid__row ${clickableClass} ${selectedClass} ${className}`.trim()}
      style={style}
      role="row"
      {...props}
    >
      {children}
    </div>
  );
}

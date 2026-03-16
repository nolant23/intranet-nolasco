"use client";

export function DataGrid({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={`datagrid ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function DataGridScroll({
  children,
  maxHeight = "60vh",
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  maxHeight?: string;
}) {
  return (
    <div
      className={`datagrid__scroll ${className}`.trim()}
      style={{ maxHeight, ...style }}
      role="table"
      {...props}
    >
      {children}
    </div>
  );
}

export function DataGridHead({
  children,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div
      className={`datagrid__head ${className}`.trim()}
      style={style}
      role="row"
      {...props}
    >
      {children}
    </div>
  );
}

export function DataGridBody({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={`datagrid__body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function DataGridEmpty({ children }: { children: React.ReactNode }) {
  return <div className="datagrid__empty">{children}</div>;
}

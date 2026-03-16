"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import "./grid-table.css";

const ROW_HEIGHT = 48;

export type VirtualizedTableProps<T> = {
  items: T[];
  rowHeight?: number;
  overscan?: number;
  maxHeight?: string;
  children: (item: T, index: number) => React.ReactNode;
  /** Es: "2.4fr 1.2fr 1.2fr 1.6fr 0.8fr" – stessa stringa per head e ogni riga */
  gridTemplateColumns: string;
  header: React.ReactNode;
  className?: string;
};

export function VirtualizedTable<T>({
  items,
  rowHeight = ROW_HEIGHT,
  overscan = 5,
  maxHeight = "60vh",
  children,
  gridTemplateColumns,
  header,
  className = "",
}: VirtualizedTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const gridStyle = { gridTemplateColumns };

  return (
    <div
      ref={scrollRef}
      className={`grid-table__scroll ${className}`.trim()}
      style={{ maxHeight }}
      role="table"
      aria-rowcount={items.length + 1}
    >
      <div
        className="grid-table__head"
        style={gridStyle}
        role="row"
      >
        {header}
      </div>
      <div
        className="grid-table__body"
        style={{
          position: "relative",
          height: `${totalSize}px`,
          minHeight: 0,
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              className="grid-table__row"
              role="row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                boxSizing: "border-box",
                ...gridStyle,
              }}
            >
              {children(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Intestazione colonna: figlio diretto di header in VirtualizedTable */
export function TableTh({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div
      className={`grid-table__head-cell ${className}`.trim()}
      style={style}
      role="columnheader"
      {...props}
    >
      {children}
    </div>
  );
}

/** Cella: in className usa truncate | nowrap | right | center | actions */
export function TableTd({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const parts = className.split(/\s+/);
  const truncate = parts.includes("truncate");
  const mods = [
    parts.includes("nowrap") && "grid-table__cell--nowrap",
    parts.includes("right") && "grid-table__cell--right",
    parts.includes("center") && "grid-table__cell--center",
    parts.includes("actions") && "grid-table__cell--actions",
    truncate && "grid-table__cell--truncate",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={`grid-table__cell ${mods} ${className}`.trim()}
      style={style}
      role="cell"
      {...props}
    >
      {truncate ? (
        <span className="grid-table__cell-content">{children}</span>
      ) : (
        children
      )}
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';

/** A "tirage" lying on the table: crop marks at the corners, optional dimension lines. */
export function Print({
  children,
  className,
  dims,
  style,
  tilt = 0,
}: {
  children: ReactNode;
  className?: string;
  dims?: { w: string; h: string };
  style?: CSSProperties;
  tilt?: number;
}) {
  return (
    <div className={`print ${className ?? ''}`} style={{ ...style, ['--tilt' as string]: `${tilt}deg` }}>
      <span className="crop tl" aria-hidden />
      <span className="crop tr" aria-hidden />
      <span className="crop bl" aria-hidden />
      <span className="crop br" aria-hidden />
      {dims && (
        <>
          <span className="dim dim-w" aria-hidden>
            <i>{dims.w}</i>
          </span>
          <span className="dim dim-h" aria-hidden>
            <i>{dims.h}</i>
          </span>
        </>
      )}
      <div className="print-body">{children}</div>
    </div>
  );
}

/** Mono annotation line: "LABEL ········ VALUE". */
export function Note({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="note">
      <span>{k}</span>
      <b />
      <span>{v}</span>
    </div>
  );
}

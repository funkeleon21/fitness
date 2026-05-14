export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 460,
        margin: '0 auto',
        height: '100dvh',
        minHeight: 0,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 22px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--hairline)',
          flexShrink: 0,
        }}
      >
        <SkeletonCircle size={36} />
        <SkeletonPill width={72} />
        <SkeletonCircle size={32} />
      </div>

      <div
        style={{
          flex: 1,
          padding: '32px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <SkeletonText width="40%" height={10} />
        <SkeletonText width="70%" height={28} />
        <SkeletonText width="90%" height={14} />
        <div style={{ height: 12 }} />
        <SkeletonText width="30%" height={10} />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
      </div>

      <nav
        className="tabbar"
        aria-label="Hauptnavigation"
        aria-busy="true"
        style={{ pointerEvents: 'none', opacity: 0.5 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="tabbar-item">
            <SkeletonCircle size={22} />
            <SkeletonText width={32} height={10} />
          </div>
        ))}
      </nav>
    </div>
  );
}

function SkeletonBase({ style }: { style: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--surface-3)',
        opacity: 0.6,
        animation: 'labor-skeleton 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

function SkeletonText({ width, height }: { width: number | string; height: number }) {
  return <SkeletonBase style={{ width, height, borderRadius: 4 }} />;
}

function SkeletonBlock({ height }: { height: number }) {
  return <SkeletonBase style={{ width: '100%', height, borderRadius: 12 }} />;
}

function SkeletonCircle({ size }: { size: number }) {
  return <SkeletonBase style={{ width: size, height: size, borderRadius: '50%' }} />;
}

function SkeletonPill({ width }: { width: number }) {
  return <SkeletonBase style={{ width, height: 22, borderRadius: 999 }} />;
}

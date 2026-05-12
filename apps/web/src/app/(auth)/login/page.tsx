import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signInWithPassword } from './actions';

const DEMO_USERS = [
  { name: 'Leon', email: 'leon@demo.local', initials: 'L' },
  { name: 'Leonie', email: 'leonie@demo.local', initials: 'Le' },
];
const DEMO_PASSWORD = 'demo1234';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/');

  const params = await searchParams;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 22px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Hero greeting */}
        <div
          className="rise"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 22,
            padding: '40px 26px 32px',
            background:
              'radial-gradient(130% 100% at 100% 0%, rgba(178,188,142,0.55) 0%, rgba(178,188,142,0) 55%), linear-gradient(170deg, #E6E9D2 0%, #D9DEBF 100%)',
            border: '0.5px solid rgba(110,122,78,0.18)',
            marginBottom: 24,
          }}
        >
          <svg
            width="180"
            height="180"
            viewBox="0 0 150 150"
            style={{ position: 'absolute', right: -36, top: -28, opacity: 0.85 }}
            role="img"
            aria-label="Sage-Schmuckform"
          >
            <title>Sage</title>
            <defs>
              <radialGradient id="login-sage-g" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A6B385" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#A6B385" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#A6B385" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="75" cy="75" r="72" fill="url(#login-sage-g)" />
            <path d="M40 110c0-32 22-58 56-58 0 32-22 58-56 58z" fill="#8A9466" opacity="0.32" />
          </svg>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.55)',
                border: '0.5px solid rgba(110,122,78,0.22)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.10em',
                color: 'var(--ink-2)',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--sage-deep)',
                }}
              />
              LABOR · PERSONAL HEALTH AI
            </div>

            <h1
              className="h-display"
              style={{
                fontSize: 38,
                margin: '22px 0 0',
                lineHeight: 1.05,
                maxWidth: '92%',
              }}
            >
              Willkommen.
            </h1>
            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                color: 'var(--ink-2)',
                fontSize: 15,
                lineHeight: 1.5,
                maxWidth: '94%',
              }}
            >
              Dein persönliches Labor für{' '}
              <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Interpretation</em>,
              nicht für Tracking.
            </p>
          </div>
        </div>

        {/* Demo user buttons */}
        <div className="card rise" style={{ padding: 18, animationDelay: '80ms' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
              fontWeight: 500,
              textTransform: 'uppercase',
              padding: '0 2px 12px',
            }}
          >
            Demo-Zugang
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USERS.map((u) => (
              <form key={u.email} action={signInWithPassword}>
                <input type="hidden" name="email" value={u.email} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <button
                  type="submit"
                  className="pressable"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--surface-2)',
                    border: '0.5px solid var(--hairline)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #D8C99A 0%, #8A9466 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--sans)',
                      fontWeight: 500,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {u.initials}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 17,
                        color: 'var(--ink)',
                      }}
                    >
                      Als {u.name} anmelden
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--ink-4)',
                        marginTop: 2,
                      }}
                    >
                      {u.email}
                    </div>
                  </div>
                  <Icon name="arrow-right" size={16} strokeWidth={1.8} />
                </button>
              </form>
            ))}
          </div>

          {params.error && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(196,152,85,0.12)',
                color: 'var(--amber)',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Fehler: {params.error}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--ink-4)',
              textAlign: 'center',
            }}
          >
            PHASE 0 · LOKALE DEMO-ACCOUNTS
          </div>
        </div>
      </div>
    </main>
  );
}

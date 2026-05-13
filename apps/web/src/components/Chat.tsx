'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
  getToolOrDynamicToolName,
  isToolUIPart,
} from 'ai';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from './Icon';

const SUGGESTED: { label: string; prompt: string }[] = [
  {
    label: 'Wie deutest du meinen Gewichtstrend?',
    prompt:
      'Schau dir meine Gewichtsdaten an. Was siehst du im 7- und 14-Tage-Schnitt — eher Trend oder eher Rauschen?',
  },
  {
    label: 'Was ist Signal, was ist Rauschen?',
    prompt:
      'Wie unterscheide ich bei meinem Gewicht echte Veränderung von normalen Tages- und Wochenschwankungen?',
  },
  {
    label: 'Was sollte ich heute beobachten?',
    prompt:
      'Was wäre — auf Basis dessen, was du über mich weißt — heute besonders wert zu beobachten?',
  },
];

export function Chat({ userName }: { userName: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, stop, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // Nach jeder fertigen Antwort die Server-Komponenten neu laden, damit
    // Tab-Wechsel zu Body/Insights frische Projektionen sieht (z.B. nachdem
    // der Chat per log_weight-Tool ein neues Gewicht eingetragen hat).
    onFinish: () => {
      router.refresh();
    },
  });

  const handleApproval = (id: string, approved: boolean) => {
    addToolApprovalResponse({ id, approved });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === 'submitted' || status === 'streaming';
  const isEmpty = messages.length === 0;

  // Auto-scroll bei jedem Message-Update — der Effect-Body referenziert `messages` nicht direkt,
  // wir nutzen es bewusst als Trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages ist der Auto-scroll-Trigger
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Verlauf */}
      <div
        ref={scrollRef}
        className="scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {isEmpty ? (
          <EmptyState userName={userName} onPick={submit} />
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} parts={m.parts} onApproval={handleApproval} />
            ))}
            {status === 'submitted' && <ThinkingDots />}
            {error && (
              <div
                style={{
                  color: 'var(--amber)',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: 'rgba(196,152,85,0.08)',
                  borderRadius: 10,
                  border: '0.5px solid rgba(196,152,85,0.3)',
                }}
              >
                Fehler: {error.message}
              </div>
            )}
          </>
        )}
      </div>

      {/* Eingabe */}
      <div
        style={{
          padding: '8px 16px 16px',
          borderTop: '0.5px solid var(--hairline)',
          background: 'var(--bg)',
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            borderRadius: 22,
            padding: '8px 8px 8px 16px',
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Frag dein Labor…"
            disabled={isBusy}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 15,
              color: 'var(--ink)',
              resize: 'none',
              maxHeight: 160,
              padding: '8px 0',
              lineHeight: 1.4,
            }}
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stoppen"
              className="pressable"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--bg)',
                  borderRadius: 2,
                  display: 'block',
                }}
              />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Senden"
              disabled={!input.trim()}
              className="pressable"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: input.trim() ? 'var(--ink)' : 'var(--surface-2)',
                color: input.trim() ? 'var(--bg)' : 'var(--ink-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 120ms ease',
              }}
            >
              <Icon name="arrow-right" size={16} strokeWidth={2.2} />
            </button>
          )}
        </form>
        <p
          style={{
            margin: '6px 6px 0',
            fontSize: 11,
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          Sonnet 4.6 · liest und schreibt Gewichtsdaten
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  parts,
  onApproval,
}: {
  role: UIMessage['role'];
  parts: UIMessage['parts'];
  onApproval: (id: string, approved: boolean) => void;
}) {
  const isUser = role === 'user';

  // Wenn parts (z.B. ganz am Anfang des Streamings) noch keinen Text enthält,
  // zeigen wir mindestens einen leeren Platzhalter, damit die Bubble nicht kollabiert.
  const hasVisibleContent = parts.some(
    (p) => (p.type === 'text' && p.text.length > 0) || isToolUIPart(p),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          color: 'var(--ink-4)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {isUser ? 'Du' : 'Labor'}
      </div>
      <div
        className={isUser ? 'chat-bubble chat-bubble-user' : 'chat-bubble chat-bubble-assistant'}
      >
        {!hasVisibleContent && <span> </span>}
        {parts.map((p, i) => {
          // Parts werden während des Streamings nur angefügt, nie umsortiert —
          // der Index ist innerhalb einer Message stabil.
          const key = isToolUIPart(p) ? p.toolCallId : `${p.type}-${i}`;
          if (p.type === 'text') {
            if (p.text.length === 0) return null;
            return isUser ? (
              <span key={key} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {p.text}
              </span>
            ) : (
              <ReactMarkdown key={key} remarkPlugins={[remarkGfm]}>
                {p.text}
              </ReactMarkdown>
            );
          }
          if (isToolUIPart(p)) {
            return <ToolCard key={key} part={p} onApproval={onApproval} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolCard({
  part,
  onApproval,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const toolName = getToolOrDynamicToolName(part);

  // Internes Lese-Tool — der Nutzer braucht keine Karte, der Text vom Assistant
  // erklärt das Ergebnis. Während der Ausführung dezenter Hinweis.
  if (toolName === 'list_recent_weight_entries') {
    if (part.state === 'input-streaming' || part.state === 'input-available') {
      return <ToolChip muted>Letzte Einträge lesen…</ToolChip>;
    }
    return null;
  }

  const config = TOOL_LABELS[toolName] ?? {
    running: `${toolName} läuft…`,
    done: toolName,
  };

  // Bestätigung: der LLM hat das Tool aufgerufen, aber wir warten auf "go".
  // Bis der Nutzer klickt, wird NICHTS in die Datenbank geschrieben.
  if (part.state === 'approval-requested') {
    return (
      <ApprovalCard
        toolName={toolName}
        input={part.input}
        onApprove={() => onApproval(part.approval.id, true)}
        onDeny={() => onApproval(part.approval.id, false)}
      />
    );
  }

  // Bestätigung abgelehnt — wir zeigen das, damit klar ist, dass nichts passiert ist.
  if (part.state === 'approval-responded' && part.approval.approved === false) {
    return <ToolChip state="error">Nicht gespeichert — abgebrochen</ToolChip>;
  }

  // Zugestimmt, Ausführung läuft.
  if (
    part.state === 'input-streaming' ||
    part.state === 'input-available' ||
    part.state === 'approval-responded'
  ) {
    return <ToolChip state="running">{config.running}</ToolChip>;
  }
  if (part.state === 'output-available') {
    const detail = formatToolDetail(toolName, part.input);
    return (
      <ToolChip state="done">
        {config.done}
        {detail ? ` · ${detail}` : ''}
      </ToolChip>
    );
  }
  if (part.state === 'output-error') {
    return (
      <ToolChip state="error">
        Fehler bei {config.done}: {part.errorText ?? 'unbekannt'}
      </ToolChip>
    );
  }
  return null;
}

function ApprovalCard({
  toolName,
  input,
  onApprove,
  onDeny,
}: {
  toolName: string;
  input: unknown;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const summary = formatApprovalSummary(toolName, input);
  return (
    <div
      style={{
        marginBottom: 8,
        padding: '14px 16px',
        borderRadius: 14,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--hairline-strong)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Bestätigung
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 16,
          color: 'var(--ink)',
          lineHeight: 1.35,
          marginBottom: 12,
        }}
      >
        {summary}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onDeny}
          className="pressable btn-secondary"
          style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={onApprove}
          className="pressable btn-primary"
          style={{ flex: 2, padding: '10px 12px', fontSize: 13 }}
        >
          Ja, speichern
        </button>
      </div>
    </div>
  );
}

function formatApprovalSummary(toolName: string, input: unknown): string {
  if (typeof input !== 'object' || input === null) return `${toolName} ausführen?`;
  const obj = input as { kg?: unknown; occurred_at?: unknown };
  const kg = typeof obj.kg === 'number' ? `${obj.kg.toFixed(1).replace('.', ',')} kg` : null;
  const when = formatApprovalTime(obj.occurred_at);

  if (toolName === 'log_weight' && kg) {
    return when ? `${kg} eintragen — ${when}` : `${kg} eintragen — jetzt`;
  }
  if (toolName === 'correct_weight' && kg) {
    return `Eintrag korrigieren auf ${kg}`;
  }
  if (toolName === 'retract_weight') {
    return 'Eintrag zurückziehen';
  }
  return `${toolName} ausführen?`;
}

function formatApprovalTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  log_weight: { running: 'Gewicht speichern…', done: 'Gewicht gespeichert' },
  correct_weight: { running: 'Eintrag korrigieren…', done: 'Eintrag korrigiert' },
  retract_weight: { running: 'Eintrag zurückziehen…', done: 'Eintrag zurückgezogen' },
};

function formatToolDetail(toolName: string, input: unknown): string {
  if (typeof input !== 'object' || input === null) return '';
  const kg = (input as { kg?: unknown }).kg;
  if ((toolName === 'log_weight' || toolName === 'correct_weight') && typeof kg === 'number') {
    return `${kg.toFixed(1).replace('.', ',')} kg`;
  }
  return '';
}

function ToolChip({
  children,
  state,
  muted,
}: {
  children: React.ReactNode;
  state?: 'running' | 'done' | 'error';
  muted?: boolean;
}) {
  const colors: Record<'running' | 'done' | 'error', { bg: string; ink: string; dot: string }> = {
    running: { bg: 'var(--surface-2)', ink: 'var(--ink-2)', dot: 'var(--sage-deep)' },
    done: { bg: 'rgba(110,122,78,0.10)', ink: 'var(--ink)', dot: 'var(--sage-deep)' },
    error: { bg: 'rgba(196,152,85,0.12)', ink: 'var(--amber)', dot: 'var(--amber)' },
  };
  const palette = state
    ? colors[state]
    : { bg: 'transparent', ink: 'var(--ink-4)', dot: 'var(--ink-4)' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background: muted ? 'transparent' : palette.bg,
        border: muted ? '0.5px dashed var(--hairline)' : '0.5px solid var(--hairline)',
        color: palette.ink,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.04em',
        marginBottom: 6,
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: palette.dot,
          animation: state === 'running' ? 'pulse-glow 1.2s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-4)' }}>
      <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
      <span className="thinking-dot" style={{ animationDelay: '120ms' }} />
      <span className="thinking-dot" style={{ animationDelay: '240ms' }} />
      <span style={{ fontSize: 12, marginLeft: 4 }}>denkt nach…</span>
    </div>
  );
}

function EmptyState({
  userName,
  onPick,
}: {
  userName: string;
  onPick: (prompt: string) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        paddingTop: 12,
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            borderRadius: 999,
            background: 'var(--sage-wash)',
            border: '0.5px solid rgba(110,122,78,0.22)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
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
          LABOR · DEIN PERSÖNLICHER ASSISTENT
        </div>
        <h1
          className="h-display"
          style={{
            fontSize: 30,
            margin: '16px 0 0',
            lineHeight: 1.1,
            maxWidth: '92%',
          }}
        >
          Hallo {userName}.
        </h1>
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: 'var(--ink-2)',
            fontSize: 15,
            lineHeight: 1.5,
          }}
        >
          Frag mich nach{' '}
          <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Interpretation</em>, nicht
          nach Tagessummen.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--ink-4)',
            fontWeight: 500,
            textTransform: 'uppercase',
            padding: '0 2px',
          }}
        >
          Vorschläge
        </div>
        {SUGGESTED.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="pressable"
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: 14,
              border: '0.5px solid var(--hairline)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.4,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span>{s.label}</span>
            <Icon name="arrow-right" size={14} strokeWidth={1.6} />
          </button>
        ))}
        <div
          style={{
            marginTop: 4,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--surface-2)',
            border: '0.5px dashed var(--hairline-strong)',
            color: 'var(--ink-3)',
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          Tipp: Du kannst dein Gewicht auch direkt im Chat eintragen — z.B.{' '}
          <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>„heute morgen 84,1"</em>.
        </div>
      </div>
    </div>
  );
}

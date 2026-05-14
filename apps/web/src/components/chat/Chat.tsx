'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { MessageBubble } from './MessageBubble';
import type { AgentConfig } from './types';

export function Chat({ userName, config }: { userName: string; config: AgentConfig }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const transport = useMemo(
    () => new DefaultChatTransport({ api: config.apiPath }),
    [config.apiPath],
  );
  const { messages, sendMessage, status, error, stop, addToolApprovalResponse } = useChat({
    transport,
    // Nach jeder Approval-Antwort automatisch eine Continuation-Anfrage senden,
    // damit das LLM das Tool ausführt und das Ergebnis streamt. Ohne diesen
    // Predicate hängt der UI-State unbegrenzt bei "Tool läuft…".
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
          <EmptyState userName={userName} config={config} onPick={submit} />
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                parts={m.parts}
                speakerLabel={config.bubbleSpeakerLabel}
                onApproval={handleApproval}
              />
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
            placeholder={config.placeholder}
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
          {config.modelHint}
        </p>
      </div>
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
  config,
  onPick,
}: {
  userName: string;
  config: AgentConfig;
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
          {config.emptyStateChip}
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
          {config.greetingHeadline(userName)}
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
          {config.greetingSubtitle}
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
        {config.suggestions.map((s) => (
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
        {config.emptyStateTip && (
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
            {config.emptyStateTip}
          </div>
        )}
      </div>
    </div>
  );
}

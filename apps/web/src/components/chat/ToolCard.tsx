import { type DynamicToolUIPart, type ToolUIPart, getToolOrDynamicToolName } from 'ai';
import { ApprovalCard } from './ApprovalCard';
import {
  INTERNAL_READ_TOOL_LABELS,
  TOOL_LABELS,
  formatToolDetail,
} from './format-approval-summary';

export function ToolCard({
  part,
  onApproval,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const toolName = getToolOrDynamicToolName(part);

  if (INTERNAL_READ_TOOL_LABELS[toolName]) {
    if (part.state === 'input-streaming' || part.state === 'input-available') {
      return <ToolChip muted>{INTERNAL_READ_TOOL_LABELS[toolName]}</ToolChip>;
    }
    return null;
  }

  const config = TOOL_LABELS[toolName] ?? {
    running: `${toolName} läuft…`,
    done: toolName,
  };

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

  if (part.state === 'approval-responded' && part.approval.approved === false) {
    return <ToolChip state="error">Nicht gespeichert — abgebrochen</ToolChip>;
  }

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

export function ToolChip({
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

import { formatApprovalSummary } from './format-approval-summary';

export function ApprovalCard({
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

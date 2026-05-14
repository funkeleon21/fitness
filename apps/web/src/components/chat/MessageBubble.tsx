import { type UIMessage, isToolUIPart } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCard } from './ToolCard';

export function MessageBubble({
  role,
  parts,
  speakerLabel,
  onApproval,
}: {
  role: UIMessage['role'];
  parts: UIMessage['parts'];
  speakerLabel: string;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const isUser = role === 'user';

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
        {isUser ? 'Du' : speakerLabel}
      </div>
      <div
        className={isUser ? 'chat-bubble chat-bubble-user' : 'chat-bubble chat-bubble-assistant'}
      >
        {!hasVisibleContent && <span> </span>}
        {parts.map((p, i) => {
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

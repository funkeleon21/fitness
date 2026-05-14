'use client';

import { Chat as GenericChat } from './chat/Chat';
import { LABOR_AGENT } from './chat/agent-configs';

export function Chat({ userName }: { userName: string }) {
  return <GenericChat userName={userName} config={LABOR_AGENT} />;
}

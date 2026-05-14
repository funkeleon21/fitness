import type { ReactNode } from 'react';

export interface AgentConfig {
  apiPath: string;
  agentLabel: string;
  bubbleSpeakerLabel: string;
  greetingHeadline: (userName: string) => string;
  greetingSubtitle: ReactNode;
  suggestions: { label: string; prompt: string }[];
  placeholder: string;
  modelHint: string;
  emptyStateTip?: ReactNode;
  emptyStateChip: string;
}

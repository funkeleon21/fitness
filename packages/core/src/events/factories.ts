import { WEIGHT_LOGGED, type WeightLoggedEvent } from './body/weight';
import type { EventProvenance, EventSource } from './envelope';
import { MEAL_LOGGED, type MealItem, type MealLoggedEvent, type MealType } from './nutrition/meal';
import {
  NUTRITION_TARGETS_SET,
  type NutritionTargetsSetEvent,
  type NutritionTargetsSetPayload,
} from './nutrition/targets';
import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  type EventCorrectedEvent,
  type EventRetractedEvent,
} from './system/correction';
import { WORKOUT_LOGGED, type WorkoutExercise, type WorkoutLoggedEvent } from './training/workout';

export interface NewWeightLoggedInput {
  user_id: string;
  kg: number;
  occurred_at: Date;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export function createWeightLogged(input: NewWeightLoggedInput): WeightLoggedEvent {
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: WEIGHT_LOGGED,
    version: 1,
    occurred_at: input.occurred_at,
    recorded_at: new Date(),
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: { kg: input.kg },
  };
}

export interface NewMealLoggedInput {
  user_id: string;
  label: string;
  kcal: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  saturated_fat_g?: number;
  salt_g?: number;
  items?: MealItem[];
  template_id?: string;
  pantry_item_id?: string;
  meal_type?: MealType;
  occurred_at: Date;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export function createMealLogged(input: NewMealLoggedInput): MealLoggedEvent {
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: MEAL_LOGGED,
    version: 1,
    occurred_at: input.occurred_at,
    recorded_at: new Date(),
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: {
      label: input.label,
      kcal: input.kcal,
      ...(input.protein_g !== undefined ? { protein_g: input.protein_g } : {}),
      ...(input.carbs_g !== undefined ? { carbs_g: input.carbs_g } : {}),
      ...(input.fat_g !== undefined ? { fat_g: input.fat_g } : {}),
      ...(input.sugar_g !== undefined ? { sugar_g: input.sugar_g } : {}),
      ...(input.fiber_g !== undefined ? { fiber_g: input.fiber_g } : {}),
      ...(input.saturated_fat_g !== undefined ? { saturated_fat_g: input.saturated_fat_g } : {}),
      ...(input.salt_g !== undefined ? { salt_g: input.salt_g } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.template_id !== undefined ? { template_id: input.template_id } : {}),
      ...(input.pantry_item_id !== undefined ? { pantry_item_id: input.pantry_item_id } : {}),
      ...(input.meal_type !== undefined ? { meal_type: input.meal_type } : {}),
    },
  };
}

export interface NewWorkoutLoggedInput {
  user_id: string;
  label: string;
  occurred_at: Date;
  duration_min?: number;
  exercises?: WorkoutExercise[];
  template_id?: string;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export function createWorkoutLogged(input: NewWorkoutLoggedInput): WorkoutLoggedEvent {
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: WORKOUT_LOGGED,
    version: 1,
    occurred_at: input.occurred_at,
    recorded_at: new Date(),
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: {
      label: input.label,
      ...(input.duration_min !== undefined ? { duration_min: input.duration_min } : {}),
      ...(input.exercises !== undefined ? { exercises: input.exercises } : {}),
      ...(input.template_id !== undefined ? { template_id: input.template_id } : {}),
    },
  };
}

export interface NewNutritionTargetsSetInput {
  user_id: string;
  payload: NutritionTargetsSetPayload;
  occurred_at?: Date;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export function createNutritionTargetsSet(
  input: NewNutritionTargetsSetInput,
): NutritionTargetsSetEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: NUTRITION_TARGETS_SET,
    version: 1,
    occurred_at: input.occurred_at ?? now,
    recorded_at: now,
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: input.payload,
  };
}

export interface NewEventCorrectedInput {
  user_id: string;
  corrects_event_id: string;
  new_payload: Record<string, unknown>;
  reason: string | null;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
  occurred_at?: Date;
}

export function createEventCorrected(input: NewEventCorrectedInput): EventCorrectedEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: EVENT_CORRECTED,
    version: 1,
    occurred_at: input.occurred_at ?? now,
    recorded_at: now,
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: {
      corrects_event_id: input.corrects_event_id,
      new_payload: input.new_payload,
      reason: input.reason,
    },
  };
}

export interface NewEventRetractedInput {
  user_id: string;
  retracts_event_id: string;
  reason: string | null;
  source: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
  occurred_at?: Date;
}

export function createEventRetracted(input: NewEventRetractedInput): EventRetractedEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: EVENT_RETRACTED,
    version: 1,
    occurred_at: input.occurred_at ?? now,
    recorded_at: now,
    source: input.source,
    external_id: input.external_id ?? null,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    provenance: input.provenance ?? null,
    payload: {
      retracts_event_id: input.retracts_event_id,
      reason: input.reason,
    },
  };
}

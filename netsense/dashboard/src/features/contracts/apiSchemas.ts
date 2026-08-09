import { z } from 'zod';
import {
  INCIDENT_SCHEMA_VERSION,
  incidentStateSchema,
  incidentSummarySchema,
} from '../incidents/domain/schemas';

export const problemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  code: z.string().min(1),
  detail: z.string().min(1).optional(),
  traceId: z.string().min(1),
  violations: z.array(z.object({
    path: z.string().min(1),
    message: z.string().min(1),
  }).strict()).optional(),
}).strict();

export const incidentListResponseSchema = z.object({
  schemaVersion: z.literal(INCIDENT_SCHEMA_VERSION),
  items: z.array(incidentSummarySchema),
  nextCursor: z.string().min(1).nullable(),
}).strict();

export const incidentAcknowledgementRequestSchema = z.object({
  expectedState: z.literal('open'),
}).strict();

export const incidentNotesRequestSchema = z.object({
  expectedState: incidentStateSchema.exclude(['resolved']),
  notes: z.string().min(1).max(10_000),
}).strict();

export const incidentResolutionRequestSchema = z.object({
  expectedState: z.literal('acknowledged'),
  resolutionNotes: z.string().min(10).max(10_000),
  actualRootCauseEntityId: z.string().min(1).max(256).nullable(),
}).strict();

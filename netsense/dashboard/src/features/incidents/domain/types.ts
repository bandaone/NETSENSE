import { z } from 'zod';
import {
  alternatePathFindingSchema,
  analysisFactorSchema,
  confidenceBandSchema,
  impactAssessmentSchema,
  impactClassificationSchema,
  incidentAnalysisSchema,
  incidentObservationSchema,
  incidentScenarioSchema,
  incidentSeveritySchema,
  incidentStateSchema,
  incidentTargetSchema,
  rootCauseCandidateSchema,
  safeCheckSchema,
  symptomKindSchema,
} from './schemas';

export type IncidentSeverity = z.infer<typeof incidentSeveritySchema>;
export type IncidentState = z.infer<typeof incidentStateSchema>;
export type IncidentTarget = z.infer<typeof incidentTargetSchema>;
export type SymptomKind = z.infer<typeof symptomKindSchema>;
export type IncidentObservation = z.infer<typeof incidentObservationSchema>;
export type IncidentScenario = z.infer<typeof incidentScenarioSchema>;
export type ConfidenceBand = z.infer<typeof confidenceBandSchema>;
export type AnalysisFactor = z.infer<typeof analysisFactorSchema>;
export type RootCauseCandidate = z.infer<typeof rootCauseCandidateSchema>;
export type ImpactClassification = z.infer<typeof impactClassificationSchema>;
export type ImpactAssessment = z.infer<typeof impactAssessmentSchema>;
export type AlternatePathFinding = z.infer<typeof alternatePathFindingSchema>;
export type SafeCheck = z.infer<typeof safeCheckSchema>;
export type IncidentAnalysis = z.infer<typeof incidentAnalysisSchema>;

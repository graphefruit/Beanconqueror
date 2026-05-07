export interface AiAnalysisRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  evidenceMetrics: Record<string, number | string | null>;
  confidence: number;
}

export interface AiAnalysisSnapshotSummary {
  brewCount: number;
  avgRatio: number | null;
  avgBrewTimeSeconds: number | null;
  avgFirstDripSeconds: number | null;
  avgRating: number | null;
}

export interface AiAnalysisSnapshot {
  id: string;
  createdAt: string;
  summary: AiAnalysisSnapshotSummary;
  trendHighlights: string[];
  recommendations: AiAnalysisRecommendation[];
  evidence: Array<{ metric: string; message: string }>;
  ai?: {
    skipped: boolean;
    reason: string;
  };
}

export interface AiAnalysisConfig {
  enabled: boolean;
  cadenceHours: number;
  retentionCount: number;
  visibility: 'visible' | 'hidden';
  lastRunAt?: string | null;
}

export interface AiAnalysisStatus {
  enabled: boolean;
  cadenceHours: number;
  visibility: 'visible' | 'hidden';
  running: boolean;
  health: 'idle' | 'running' | 'ok' | 'error';
  lastRunAt: string | null;
  lastError: string;
  lastDurationMs: number;
  lastSnapshotId: string;
  providerReady: boolean;
}


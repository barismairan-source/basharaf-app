export interface AnomalyFindingInput {
  ruleKey: string;
  severity: 'high' | 'medium' | 'low';
  branchId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details: Record<string, unknown>;
  note: string;
  jalaliDate?: string | null;
}

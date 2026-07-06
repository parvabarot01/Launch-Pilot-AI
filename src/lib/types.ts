export type Role = "owner" | "admin" | "member" | "viewer";

export type EnvironmentKey = "development" | "staging" | "production";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface Environment {
  id: string;
  orgId: string;
  key: EnvironmentKey;
  name: string;
  apiKey: string;
  createdAt: string;
}

export type RuleOperator = "equals" | "not_equals" | "contains" | "in" | "gt" | "lt";

export interface TargetingRule {
  id: string;
  attribute: string;
  operator: RuleOperator;
  value: string;
  description?: string;
}

export interface FlagEnvironmentState {
  environmentId: string;
  enabled: boolean;
  killSwitch: boolean;
  rolloutPercentage: number;
  targetingRules: TargetingRule[];
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureFlag {
  id: string;
  orgId: string;
  key: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  archivedAt: string | null;
  environments: FlagEnvironmentState[];
}

export type AuditAction =
  | "flag.created"
  | "flag.updated"
  | "flag.archived"
  | "flag.rollout_changed"
  | "flag.kill_switch_toggled"
  | "flag.targeting_updated"
  | "experiment.created"
  | "experiment.status_changed"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "rollback.performed"
  | "org.member_added"
  | "org.member_role_changed";

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityType: "flag" | "experiment" | "approval" | "organization";
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export type ExperimentStatus = "draft" | "running" | "completed" | "archived";

export interface Variant {
  id: string;
  key: string;
  name: string;
  allocationPercentage: number;
  isControl: boolean;
}

export interface Experiment {
  id: string;
  orgId: string;
  environmentId: string;
  flagId: string | null;
  name: string;
  hypothesis: string;
  successMetric: string;
  minimumSampleSize: number;
  status: ExperimentStatus;
  variants: Variant[];
  createdAt: string;
  createdBy: string;
  startedAt: string | null;
  endedAt: string | null;
}

export type EventType = "exposure" | "conversion" | "revenue" | "custom";

export interface ExperimentEvent {
  id: string;
  experimentId: string;
  variantId: string;
  eventType: EventType;
  subjectId: string;
  value: number;
  createdAt: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  orgId: string;
  flagId: string;
  environmentId: string;
  requestedBy: string;
  requestedByName: string;
  fromRolloutPercentage: number;
  toRolloutPercentage: number;
  riskScore: number;
  riskFactors: string[];
  status: ApprovalStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface FlagRollbackSnapshot {
  id: string;
  flagId: string;
  environmentId: string;
  state: FlagEnvironmentState;
  createdAt: string;
  label: string;
}

export interface Database {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  environments: Environment[];
  flags: FeatureFlag[];
  auditLog: AuditLogEntry[];
  experiments: Experiment[];
  events: ExperimentEvent[];
  approvals: ApprovalRequest[];
  rollbackSnapshots: FlagRollbackSnapshot[];
}

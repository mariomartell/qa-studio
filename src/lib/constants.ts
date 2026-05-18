// Allowed values for string-enum columns.
// SQLite has no native enum support, so these are the source of truth.

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CASE_TYPES = [
  "Functional",
  "Regression",
  "Smoke",
  "Exploratory",
  "UI",
  "DataValidation",
] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_STATUSES = ["Draft", "Ready", "Deprecated"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const RUN_CASE_STATUSES = [
  "Untested",
  "Passed",
  "Failed",
  "Blocked",
  "Skipped",
] as const;
export type RunCaseStatus = (typeof RUN_CASE_STATUSES)[number];

export const RUN_STATUSES = ["InProgress", "Completed", "Aborted"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const DEFECT_STATUSES = [
  "Open",
  "InProgress",
  "ReadyForQA",
  "PassedQA",
  "FailedQA",
  "Closed",
] as const;
export type DefectStatus = (typeof DEFECT_STATUSES)[number];

export const MILESTONE_STATUSES = ["Active", "Completed", "Archived"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

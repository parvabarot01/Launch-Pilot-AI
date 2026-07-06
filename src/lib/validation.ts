import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  orgName: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const createFlagSchema = z.object({
  orgId: z.string().min(1),
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-_]*$/, "Use lowercase letters, numbers, - and _ only"),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
});

export const targetingRuleSchema = z.object({
  attribute: z.string().min(1).max(80),
  operator: z.enum(["equals", "not_equals", "contains", "in", "gt", "lt"]),
  value: z.string().min(1).max(500),
  description: z.string().max(300).optional(),
});

export const updateFlagStateSchema = z.object({
  environmentId: z.string().min(1),
  enabled: z.boolean().optional(),
  killSwitch: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  targetingRules: z.array(targetingRuleSchema).optional(),
  reason: z.string().max(500).optional(),
});

export const createExperimentSchema = z.object({
  orgId: z.string().min(1),
  environmentId: z.string().min(1),
  flagId: z.string().nullable().optional(),
  name: z.string().min(1).max(150),
  hypothesis: z.string().min(1).max(2000),
  successMetric: z.string().min(1).max(200),
  minimumSampleSize: z.number().int().min(1).max(10_000_000).optional().default(1000),
  variants: z
    .array(
      z.object({
        key: z.string().min(1).max(50),
        name: z.string().min(1).max(120),
        allocationPercentage: z.number().min(0).max(100),
        isControl: z.boolean(),
      })
    )
    .min(2, "At least a control and one treatment variant are required"),
});

export const recordEventSchema = z.object({
  experimentId: z.string().min(1),
  variantId: z.string().min(1),
  eventType: z.enum(["exposure", "conversion", "revenue", "custom"]),
  subjectId: z.string().min(1).max(200),
  value: z.number().optional().default(1),
});

export const evaluateFlagSchema = z.object({
  apiKey: z.string().min(1),
  flagKey: z.string().min(1),
  context: z.record(z.string()).optional().default({}),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional().default(""),
});

export const createApprovalSchema = z.object({
  orgId: z.string().min(1),
  flagId: z.string().min(1),
  environmentId: z.string().min(1),
  toRolloutPercentage: z.number().min(0).max(100),
  reason: z.string().max(500).optional().default(""),
});

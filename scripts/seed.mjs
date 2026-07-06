// Seeds .data/db.json with a demo org, flags, and an experiment with
// simulated traffic so the app has something to look at on first run.
// Run with: npm run seed
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function newApiKey() {
  return `lp_${crypto.randomBytes(24).toString("hex")}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

if (fs.existsSync(DB_FILE)) {
  console.log(".data/db.json already exists — skipping seed. Delete it first to reseed.");
  process.exit(0);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

const now = new Date().toISOString();
const db = {
  users: [],
  organizations: [],
  memberships: [],
  environments: [],
  flags: [],
  auditLog: [],
  experiments: [],
  events: [],
  approvals: [],
  rollbackSnapshots: [],
};

const { hash, salt } = hashPassword("demo12345");
const userId = newId("user");
const orgId = newId("org");

db.users.push({
  id: userId,
  email: "demo@launchpilot.dev",
  passwordHash: hash,
  passwordSalt: salt,
  name: "Demo Founder",
  createdAt: now,
});

db.organizations.push({ id: orgId, name: "Demo Org", slug: "demo-org", createdAt: now });
db.memberships.push({ id: newId("mem"), orgId, userId, role: "owner", createdAt: now });

const envs = {};
for (const key of ["development", "staging", "production"]) {
  const env = {
    id: newId("env"),
    orgId,
    key,
    name: key[0].toUpperCase() + key.slice(1),
    apiKey: newApiKey(),
    createdAt: now,
  };
  db.environments.push(env);
  envs[key] = env;
}

function flagEnvState(environmentId, overrides = {}) {
  return {
    environmentId,
    enabled: false,
    killSwitch: false,
    rolloutPercentage: 0,
    targetingRules: [],
    updatedAt: now,
    updatedBy: userId,
    ...overrides,
  };
}

const checkoutFlagId = newId("flag");
db.flags.push({
  id: checkoutFlagId,
  orgId,
  key: "new-checkout-flow",
  name: "New Checkout Flow",
  description: "Redesigned one-page checkout with saved payment methods.",
  createdAt: now,
  createdBy: userId,
  archivedAt: null,
  environments: [
    flagEnvState(envs.development.id, { enabled: true, rolloutPercentage: 100 }),
    flagEnvState(envs.staging.id, { enabled: true, rolloutPercentage: 50 }),
    flagEnvState(envs.production.id, { enabled: true, rolloutPercentage: 25 }),
  ],
});

const searchFlagId = newId("flag");
db.flags.push({
  id: searchFlagId,
  orgId,
  key: "ai-search-ranking",
  name: "AI Search Ranking",
  description: "Semantic re-ranking layer on top of keyword search results.",
  createdAt: now,
  createdBy: userId,
  archivedAt: null,
  environments: [
    flagEnvState(envs.development.id, { enabled: true, rolloutPercentage: 100 }),
    flagEnvState(envs.staging.id, { enabled: true, rolloutPercentage: 10 }),
    flagEnvState(envs.production.id, { enabled: false, rolloutPercentage: 0 }),
  ],
});

const killSwitchFlagId = newId("flag");
db.flags.push({
  id: killSwitchFlagId,
  orgId,
  key: "legacy-invoice-export",
  name: "Legacy Invoice Export",
  description: "Old CSV invoice exporter, being phased out.",
  createdAt: now,
  createdBy: userId,
  archivedAt: null,
  environments: [
    flagEnvState(envs.development.id, { enabled: true, rolloutPercentage: 100 }),
    flagEnvState(envs.staging.id, { enabled: true, rolloutPercentage: 100 }),
    flagEnvState(envs.production.id, { enabled: true, rolloutPercentage: 100, killSwitch: true }),
  ],
});

// Experiment with simulated traffic in production so the stats engine and
// AI assistant have something real to analyze immediately.
const experimentId = newId("exp");
const controlVariant = { id: newId("var"), key: "control", name: "Control", allocationPercentage: 50, isControl: true };
const treatmentVariant = { id: newId("var"), key: "treatment", name: "One-Page Checkout", allocationPercentage: 50, isControl: false };

db.experiments.push({
  id: experimentId,
  orgId,
  environmentId: envs.production.id,
  flagId: checkoutFlagId,
  name: "One-page checkout conversion lift",
  hypothesis: "Consolidating checkout to one page reduces drop-off and increases completed purchases.",
  successMetric: "Purchase conversion rate",
  minimumSampleSize: 2000,
  status: "running",
  variants: [controlVariant, treatmentVariant],
  createdAt: now,
  createdBy: userId,
  startedAt: now,
  endedAt: null,
});

function simulate(variantId, exposures, rate) {
  for (let i = 0; i < exposures; i++) {
    const subjectId = newId("sim");
    db.events.push({ id: newId("evt"), experimentId, variantId, eventType: "exposure", subjectId, value: 1, createdAt: now });
    if (Math.random() < rate) {
      db.events.push({ id: newId("evt"), experimentId, variantId, eventType: "conversion", subjectId, value: 1, createdAt: now });
    }
  }
}

simulate(controlVariant.id, 2400, 0.108);
simulate(treatmentVariant.id, 2400, 0.129);

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");

console.log("Seeded .data/db.json");
console.log("Log in with: demo@launchpilot.dev / demo12345");

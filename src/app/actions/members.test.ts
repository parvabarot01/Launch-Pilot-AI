import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb, seedViewerContext, seedUserInOrg, seedOrg } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import { addMemberCore, changeMemberRoleCore } from "./members";

test("addMemberCore: an admin can add an existing user as viewer/member/admin", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { org: outsiderOrg } = await seedOrg("Outsider Org");
  await seedUserInOrg(outsiderOrg, [], "owner", { email: "outsider@example.com" });

  const result = await addMemberCore(owner, { email: "outsider@example.com", role: "member" });

  assert.equal(result.ok, true);
  const db = (await readDb());
  assert.equal(db.memberships.filter((m) => m.orgId === owner.org.id).length, 2);
  assert.ok(db.auditLog.some((e) => e.action === "org.member_added"));
});

test("addMemberCore: CANNOT be used to grant owner, even if 'owner' is passed directly", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { org: outsiderOrg } = await seedOrg("Outsider Org 2");
  await seedUserInOrg(outsiderOrg, [], "owner", { email: "wannabe-owner@example.com" });

  // Regression test for the privilege-escalation bug found this session:
  // addMemberAction must reject "owner" structurally, not just via the UI.
  const result = await addMemberCore(owner, { email: "wannabe-owner@example.com", role: "owner" });

  assert.equal(result.ok, false);
  assert.equal(
    (await readDb()).memberships.some((m) => m.orgId === owner.org.id),
    true,
    "sanity: owner's own membership still exists"
  );
  assert.equal(
    (await readDb()).memberships.filter((m) => m.orgId === owner.org.id && m.role === "owner").length,
    1,
    "no second owner should have been created"
  );
});

test("addMemberCore: a member (non-admin) cannot add anyone", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");
  const { org: outsiderOrg } = await seedOrg("Outsider Org 3");
  await seedUserInOrg(outsiderOrg, [], "owner", { email: "target@example.com" });

  const result = await addMemberCore(memberCtx, { email: "target@example.com", role: "viewer" });

  assert.equal(result.ok, false);
});

test("addMemberCore: fails gracefully if no account exists for that email", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const result = await addMemberCore(owner, { email: "nobody@example.com", role: "member" });

  assert.equal(result.ok, false);
  assert.match(result.error!, /sign up first/i);
});

test("addMemberCore: rejects adding someone already a member", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { org: outsiderOrg } = await seedOrg("Outsider Org 4");
  await seedUserInOrg(outsiderOrg, [], "owner", { email: "already@example.com" });

  await addMemberCore(owner, { email: "already@example.com", role: "member" });
  const second = await addMemberCore(owner, { email: "already@example.com", role: "admin" });

  assert.equal(second.ok, false);
  assert.equal((await readDb()).memberships.filter((m) => m.orgId === owner.org.id).length, 2);
});

test("changeMemberRoleCore: the owner can promote a member to admin", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");

  const result = await changeMemberRoleCore(owner, memberCtx.membership.id, "admin");

  assert.equal(result.ok, true);
  assert.equal(
    (await readDb()).memberships.find((m) => m.id === memberCtx.membership.id)!.role,
    "admin"
  );
});

test("changeMemberRoleCore: an admin (non-owner) cannot change roles", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const adminCtx = await seedUserInOrg(owner.org, owner.environments, "admin");
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");

  const result = await changeMemberRoleCore(adminCtx, memberCtx.membership.id, "admin");

  assert.equal(result.ok, false);
});

test("changeMemberRoleCore: refuses to demote the last remaining owner", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");

  const result = await changeMemberRoleCore(owner, owner.membership.id, "admin");

  assert.equal(result.ok, false);
  assert.match(result.error!, /at least one owner/i);
  assert.equal((await readDb()).memberships[0].role, "owner");
});

test("changeMemberRoleCore: CAN demote an owner if another owner remains", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const secondOwner = await seedUserInOrg(owner.org, owner.environments, "owner");

  const result = await changeMemberRoleCore(owner, secondOwner.membership.id, "admin");

  assert.equal(result.ok, true);
  assert.equal((await readDb()).memberships.filter((m) => m.role === "owner").length, 1);
});

test("changeMemberRoleCore: rejects a garbage role value at runtime", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");

  // @ts-expect-error deliberately passing an invalid value to prove the runtime guard works
  const result = await changeMemberRoleCore(owner, memberCtx.membership.id, "superadmin");

  assert.equal(result.ok, false);
  assert.equal((await readDb()).memberships.find((m) => m.id === memberCtx.membership.id)!.role, "member");
});

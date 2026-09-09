import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateTask,
  canManageTask,
  canUpdateTaskStatus,
  tasksVisibleTo,
  validateTaskInput,
} from "../src/domain/policies.js";

const manager = { id: "m1", role: "manager", organizationId: "o1" };
const employee = { id: "e1", role: "employee", organizationId: "o1" };
const otherEmployee = { id: "e2", role: "employee", organizationId: "o1" };
const task = { id: "t1", assigneeId: "e1", organizationId: "o1", status: "todo" };

test("only managers can create and manage tasks", () => {
  assert.equal(canCreateTask(manager), true);
  assert.equal(canCreateTask(employee), false);
  assert.equal(canManageTask(manager, task), true);
  assert.equal(canManageTask({ ...manager, organizationId: "o2" }, task), false);
});

test("assignees and managers can update task status", () => {
  assert.equal(canUpdateTaskStatus(manager, task), true);
  assert.equal(canUpdateTaskStatus(employee, task), true);
  assert.equal(canUpdateTaskStatus(otherEmployee, task), false);
});

test("employees see their work while managers see organization work", () => {
  const tasks = [task, { ...task, id: "t2", assigneeId: "e2" }, { ...task, id: "t3", organizationId: "o2" }];
  assert.deepEqual(tasksVisibleTo(employee, tasks).map(({ id }) => id), ["t1"]);
  assert.deepEqual(tasksVisibleTo(manager, tasks).map(({ id }) => id), ["t1", "t2"]);
});

test("task input is normalized and validated", () => {
  const workspace = { users: [{ id: "e1" }], teams: [{ id: "team1" }] };
  const result = validateTaskInput({ title: "  Ship brief  ", description: "  Ready  ", assigneeId: "e1", teamId: "team1", due: "2026-09-12", priority: "high" }, workspace);
  assert.equal(result.title, "Ship brief");
  assert.equal(result.description, "Ready");
  assert.throws(() => validateTaskInput({ ...result, assigneeId: "missing" }, workspace), /valid assignee/);
});

export const TASK_STATUSES = ["todo", "progress", "done"];
export const TASK_PRIORITIES = ["low", "medium", "high"];

export function canCreateTask(user) {
  return user?.role === "manager";
}

export function canManageTask(user, task) {
  return user?.role === "manager" && user.organizationId === task.organizationId;
}

export function canUpdateTaskStatus(user, task) {
  return canManageTask(user, task) || (user?.id === task.assigneeId && user.organizationId === task.organizationId);
}

export function tasksVisibleTo(user, tasks) {
  if (!user) return [];
  return tasks.filter((task) => task.organizationId === user.organizationId && (user.role === "manager" || task.assigneeId === user.id));
}

export function validateTaskInput(input, workspace) {
  const title = input.title?.trim();
  if (!title) throw new Error("A task title is required.");
  if (!workspace.users.some((user) => user.id === input.assigneeId)) throw new Error("Choose a valid assignee.");
  if (!workspace.teams.some((team) => team.id === input.teamId)) throw new Error("Choose a valid team.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new Error("Choose a valid due date.");
  if (!TASK_PRIORITIES.includes(input.priority)) throw new Error("Choose a valid priority.");

  return { ...input, title, description: input.description?.trim() || "" };
}

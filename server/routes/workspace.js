import { Router } from "express";
import { hashPassword } from "../lib/password.js";
import { serializeTask, serializeUser, serializeWorkspace } from "../lib/serializers.js";
import { clientError, validateEmployeeCreate, validateTaskCreate, validateTaskUpdate } from "../lib/validation.js";
import { requireManager, requireUser } from "../middleware/auth.js";

export function createWorkspaceRouter({ repository }) {
  const router = Router();

  router.get("/bootstrap", requireUser, async (request, response) => {
    const [workspace, tasks] = await Promise.all([
      repository.getWorkspaceFor(request.user),
      repository.listTasksFor(request.user),
    ]);
    response.json({ ...serializeWorkspace(workspace), tasks: tasks.map(serializeTask), currentUser: serializeUser(request.user) });
  });

  router.get("/tasks", requireUser, async (request, response) => {
    const tasks = await repository.listTasksFor(request.user);
    response.json({ tasks: tasks.map(serializeTask) });
  });

  router.post("/tasks", requireManager, async (request, response) => {
    const workspace = await repository.getWorkspaceFor(request.user);
    const input = validateTaskCreate(request.body, workspace);
    const task = await repository.createTask(input, request.user);
    response.status(201).json({ task: serializeTask(task) });
  });

  router.patch("/tasks/:taskId", requireUser, async (request, response) => {
    const current = await repository.getTaskById(request.params.taskId, request.user.organization_id);
    if (!current) throw clientError("Task not found.", 404);
    const isManager = request.user.role === "manager";
    if (!isManager && current.assignee_id !== request.user.id) throw clientError("You can only update tasks assigned to you.", 403);
    const changes = validateTaskUpdate(request.body, { manager: isManager });

    if (isManager && (changes.teamId || changes.assigneeId)) {
      const workspace = await repository.getWorkspaceFor(request.user);
      const fullTask = {
        title: changes.title ?? current.title,
        description: changes.description ?? current.description,
        teamId: changes.teamId ?? current.team_id,
        assigneeId: changes.assigneeId ?? current.assignee_id,
        dueDate: changes.dueDate ?? String(current.due_date).slice(0, 10),
        priority: changes.priority ?? current.priority,
      };
      validateTaskCreate(fullTask, workspace);
    }

    const task = await repository.updateTask(current.id, changes, request.user);
    response.json({ task: serializeTask(task) });
  });

  router.delete("/tasks/:taskId", requireManager, async (request, response) => {
    const deleted = await repository.deleteTask(request.params.taskId, request.user);
    if (!deleted) throw clientError("Task not found.", 404);
    response.status(204).end();
  });

  router.post("/employees", requireManager, async (request, response) => {
    const workspace = await repository.getWorkspaceFor(request.user);
    const input = validateEmployeeCreate(request.body, workspace);
    const passwordHash = await hashPassword(input.temporaryPassword);
    const employee = await repository.createEmployee({ ...input, passwordHash }, request.user);
    response.status(201).json({ employee: serializeUser(employee) });
  });

  return router;
}

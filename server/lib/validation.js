const priorities = new Set(["low", "medium", "high"]);
const statuses = new Set(["todo", "progress", "done"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(body) {
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) throw clientError("Email and password are required.");
  return { email, password };
}

export function validateTaskCreate(body, workspace) {
  const result = validateTaskFields(body, true);
  const team = workspace.teams.find((candidate) => candidate.id === result.teamId);
  const assignee = workspace.users.find((candidate) => candidate.id === result.assigneeId);
  if (!team) throw clientError("Choose a valid team.");
  if (!assignee || assignee.team_id !== team.id) throw clientError("The assignee must belong to the selected team.");
  return result;
}

export function validateTaskUpdate(body, { manager }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw clientError("A JSON object is required.");
  if (!manager) {
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "status") throw clientError("Employees can only change task status.", 403);
    if (!statuses.has(body.status)) throw clientError("Choose a valid task status.");
    return { status: body.status };
  }
  return validateTaskFields(body, false);
}

function validateTaskFields(body, required) {
  const output = {};
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (required || "title" in body) {
    if (!title || title.length > 100) throw clientError("Task title must contain 1–100 characters.");
    output.title = title;
  }
  if (required || "description" in body) {
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    if (description.length > 2000) throw clientError("Task description must be 2,000 characters or fewer.");
    output.description = description;
  }
  if (required || "teamId" in body) {
    if (typeof body?.teamId !== "string" || !body.teamId) throw clientError("Choose a team.");
    output.teamId = body.teamId;
  }
  if (required || "assigneeId" in body) {
    if (typeof body?.assigneeId !== "string" || !body.assigneeId) throw clientError("Choose an assignee.");
    output.assigneeId = body.assigneeId;
  }
  if (required || "dueDate" in body) {
    if (typeof body?.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) throw clientError("Choose a valid due date.");
    output.dueDate = body.dueDate;
  }
  if (required || "priority" in body) {
    if (!priorities.has(body?.priority)) throw clientError("Choose a valid priority.");
    output.priority = body.priority;
  }
  if ("status" in body) {
    if (!statuses.has(body.status)) throw clientError("Choose a valid task status.");
    output.status = body.status;
  }
  return output;
}

export function validateEmployeeCreate(body, workspace) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  const temporaryPassword = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";
  if (name.length < 2 || name.length > 120) throw clientError("Employee name must contain 2–120 characters.");
  if (!emailPattern.test(email)) throw clientError("Enter a valid email address.");
  if (!workspace.teams.some((team) => team.id === teamId)) throw clientError("Choose a valid team.");
  if (temporaryPassword.length < 10) throw clientError("Temporary password must contain at least 10 characters.");
  return { name, email, teamId, temporaryPassword };
}

export function clientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

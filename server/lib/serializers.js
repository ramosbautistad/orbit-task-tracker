export function serializeUser(user) {
  return {
    id: user.id,
    organizationId: user.organization_id,
    teamId: user.team_id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    mustChangePassword: user.must_change_password,
  };
}

export function serializeTask(task) {
  return {
    id: task.id,
    organizationId: task.organization_id,
    teamId: task.team_id,
    assigneeId: task.assignee_id,
    createdById: task.created_by_id,
    title: task.title,
    description: task.description,
    due: typeof task.due_date === "string" ? task.due_date : task.due_date.toISOString().slice(0, 10),
    priority: task.priority,
    status: task.status,
    completedAt: task.completed_at,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export function serializeWorkspace(workspace) {
  return {
    organization: workspace.organization,
    teams: workspace.teams.map((team) => ({ id: team.id, organizationId: team.organization_id, name: team.name })),
    users: workspace.users.map(serializeUser),
  };
}

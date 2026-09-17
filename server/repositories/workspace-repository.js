export class WorkspaceRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findUserForLogin(email) {
    const result = await this.pool.query(
      `SELECT id, organization_id, team_id, name, email, role, password_hash, must_change_password
       FROM users
       WHERE lower(email) = lower($1) AND active = true
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  }

  async findUserBySessionTokenHash(tokenHash) {
    const result = await this.pool.query(
      `SELECT u.id, u.organization_id, u.team_id, u.name, u.email, u.role, u.must_change_password
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async createSession({ tokenHash, userId, expiresAt }) {
    await this.pool.query(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [tokenHash, userId, expiresAt]
    );
  }

  async deleteSession(tokenHash) {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async getWorkspaceFor(user) {
    const [organizationResult, teamsResult, usersResult] = await Promise.all([
      this.pool.query("SELECT id, name, slug FROM organizations WHERE id = $1", [user.organization_id]),
      this.pool.query("SELECT id, organization_id, name FROM teams WHERE organization_id = $1 ORDER BY name", [user.organization_id]),
      this.pool.query(
        `SELECT id, organization_id, team_id, name, email, role, active
         FROM users WHERE organization_id = $1 AND active = true ORDER BY name`,
        [user.organization_id]
      ),
    ]);

    return {
      organization: organizationResult.rows[0],
      teams: teamsResult.rows,
      users: usersResult.rows,
    };
  }

  async listTasksFor(user) {
    const values = [user.organization_id];
    let assigneeFilter = "";
    if (user.role !== "manager") {
      values.push(user.id);
      assigneeFilter = "AND t.assignee_id = $2";
    }
    const result = await this.pool.query(
      `SELECT t.id, t.organization_id, t.team_id, t.assignee_id, t.created_by_id,
              t.title, t.description, t.due_date, t.priority, t.status,
              t.completed_at, t.created_at, t.updated_at
       FROM tasks t
       WHERE t.organization_id = $1 ${assigneeFilter}
       ORDER BY CASE t.status WHEN 'progress' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END,
                t.due_date ASC, t.created_at DESC`,
      values
    );
    return result.rows;
  }

  async getTaskById(taskId, organizationId) {
    const result = await this.pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND organization_id = $2",
      [taskId, organizationId]
    );
    return result.rows[0] || null;
  }

  async createTask(input, actor) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO tasks (
           organization_id, team_id, assignee_id, created_by_id,
           title, description, due_date, priority
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [actor.organization_id, input.teamId, input.assigneeId, actor.id, input.title, input.description, input.dueDate, input.priority]
      );
      await client.query(
        `INSERT INTO task_events (task_id, organization_id, actor_id, event_type, details)
         VALUES ($1, $2, $3, 'created', $4::jsonb)`,
        [result.rows[0].id, actor.organization_id, actor.id, JSON.stringify({ assigneeId: input.assigneeId, teamId: input.teamId })]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTask(taskId, changes, actor) {
    const taskResult = await this.pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND organization_id = $2",
      [taskId, actor.organization_id]
    );
    const current = taskResult.rows[0];
    if (!current) return null;

    const next = {
      title: changes.title ?? current.title,
      description: changes.description ?? current.description,
      teamId: changes.teamId ?? current.team_id,
      assigneeId: changes.assigneeId ?? current.assignee_id,
      dueDate: changes.dueDate ?? current.due_date,
      priority: changes.priority ?? current.priority,
      status: changes.status ?? current.status,
    };
    const eventType = next.status !== current.status ? "status_changed" : next.assigneeId !== current.assignee_id ? "assigned" : "updated";
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE tasks SET
           title = $3, description = $4, team_id = $5, assignee_id = $6,
           due_date = $7, priority = $8, status = $9,
           completed_at = CASE WHEN $9 = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [taskId, actor.organization_id, next.title, next.description, next.teamId, next.assigneeId, next.dueDate, next.priority, next.status]
      );
      await client.query(
        `INSERT INTO task_events (task_id, organization_id, actor_id, event_type, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [taskId, actor.organization_id, actor.id, eventType, JSON.stringify({ before: current, after: result.rows[0] })]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTask(taskId, actor) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING *",
        [taskId, actor.organization_id]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query(
        `INSERT INTO task_events (task_id, organization_id, actor_id, event_type, details)
         VALUES ($1, $2, $3, 'deleted', $4::jsonb)`,
        [taskId, actor.organization_id, actor.id, JSON.stringify({ deletedTask: result.rows[0] })]
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createEmployee(input, actor) {
    const result = await this.pool.query(
      `INSERT INTO users (organization_id, team_id, name, email, role, password_hash, must_change_password)
       VALUES ($1, $2, $3, lower($4), 'employee', $5, true)
       RETURNING id, organization_id, team_id, name, email, role, active, must_change_password, created_at`,
      [actor.organization_id, input.teamId, input.name, input.email, input.passwordHash]
    );
    return result.rows[0];
  }
}

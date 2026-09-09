import { seedWorkspace } from "../data/seed.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

export class LocalWorkspaceRepository {
  constructor(storage, key = "orbit.workspace.v2") {
    this.storage = storage;
    this.key = key;
  }

  async getWorkspace() {
    try {
      const value = JSON.parse(this.storage.getItem(this.key));
      if (value?.organization && Array.isArray(value.users) && Array.isArray(value.tasks)) return clone(value);
    } catch (_) {
      // Recover with known-good seed data if browser data is malformed.
    }
    const workspace = clone(seedWorkspace);
    this.#save(workspace);
    return workspace;
  }

  async createTask(input, actor) {
    const workspace = await this.getWorkspace();
    const task = {
      id: crypto.randomUUID(),
      organizationId: actor.organizationId,
      createdById: actor.id,
      status: "todo",
      createdAt: new Date().toISOString(),
      ...input,
    };
    workspace.tasks.unshift(task);
    this.#save(workspace);
    return clone(task);
  }

  async updateTask(taskId, changes) {
    const workspace = await this.getWorkspace();
    const task = workspace.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("Task not found.");
    Object.assign(task, changes, { updatedAt: new Date().toISOString() });
    this.#save(workspace);
    return clone(task);
  }

  async deleteTask(taskId) {
    const workspace = await this.getWorkspace();
    const taskCount = workspace.tasks.length;
    workspace.tasks = workspace.tasks.filter((task) => task.id !== taskId);
    if (workspace.tasks.length === taskCount) throw new Error("Task not found.");
    this.#save(workspace);
  }

  #save(workspace) {
    this.storage.setItem(this.key, JSON.stringify(workspace));
  }
}

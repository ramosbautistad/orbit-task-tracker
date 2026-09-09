import {
  canCreateTask,
  canManageTask,
  canUpdateTaskStatus,
  tasksVisibleTo,
  validateTaskInput,
  TASK_STATUSES,
} from "../domain/policies.js";

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const initials = (name) => name.split(" ").map((part) => part[0]).join("");
const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const statusLabel = (status) => ({ todo: "To do", progress: "In progress", done: "Done" })[status];
const formatDate = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));

export class AppController {
  constructor({ repository, auth }) {
    this.repository = repository;
    this.auth = auth;
    this.workspace = null;
    this.currentUser = null;
    this.activeFilter = "all";
    this.activeView = "tasks";
    this.toastTimer = null;
  }

  async start() {
    this.workspace = await this.repository.getWorkspace();
    this.populateLogin();
    this.bindEvents();
    const restoredUser = await this.auth.restore(this.workspace.users);
    if (restoredUser) this.enterWorkspace(restoredUser);
  }

  bindEvents() {
    $("#login-form").addEventListener("submit", (event) => this.handleLogin(event));
    $("#logout-button").addEventListener("click", () => this.handleLogout());
    $("#new-task-button").addEventListener("click", () => this.openTaskDialog());
    $("#close-dialog").addEventListener("click", () => $("#task-dialog").close());
    $("#cancel-dialog").addEventListener("click", () => $("#task-dialog").close());
    $("#task-assignee").addEventListener("change", (event) => this.syncTeamToAssignee(event.target.value));
    $("#task-search").addEventListener("input", () => this.renderTasks());
    $("#task-form").addEventListener("submit", (event) => this.handleSaveTask(event));
    $("#delete-task-button").addEventListener("click", () => this.handleDeleteTask());
    $("#task-list").addEventListener("change", (event) => this.handleStatusChange(event));
    $("#task-list").addEventListener("click", (event) => this.handleTaskAction(event));

    document.querySelectorAll(".nav-item").forEach((button) =>
      button.addEventListener("click", () => this.switchView(button.dataset.view))
    );
    document.querySelectorAll(".tab").forEach((button) =>
      button.addEventListener("click", () => this.setFilter(button.dataset.filter, button))
    );
  }

  populateLogin() {
    $("#user-select").innerHTML = this.workspace.users.map((user) =>
      `<option value="${user.id}">${escapeHtml(user.name)} — ${user.role === "manager" ? "Manager" : "Employee"}</option>`
    ).join("");
  }

  async handleLogin(event) {
    event.preventDefault();
    try {
      const user = await this.auth.signIn({ userId: $("#user-select").value, password: $("#password").value }, this.workspace.users);
      this.enterWorkspace(user);
    } catch (error) {
      this.showToast(error.message);
    }
  }

  enterWorkspace(user) {
    this.currentUser = user;
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    $("#profile-name").textContent = user.name;
    $("#profile-role").textContent = user.role === "manager" ? "Manager" : this.teamById(user.teamId)?.name;
    $("#profile-avatar").textContent = initials(user.name);
    $("#profile-avatar").className = `avatar ${user.color}`;
    this.switchView("tasks");
    this.renderAll();
  }

  async handleLogout() {
    await this.auth.signOut();
    this.currentUser = null;
    $("#app-view").hidden = true;
    $("#login-view").hidden = false;
    $("#password").value = "demo123";
  }

  tasksForCurrentUser() {
    return tasksVisibleTo(this.currentUser, this.workspace.tasks);
  }

  filteredTasks() {
    const query = $("#task-search").value.trim().toLowerCase();
    return this.tasksForCurrentUser().filter((task) => {
      const matchesStatus = this.activeFilter === "all" || task.status === this.activeFilter;
      const matchesQuery = !query || `${task.title} ${task.description}`.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }

  setFilter(filter, selectedTab) {
    if (filter !== "all" && !TASK_STATUSES.includes(filter)) return;
    this.activeFilter = filter;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === selectedTab));
    this.renderTasks();
  }

  switchView(view) {
    this.activeView = view;
    $("#tasks-view").hidden = view !== "tasks";
    $("#team-view").hidden = view !== "team";
    $("#page-title").textContent = view === "tasks" ? (this.currentUser.role === "manager" ? "Team tasks" : "My tasks") : "Team";
    $("#page-eyebrow").textContent = view === "tasks" ? (this.currentUser.role === "manager" ? "Manager workspace" : "Personal workspace") : "Our people";
    $("#new-task-button").hidden = view !== "tasks" || !canCreateTask(this.currentUser);
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  }

  renderAll() {
    this.renderTasks();
    this.renderTeam();
  }

  renderStats() {
    const tasks = this.tasksForCurrentUser();
    const completed = tasks.filter((task) => task.status === "done").length;
    const cards = [
      ["Open tasks", tasks.length - completed, "blue-stat", "↗"],
      ["In progress", tasks.filter((task) => task.status === "progress").length, "gold-stat", "◴"],
      ["Completed", completed, "green-stat", "✓"],
    ];
    $("#stats").innerHTML = cards.map(([label, value, color, icon]) =>
      `<article class="stat-card"><span class="stat-icon ${color}">${icon}</span><div><strong>${value}</strong><small>${label}</small></div></article>`
    ).join("");
  }

  renderTasks() {
    this.renderStats();
    const tasks = this.filteredTasks();
    $("#task-list").innerHTML = tasks.map((task) => this.taskRow(task)).join("");
    $("#empty-state").hidden = tasks.length > 0;
    $("#task-list").closest("table").hidden = tasks.length === 0;
  }

  taskRow(task) {
    const assignee = this.userById(task.assigneeId);
    const editAction = canManageTask(this.currentUser, task)
      ? `<button data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.title)}">•••</button>`
      : "";
    return `<tr>
      <td><div class="task-name"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description || "No description")}</small></div></td>
      <td><div class="person"><span class="avatar avatar-small ${assignee.color}">${initials(assignee.name)}</span><span>${escapeHtml(assignee.name)}</span></div></td>
      <td><span class="due-date">${formatDate(task.due)}</span></td>
      <td><span class="priority priority-${task.priority}"><i></i>${titleCase(task.priority)}</span></td>
      <td><select class="status-select status-${task.status}" data-action="status" data-id="${task.id}" aria-label="Change status for ${escapeHtml(task.title)}" ${canUpdateTaskStatus(this.currentUser, task) ? "" : "disabled"}><option value="todo" ${task.status === "todo" ? "selected" : ""}>To do</option><option value="progress" ${task.status === "progress" ? "selected" : ""}>In progress</option><option value="done" ${task.status === "done" ? "selected" : ""}>Done</option></select></td>
      <td class="row-actions">${editAction}</td>
    </tr>`;
  }

  renderTeam() {
    $("#member-count").textContent = `${this.workspace.users.length} members`;
    $("#team-grid").innerHTML = this.workspace.users.map((user) => {
      const open = this.workspace.tasks.filter((task) => task.assigneeId === user.id && task.status !== "done").length;
      return `<article class="member-card"><span class="avatar avatar-large ${user.color}">${initials(user.name)}</span><div class="member-title"><h3>${escapeHtml(user.name)}</h3>${user.role === "manager" ? '<span class="role-pill">Manager</span>' : ""}</div><p>${escapeHtml(user.email)}</p><div class="member-meta"><span>${escapeHtml(this.teamById(user.teamId).name)}</span><span>${open} open ${open === 1 ? "task" : "tasks"}</span></div></article>`;
    }).join("");
  }

  openTaskDialog(task = null) {
    if (!canCreateTask(this.currentUser)) return;
    $("#dialog-title").textContent = task ? "Edit task" : "Create a task";
    $("#task-id").value = task?.id || "";
    $("#task-title").value = task?.title || "";
    $("#task-description").value = task?.description || "";
    $("#task-due").value = task?.due || new Date(Date.now() + 259200000).toISOString().slice(0, 10);
    $("#task-priority").value = task?.priority || "medium";
    $("#task-assignee").innerHTML = this.workspace.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
    $("#task-team").innerHTML = this.workspace.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)}</option>`).join("");
    $("#task-assignee").value = task?.assigneeId || this.workspace.users.find((user) => user.role === "employee").id;
    $("#task-team").value = task?.teamId || this.userById($("#task-assignee").value).teamId;
    $("#delete-task-button").hidden = !task;
    $("#task-dialog").showModal();
    $("#task-title").focus();
  }

  syncTeamToAssignee(userId) {
    $("#task-team").value = this.userById(userId)?.teamId || "";
  }

  async handleSaveTask(event) {
    event.preventDefault();
    try {
      const id = $("#task-id").value;
      const input = validateTaskInput({
        title: $("#task-title").value,
        description: $("#task-description").value,
        assigneeId: $("#task-assignee").value,
        teamId: $("#task-team").value,
        due: $("#task-due").value,
        priority: $("#task-priority").value,
      }, this.workspace);

      if (id) {
        const task = this.taskById(id);
        if (!canManageTask(this.currentUser, task)) throw new Error("You do not have permission to edit this task.");
        await this.repository.updateTask(id, input);
      } else {
        if (!canCreateTask(this.currentUser)) throw new Error("Only managers can assign tasks.");
        await this.repository.createTask(input, this.currentUser);
      }
      await this.refreshWorkspace();
      $("#task-dialog").close();
      this.showToast(id ? "Task updated." : `Task assigned to ${this.userById(input.assigneeId).name}.`);
    } catch (error) {
      this.showToast(error.message);
    }
  }

  async handleDeleteTask() {
    const task = this.taskById($("#task-id").value);
    if (!task || !canManageTask(this.currentUser, task)) return this.showToast("You do not have permission to delete this task.");
    await this.repository.deleteTask(task.id);
    await this.refreshWorkspace();
    $("#task-dialog").close();
    this.showToast("Task deleted.");
  }

  async handleStatusChange(event) {
    if (event.target.dataset.action !== "status") return;
    const task = this.taskById(event.target.dataset.id);
    if (!task || !canUpdateTaskStatus(this.currentUser, task) || !TASK_STATUSES.includes(event.target.value)) {
      this.renderTasks();
      return this.showToast("You do not have permission to update this task.");
    }
    await this.repository.updateTask(task.id, { status: event.target.value });
    await this.refreshWorkspace();
    this.showToast(`“${task.title}” moved to ${statusLabel(event.target.value).toLowerCase()}.`);
  }

  handleTaskAction(event) {
    const button = event.target.closest("button[data-action='edit']");
    if (!button) return;
    const task = this.taskById(button.dataset.id);
    if (task && canManageTask(this.currentUser, task)) this.openTaskDialog(task);
  }

  async refreshWorkspace() {
    this.workspace = await this.repository.getWorkspace();
    this.currentUser = this.userById(this.currentUser.id);
    this.renderAll();
  }

  userById(id) { return this.workspace.users.find((user) => user.id === id); }
  teamById(id) { return this.workspace.teams.find((team) => team.id === id); }
  taskById(id) { return this.workspace.tasks.find((task) => task.id === id); }

  showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
}

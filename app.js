const STORAGE_KEY = "simpleTodo.tasks";

const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const todoFeedback = document.querySelector("#todo-feedback");

let tasks = loadTasks();

function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks);
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(text) {
  return {
    id: Date.now().toString(),
    text,
    completed: false,
  };
}

function addTask(text) {
  tasks.push(createTask(text));
  saveTasks();
  renderTasks();
  showFeedback("Task added.");
}

function toggleTask(taskId) {
  tasks = tasks.map(function (task) {
    if (task.id === taskId) {
      return {
        id: task.id,
        text: task.text,
        completed: !task.completed,
      };
    }

    return task;
  });

  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });

  saveTasks();
  renderTasks();
  showFeedback("Task deleted.");
}

function updateSummary() {
  const totalTasks = tasks.length;
  const incompleteTasks = tasks.filter(function (task) {
    return !task.completed;
  }).length;

  emptyState.hidden = totalTasks > 0;
  taskCount.textContent =
    incompleteTasks === 1
      ? "1 task remaining"
      : incompleteTasks + " tasks remaining";
}

function showFeedback(message) {
  todoFeedback.textContent = message;
}

function renderTasks() {
  todoList.innerHTML = "";

  tasks.forEach(function (task) {
    const taskItem = document.createElement("li");
    taskItem.className = "todo-item";

    if (task.completed) {
      taskItem.classList.add("completed");
    }

    const taskToggle = document.createElement("input");
    taskToggle.type = "checkbox";
    taskToggle.className = "task-toggle";
    taskToggle.checked = task.completed;
    taskToggle.setAttribute("aria-label", "Mark " + task.text + " complete");
    taskToggle.addEventListener("change", function () {
      toggleTask(task.id);
    });

    const taskText = document.createElement("span");
    taskText.className = "task-text";
    taskText.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deleteTask(task.id);
    });

    taskItem.append(taskToggle, taskText, deleteButton);
    todoList.appendChild(taskItem);
  });

  updateSummary();
}

todoForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const taskText = todoInput.value.trim();

  if (taskText === "") {
    showFeedback("Enter a task before adding it.");
    return;
  }

  addTask(taskText);
  todoInput.value = "";
  todoInput.focus();
});

renderTasks();

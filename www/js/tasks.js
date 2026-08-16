/**
 * Aether Academic - Tasks Board & Kanban Controls
 */
const KanbanView = {
    draggedCardElement: null,

    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Add task modal triggers
        document.getElementById("btn-add-task").addEventListener("click", () => {
            this.openModal();
        });

        // Close triggers
        document.getElementById("btn-close-task-modal").addEventListener("click", () => this.closeModal());
        document.getElementById("btn-cancel-task").addEventListener("click", () => this.closeModal());

        // Save trigger
        document.getElementById("task-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Setup Drag & Drop listeners for columns
        document.querySelectorAll(".kanban-column").forEach(col => {
            col.addEventListener("dragover", (e) => {
                e.preventDefault();
                col.classList.add("drag-hover");
            });

            col.addEventListener("dragleave", () => {
                col.classList.remove("drag-hover");
            });

            col.addEventListener("drop", (e) => {
                e.preventDefault();
                col.classList.remove("drag-hover");

                if (this.draggedCardElement) {
                    const taskId = this.draggedCardElement.getAttribute("data-id");
                    const targetStatus = col.getAttribute("data-status");
                    this.updateTaskStatus(taskId, targetStatus);
                }
            });
        });

        // Initial task cards refresh
        this.render();
    },

    openModal(taskObj = null) {
        const form = document.getElementById("task-form");
        form.reset();

        const titleEl = document.getElementById("task-modal-title");
        const submitBtn = document.getElementById("btn-submit-task");

        if (taskObj) {
            titleEl.textContent = "Edit Task Card";
            submitBtn.textContent = "Save Changes";

            document.getElementById("edit-task-id").value = taskObj.id;
            document.getElementById("task-title").value = taskObj.title;
            document.getElementById("task-priority").value = taskObj.priority;
            document.getElementById("task-due").value = taskObj.dueDate;
            document.getElementById("task-status").value = taskObj.status;
        } else {
            titleEl.textContent = "Create Task Card";
            submitBtn.textContent = "Create Task";
            document.getElementById("edit-task-id").value = "";

            // Standard baseline target dates helper
            document.getElementById("task-due").value = "2026-08-15";
        }

        document.getElementById("modal-task").classList.add("active");
    },

    closeModal() {
        document.getElementById("modal-task").classList.remove("active");
    },

    saveTask() {
        const id = document.getElementById("edit-task-id").value;
        const title = document.getElementById("task-title").value.trim();
        const priority = document.getElementById("task-priority").value;
        const due = document.getElementById("task-due").value;
        const status = document.getElementById("task-status").value;

        const tasks = Store.getAllTasks();

        if (id) {
            // Edit task
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                const oldStatus = tasks[idx].status;
                tasks[idx].title = title;
                tasks[idx].priority = priority;
                tasks[idx].dueDate = due;
                tasks[idx].status = status;

                // Sync Supabase
                if (supabaseClient) {
                    supabaseClient.from('tasks').update({
                        title: title,
                        priority: priority,
                        due_date: due,
                        status: status
                    }).eq('id', id).then(({ error }) => { if (error) console.error("Supabase task edit error:", error); });
                }

                // If updated status to done, reward stats points
                if (status === "done" && oldStatus !== "done") {
                    this.incrementCompletedTasksStats();
                }
            }
        } else {
            // Create task
            const newTask = {
                id: "task_" + Date.now(),
                userId: AppState.currentUser.id,
                title: title,
                priority: priority,
                status: status,
                dueDate: due
            };
            tasks.push(newTask);

            // Sync Supabase
            if (supabaseClient) {
                supabaseClient.from('tasks').insert({
                    id: newTask.id,
                    user_id: newTask.userId,
                    title: newTask.title,
                    priority: newTask.priority,
                    status: newTask.status,
                    due_date: newTask.dueDate
                }).then(({ error }) => { if (error) console.error("Supabase new task error:", error); });
            }

            if (status === "done") {
                this.incrementCompletedTasksStats();
            }
        }

        Store.saveAllTasks(tasks);
        this.closeModal();
        this.render();
    },

    async deleteTask(taskId) {
        const confirmed = await Alerts.confirm("Remove Task", "Remove this task card from your Kanban board?", "Delete");
        if (confirmed) {
            const tasks = Store.getAllTasks().filter(t => t.id !== taskId);
            Store.saveAllTasks(tasks);

            if (supabaseClient) {
                supabaseClient.from('tasks').delete().eq('id', taskId)
                    .then(({ error }) => { if (error) console.error("Supabase delete task error:", error); });
            }

            this.render();
            Alerts.success("Task Removed", "Task successfully removed from board.");
        }
    },

    updateTaskStatus(taskId, targetStatus) {
        const tasks = Store.getAllTasks();
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            const oldStatus = tasks[idx].status;
            tasks[idx].status = targetStatus;

            if (supabaseClient) {
                supabaseClient.from('tasks').update({ status: targetStatus }).eq('id', taskId)
                    .then(({ error }) => { if (error) console.error("Supabase task status update error:", error); });
            }

            // Reward stats on done transitions
            if (targetStatus === "done" && oldStatus !== "done") {
                this.incrementCompletedTasksStats();
            }

            Store.saveAllTasks(tasks);
            this.render();
        }
    },

    incrementCompletedTasksStats() {
        const users = Store.getAllUsers();
        const userIdx = users.findIndex(u => u.id === AppState.currentUser.id);
        if (userIdx !== -1) {
            users[userIdx].stats.completedTasks = (users[userIdx].stats.completedTasks || 0) + 1;
            Store.saveAllUsers(users);
            AppState.currentUser = users[userIdx];

            if (supabaseClient) {
                supabaseClient.from('users').update({ stats: users[userIdx].stats }).eq('id', AppState.currentUser.id)
                    .then(({ error }) => { if (error) console.error("Supabase stats save failed:", error); });
            }
        }
    },

    render() {
        const todoList = document.getElementById("tasks-todo-list");
        const progressList = document.getElementById("tasks-progress-list");
        const doneList = document.getElementById("tasks-done-list");

        todoList.innerHTML = "";
        progressList.innerHTML = "";
        doneList.innerHTML = "";

        const user = AppState.currentUser;
        if (!user) return;

        const tasks = Store.getAllTasks().filter(t => t.userId === user.id);

        tasks.forEach(t => {
            const card = document.createElement("div");
            card.className = "task-card";
            card.setAttribute("draggable", "true");
            card.setAttribute("data-id", t.id);

            card.innerHTML = `
                <div class="task-card-header">
                    <span class="task-priority-pill priority-${t.priority}">${t.priority}</span>
                </div>
                <p>${t.title}</p>
                <div class="task-card-footer">
                    <span class="task-due-date"><i class="fa-regular fa-clock"></i> ${t.dueDate}</span>
                    <div class="task-actions">
                        ${t.status !== 'todo' ? '<button class="action-btn btn-mv-left" title="Move Left"><i class="fa-solid fa-arrow-left"></i></button>' : ''}
                        <button class="action-btn btn-task-edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete btn-task-del" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                        ${t.status !== 'done' ? '<button class="action-btn btn-mv-right" title="Move Right"><i class="fa-solid fa-arrow-right"></i></button>' : ''}
                    </div>
                </div>
            `;

            // Setup movement arrows for mobile/tablets comfort
            if (t.status !== 'todo') {
                card.querySelector(".btn-mv-left").addEventListener("click", () => {
                    const prev = t.status === "done" ? "progress" : "todo";
                    this.updateTaskStatus(t.id, prev);
                });
            }
            if (t.status !== 'done') {
                card.querySelector(".btn-mv-right").addEventListener("click", () => {
                    const next = t.status === "todo" ? "progress" : "done";
                    this.updateTaskStatus(t.id, next);
                });
            }

            card.querySelector(".btn-task-edit").addEventListener("click", () => this.openModal(t));
            card.querySelector(".btn-task-del").addEventListener("click", () => this.deleteTask(t.id));

            // Drag and Drop card handles
            card.addEventListener("dragstart", () => {
                card.classList.add("dragging");
                this.draggedCardElement = card;
            });
            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                this.draggedCardElement = null;
            });

            // Append cards to columns
            if (t.status === "todo") todoList.appendChild(card);
            else if (t.status === "progress") progressList.appendChild(card);
            else if (t.status === "done") doneList.appendChild(card);
        });

        // Refresh count titles
        document.getElementById("todo-count").textContent = todoList.children.length;
        document.getElementById("progress-count").textContent = progressList.children.length;
        document.getElementById("done-count").textContent = doneList.children.length;
    }
};

function initTasks() {
    // Authenticate user session
    checkAuth();

    // Start Kanban View
    KanbanView.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTasks);
} else {
    initTasks();
}

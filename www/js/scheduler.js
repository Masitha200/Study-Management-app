/**
 * Aether Academic - Study Scheduler & Calendar Controls
 */
const CalendarView = {
    currentWeekStart: new Date("2026-08-09T00:00:00"), // Start date boundaries

    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Populate subject lists
        populateSubjectDropdowns();

        // Initialize start date
        this.currentWeekStart = this.getStartOfWeek(AppState.currentDateInView);

        // Previous week/month button click
        document.getElementById("btn-prev-week").addEventListener("click", () => {
            if (AppState.calendarMode === "weekly") {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            } else {
                this.currentWeekStart.setMonth(this.currentWeekStart.getMonth() - 1);
            }
            this.render();
        });

        // Next week/month button click
        document.getElementById("btn-next-week").addEventListener("click", () => {
            if (AppState.calendarMode === "weekly") {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            } else {
                this.currentWeekStart.setMonth(this.currentWeekStart.getMonth() + 1);
            }
            this.render();
        });

        // Add Schedule modal trigger
        document.getElementById("btn-add-schedule").addEventListener("click", () => {
            this.openModal();
        });

        // Modal actions
        document.getElementById("btn-close-schedule-modal").addEventListener("click", () => this.closeModal());
        document.getElementById("btn-cancel-schedule").addEventListener("click", () => this.closeModal());

        document.getElementById("schedule-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveSession();
        });

        // Toggle reschedule row based on status selection
        const statusSelect = document.getElementById("schedule-status");
        if (statusSelect) {
            statusSelect.addEventListener("change", (e) => {
                const rescheduleRow = document.getElementById("reschedule-date-row");
                if (rescheduleRow) {
                    if (e.target.value === "skipped") {
                        rescheduleRow.style.display = "flex";

                        // Set tomorrow's date as default
                        const schedDateVal = document.getElementById("schedule-date").value;
                        if (schedDateVal) {
                            const d = new Date(schedDateVal);
                            d.setDate(d.getDate() + 1);
                            document.getElementById("reschedule-date").value = formatDateYMD(d);
                        } else {
                            document.getElementById("reschedule-date").value = formatDateYMD(new Date());
                        }
                        document.getElementById("reschedule-time").value = document.getElementById("schedule-time").value || "10:00";
                    } else {
                        rescheduleRow.style.display = "none";
                        document.getElementById("reschedule-date").value = "";
                        document.getElementById("reschedule-time").value = "";
                    }
                }
            });
        }

        // Search & Filter controls
        document.getElementById("scheduler-search").addEventListener("input", () => this.renderListTable());
        document.getElementById("scheduler-filter-subject").addEventListener("change", () => this.renderListTable());

        // Weekly / Monthly View toggles
        document.getElementById("btn-weekly-view").addEventListener("click", () => {
            AppState.calendarMode = "weekly";
            document.getElementById("btn-weekly-view").classList.add("active");
            document.getElementById("btn-monthly-view").classList.remove("active");

            const body = document.getElementById("week-grid-body");
            body.classList.add("transitioning");
            setTimeout(() => body.classList.remove("transitioning"), 400);

            this.render();
        });

        document.getElementById("btn-monthly-view").addEventListener("click", () => {
            AppState.calendarMode = "monthly";
            document.getElementById("btn-weekly-view").classList.remove("active");
            document.getElementById("btn-monthly-view").classList.add("active");

            const body = document.getElementById("week-grid-body");
            body.classList.add("transitioning");
            setTimeout(() => body.classList.remove("transitioning"), 400);

            this.render();
        });

        // Manage Subjects modal trigger
        document.getElementById("btn-manage-subjects").addEventListener("click", () => {
            this.openSubjectsModal();
        });

        document.getElementById("btn-close-subjects-modal").addEventListener("click", () => {
            this.closeSubjectsModal();
        });

        document.getElementById("btn-done-subjects").addEventListener("click", () => {
            this.closeSubjectsModal();
        });

        // Subject creation submit
        document.getElementById("subject-manager-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.addCustomSubject();
        });

        // Populate database grid
        this.render();
    },

    getStartOfWeek(date) {
        const temp = new Date(date);
        const day = temp.getDay();
        const diff = temp.getDate() - day; // adjust when day is Sunday
        return new Date(temp.setDate(diff));
    },

    openModal(sessionObj = null) {
        const form = document.getElementById("schedule-form");
        form.reset();

        const titleEl = document.getElementById("schedule-modal-title");
        const submitBtn = document.getElementById("btn-submit-schedule");

        // Hide reschedule row initially
        const rescheduleRow = document.getElementById("reschedule-date-row");
        if (rescheduleRow) {
            rescheduleRow.style.display = "none";
        }
        const reschedDate = document.getElementById("reschedule-date");
        if (reschedDate) reschedDate.value = "";
        const reschedTime = document.getElementById("reschedule-time");
        if (reschedTime) reschedTime.value = "";

        if (sessionObj) {
            titleEl.textContent = "Edit Study Session";
            submitBtn.textContent = "Save Changes";

            document.getElementById("edit-schedule-id").value = sessionObj.id;
            document.getElementById("schedule-subject").value = sessionObj.subject;
            document.getElementById("schedule-title").value = sessionObj.title;
            document.getElementById("schedule-date").value = sessionObj.date;
            document.getElementById("schedule-time").value = sessionObj.startTime;
            document.getElementById("schedule-duration").value = sessionObj.duration;
            document.getElementById("schedule-status").value = sessionObj.status;
        } else {
            titleEl.textContent = "Schedule Study Session";
            submitBtn.textContent = "Create Session";
            document.getElementById("edit-schedule-id").value = "";

            // Default dates setup
            document.getElementById("schedule-date").value = "2026-08-15";
            document.getElementById("schedule-time").value = "10:00";
        }

        document.getElementById("modal-schedule").classList.add("active");
    },

    closeModal() {
        document.getElementById("modal-schedule").classList.remove("active");
    },

    saveSession() {
        const id = document.getElementById("edit-schedule-id").value;
        const subject = document.getElementById("schedule-subject").value;
        const title = document.getElementById("schedule-title").value.trim();
        const dateInput = document.getElementById("schedule-date").value;
        const timeInput = document.getElementById("schedule-time").value;
        const duration = document.getElementById("schedule-duration").value;
        const status = document.getElementById("schedule-status").value;

        const schedules = Store.getAllSchedules();

        if (id) {
            // Edit mode
            const idx = schedules.findIndex(s => s.id === id);
            if (idx !== -1) {
                schedules[idx].subject = subject;
                schedules[idx].title = title;
                schedules[idx].date = dateInput;
                schedules[idx].startTime = timeInput;
                schedules[idx].duration = parseInt(duration);
                schedules[idx].status = status;

                if (supabaseClient) {
                    supabaseClient.from('schedules').update({
                        subject: subject,
                        title: title,
                        date: dateInput,
                        start_time: timeInput,
                        duration: parseInt(duration),
                        status: status
                    }).eq('id', id).then(({ error }) => { if (error) console.error("Supabase schedule update error:", error); });
                }
            }
        } else {
            // New mode
            const newSession = {
                id: "sched_" + Date.now(),
                userId: AppState.currentUser.id,
                subject: subject,
                title: title,
                date: dateInput,
                startTime: timeInput,
                duration: parseInt(duration),
                status: status
            };
            schedules.push(newSession);

            if (supabaseClient) {
                supabaseClient.from('schedules').insert({
                    id: newSession.id,
                    user_id: newSession.userId,
                    subject: newSession.subject,
                    title: newSession.title,
                    date: newSession.date,
                    start_time: newSession.startTime,
                    duration: newSession.duration,
                    status: newSession.status
                }).then(({ error }) => { if (error) console.error("Supabase schedule insert error:", error); });
            }
        }

        // Handle duplication/rescheduling if session is set to skipped and a new date is entered
        const reschedDateVal = document.getElementById("reschedule-date") ? document.getElementById("reschedule-date").value : "";
        const reschedTimeVal = document.getElementById("reschedule-time") ? document.getElementById("reschedule-time").value : "";

        let alertMsg = "Study session saved successfully.";

        if (status === "skipped" && reschedDateVal) {
            const newReschedSession = {
                id: "sched_" + (Date.now() + 1), // Offset slightly to guarantee uniqueness
                userId: AppState.currentUser.id,
                subject: subject,
                title: title + " (Rescheduled)",
                date: reschedDateVal,
                startTime: reschedTimeVal || timeInput,
                duration: parseInt(duration),
                status: "upcoming"
            };
            schedules.push(newReschedSession);

            if (supabaseClient) {
                supabaseClient.from('schedules').insert({
                    id: newReschedSession.id,
                    user_id: newReschedSession.userId,
                    subject: newReschedSession.subject,
                    title: newReschedSession.title,
                    date: newReschedSession.date,
                    start_time: newReschedSession.startTime,
                    duration: newReschedSession.duration,
                    status: newReschedSession.status
                }).then(({ error }) => { if (error) console.error("Supabase reschedule insert error:", error); });
            }
            alertMsg = `Original session marked as skipped & rescheduled to ${reschedDateVal}.`;
        }

        Store.saveAllSchedules(schedules);
        this.closeModal();
        this.render();
        Alerts.success("Schedule Updated", alertMsg);
    },

    async deleteSession(sessionId) {
        const confirmed = await Alerts.confirm("Delete Study Session", "Are you sure you want to delete this study session?", "Delete");
        if (confirmed) {
            const schedules = Store.getAllSchedules().filter(s => s.id !== sessionId);
            Store.saveAllSchedules(schedules);

            if (supabaseClient) {
                supabaseClient.from('schedules').delete().eq('id', sessionId)
                    .then(({ error }) => { if (error) console.error("Supabase schedule delete error:", error); });
            }

            this.render();
            Alerts.success("Session Deleted", "Study session record removed.");
        }
    },

    render() {
        this.renderCalendarGrid();
        this.renderListTable();
    },

    renderCalendarGrid() {
        const headers = document.getElementById("week-headers-row");
        const body = document.getElementById("week-grid-body");
        const gridContainer = document.querySelector(".scheduler-weekly-grid");

        headers.innerHTML = "";
        body.innerHTML = "";

        const user = AppState.currentUser;
        const schedules = Store.getAllSchedules().filter(s => s.userId === user.id);
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        if (AppState.calendarMode === "weekly") {
            gridContainer.classList.remove("monthly-mode");

            // --- WEEKLY VIEW LOGIC ---
            const startOfWeek = new Date(this.currentWeekStart);

            // Compute title context
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            const options = { month: 'short', day: 'numeric' };
            const calendarTitle = `${startOfWeek.toLocaleDateString('en-US', options)} – ${endOfWeek.toLocaleDateString('en-US', options)}, 2026`;
            document.getElementById("calendar-header-title").textContent = calendarTitle;

            // Load week days
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + i);
                const dateStringYMD = formatDateYMD(currentDay);

                // Build header column
                const isTodayNode = dateStringYMD === formatDateYMD(new Date());
                const headerItem = document.createElement("div");
                headerItem.className = `day-header ${isTodayNode ? "today" : ""}`;
                headerItem.innerHTML = `
                    <span class="day-name">${weekDays[i]}</span>
                    <span class="day-num">${currentDay.getDate()}</span>
                `;
                headers.appendChild(headerItem);

                // Build week day column cell
                const columnCell = document.createElement("div");
                columnCell.className = `cal-day-column ${isTodayNode ? "today-col" : ""}`;
                columnCell.setAttribute("data-date", dateStringYMD);

                const mobileLabel = document.createElement("div");
                mobileLabel.className = "mobile-day-label";
                mobileLabel.innerHTML = `
                    <span class="mobile-day-name">${weekDays[i]}</span>
                    <span class="mobile-day-num">${currentDay.getDate()}</span>
                `;
                columnCell.appendChild(mobileLabel);

                columnCell.addEventListener("click", (e) => {
                    if (!e.target.closest('.cal-session-node')) {
                        this.openModal();
                        document.getElementById("schedule-date").value = dateStringYMD;
                    }
                });

                // Filter events matching date
                const daysEvents = schedules.filter(s => s.date === dateStringYMD);
                daysEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

                daysEvents.forEach(eObj => {
                    const node = document.createElement("div");
                    node.className = `cal-session-node`;

                    const subjObj = Store.getAllSubjects().find(s => s.id === eObj.subject) || { color: "#6b7280" };
                    node.style.borderLeftColor = subjObj.color;
                    node.style.background = `rgba(${hexToRgb(subjObj.color)}, 0.08)`;

                    const timeStr = this.formatTime12hr(eObj.startTime);
                    node.innerHTML = `
                        <div class="cal-node-time" style="color: ${subjObj.color}">${timeStr} (${eObj.duration}m)</div>
                        <div class="cal-node-title">${eObj.title}</div>
                    `;

                    node.addEventListener("click", (ev) => {
                        ev.stopPropagation();
                        this.openModal(eObj);
                    });

                    columnCell.appendChild(node);
                });

                body.appendChild(columnCell);
            }
        } else {
            gridContainer.classList.add("monthly-mode");

            // --- MONTHLY VIEW LOGIC ---
            const targetDate = new Date(this.currentWeekStart);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();

            const monthName = targetDate.toLocaleDateString("en-US", { month: "long" });
            document.getElementById("calendar-header-title").textContent = `${monthName} ${year}`;

            // Render day headers (Sun-Sat)
            for (let i = 0; i < 7; i++) {
                const headerItem = document.createElement("div");
                headerItem.className = "day-header day-header-month";
                headerItem.innerHTML = `<span class="day-name">${weekDays[i]}</span>`;
                headers.appendChild(headerItem);
            }

            // Get first day of current month
            const firstDateOfMonth = new Date(year, month, 1);
            const startDayOfWeek = firstDateOfMonth.getDay();

            const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

            const prevMonthDate = new Date(year, month, 0);
            const totalDaysInPrevMonth = prevMonthDate.getDate();

            const cells = [];

            // Add previous month days (faded)
            for (let i = startDayOfWeek - 1; i >= 0; i--) {
                const fallbackDate = new Date(year, month - 1, totalDaysInPrevMonth - i);
                cells.push({
                    date: fallbackDate,
                    currentMonth: false
                });
            }

            // Add current month days
            for (let i = 1; i <= totalDaysInMonth; i++) {
                cells.push({
                    date: new Date(year, month, i),
                    currentMonth: true
                });
            }

            // Add next month padding days to round up to multiple of 7
            const totalCellsNeeded = Math.ceil(cells.length / 7) * 7;
            const nextMonthDaysToAdd = totalCellsNeeded - cells.length;
            for (let i = 1; i <= nextMonthDaysToAdd; i++) {
                cells.push({
                    date: new Date(year, month + 1, i),
                    currentMonth: false
                });
            }

            // Draw month cells
            cells.forEach(cell => {
                const dateYMD = formatDateYMD(cell.date);
                const isTodayNode = dateYMD === formatDateYMD(new Date());

                const cellNode = document.createElement("div");
                cellNode.className = `cal-day-column cal-month-cell ${cell.currentMonth ? "" : "out-of-bounds"} ${isTodayNode ? "today-col" : ""}`;
                cellNode.setAttribute("data-date", dateYMD);

                const dayNumBadge = document.createElement("span");
                dayNumBadge.className = `cell-day-number ${isTodayNode ? "today-badge" : ""}`;
                dayNumBadge.textContent = cell.date.getDate();
                cellNode.appendChild(dayNumBadge);

                cellNode.addEventListener("click", (e) => {
                    if (!e.target.closest('.cal-session-node')) {
                        this.openModal();
                        document.getElementById("schedule-date").value = dateYMD;
                    }
                });

                const daysEvents = schedules.filter(s => s.date === dateYMD);
                daysEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

                const maxEventsShow = 2;
                daysEvents.slice(0, maxEventsShow).forEach(eObj => {
                    const node = document.createElement("div");
                    node.className = `cal-session-node cal-session-node-month`;

                    const subjObj = Store.getAllSubjects().find(s => s.id === eObj.subject) || { color: "#6b7280" };
                    node.style.borderLeftColor = subjObj.color;
                    node.style.background = `rgba(${hexToRgb(subjObj.color)}, 0.06)`;

                    node.innerHTML = `<span class="month-node-title" style="color: ${subjObj.color}">${eObj.title}</span>`;

                    node.addEventListener("click", (ev) => {
                        ev.stopPropagation();
                        this.openModal(eObj);
                    });

                    cellNode.appendChild(node);
                });

                if (daysEvents.length > maxEventsShow) {
                    const moreIndicator = document.createElement("div");
                    moreIndicator.className = "month-more-indicator";
                    moreIndicator.textContent = `+${daysEvents.length - maxEventsShow} more`;
                    cellNode.appendChild(moreIndicator);
                }

                body.appendChild(cellNode);
            });
        }
    },

    openSubjectsModal() {
        this.renderSubjectsDirectory();
        document.getElementById("modal-subjects").classList.add("active");
    },

    closeSubjectsModal() {
        document.getElementById("modal-subjects").classList.remove("active");
        populateSubjectDropdowns();
        this.render();
    },

    addCustomSubject() {
        const nameInput = document.getElementById("new-subject-name");
        const colorInput = document.getElementById("new-subject-color");

        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) return;

        // Prefix ID with current user ID to avoid collision with other users' custom subjects in the primary key
        const id = AppState.currentUser.id + "_" + name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

        const subjects = Store.getAllSubjects();
        if (subjects.some(s => s.id === id || s.name.toLowerCase() === name.toLowerCase())) {
            Alerts.error("Duplicate Subject", "A subject with this name already exists!");
            return;
        }

        const newSub = { id, name, color, user_id: AppState.currentUser.id };
        const allSubjects = Store.get("subjects", DEFAULT_SUBJECTS);
        allSubjects.push(newSub);
        Store.saveAllSubjects(allSubjects);

        if (supabaseClient) {
            supabaseClient.from('subjects').insert({
                id: newSub.id,
                name: newSub.name,
                color: newSub.color,
                user_id: newSub.user_id
            }).then(({ error }) => { if (error) console.error("Supabase subject insert error:", error); });
        }

        nameInput.value = "";
        colorInput.value = "#8b5cf6";

        this.renderSubjectsDirectory();
        populateSubjectDropdowns();
        Alerts.success("Subject Added", `Course subject "${name}" added successfully!`);
    },

    async deleteCustomSubject(subjId) {
        const subjects = Store.getAllSubjects();
        if (subjects.length <= 1) {
            Alerts.error("Cannot Delete", "Error: You must keep at least one subject in the system!");
            return;
        }

        const confirmed = await Alerts.confirm(
            "Delete Subject",
            `Are you sure you want to delete the subject "${subjId.replace(/^(user_[0-9]+_)/g, '').replace(/_/g, ' ')}"? Any schedules linked to this subject will revert to general study.`,
            "Delete"
        );

        if (confirmed) {
            // Remove from full database cache
            const allSubjects = Store.get("subjects", DEFAULT_SUBJECTS).filter(s => s.id !== subjId);
            Store.saveAllSubjects(allSubjects);

            // Revert schedules to first available subject (from current user's available subjects)
            const userSubjects = Store.getAllSubjects();
            const schedules = Store.getAllSchedules();
            schedules.forEach(s => {
                if (s.subject === subjId) s.subject = userSubjects[0].id;
            });
            Store.saveAllSchedules(schedules);

            if (supabaseClient) {
                supabaseClient.from('subjects').delete().eq('id', subjId)
                    .then(({ error }) => { if (error) console.error("Supabase subject delete error:", error); });

                schedules.forEach(s => {
                    if (s.subject === userSubjects[0].id) {
                        supabaseClient.from('schedules').update({ subject: userSubjects[0].id }).eq('id', s.id)
                            .then(({ error }) => { if (error) console.error("Supabase schedules subject update error:", error); });
                    }
                });
            }

            this.renderSubjectsDirectory();
            populateSubjectDropdowns();
            Alerts.success("Subject Deleted", "Subject removed successfully.");
        }
    },

    renderSubjectsDirectory() {
        const container = document.getElementById("subjects-directory-list");
        if (!container) return;
        container.innerHTML = "";

        const subjects = Store.getAllSubjects();
        subjects.forEach(s => {
            const item = document.createElement("div");
            item.className = "subject-dir-item";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.justifyContent = "space-between";
            item.style.background = "rgba(255, 255, 255, 0.02)";
            item.style.padding = "10px 14px";
            item.style.borderRadius = "8px";
            item.style.border = "1px solid var(--border-glass)";

            const isDefault = !s.user_id;

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${s.color}; box-shadow: 0 0 6px ${s.color};"></span>
                    <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-primary);">${s.name} ${isDefault ? '<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(Default)</span>' : ''}</span>
                </div>
                ${isDefault ? '' : `
                <button class="action-btn delete btn-delete-subject" title="Delete Subject" style="width: 26px; height: 26px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-trash"></i>
                </button>
                `}
            `;

            if (!isDefault) {
                item.querySelector(".btn-delete-subject").addEventListener("click", () => this.deleteCustomSubject(s.id));
            }
            container.appendChild(item);
        });
    },

    renderListTable() {
        const tbody = document.getElementById("schedules-table-body");
        tbody.innerHTML = "";

        const user = AppState.currentUser;
        const searchVal = document.getElementById("scheduler-search").value.toLowerCase();
        const filterSub = document.getElementById("scheduler-filter-subject").value;

        let schedules = Store.getAllSchedules().filter(s => s.userId === user.id);

        // Apply filters
        if (filterSub !== "all") {
            schedules = schedules.filter(s => s.subject === filterSub);
        }
        if (searchVal) {
            schedules = schedules.filter(s => s.title.toLowerCase().includes(searchVal));
        }

        if (schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="text-muted">No scheduled sessions matching criteria.</td></tr>`;
            return;
        }

        // Sort by date descending, then time
        schedules.sort((a, b) => {
            const d = b.date.localeCompare(a.date);
            if (d !== 0) return d;
            return b.startTime.localeCompare(a.startTime);
        });

        schedules.forEach(s => {
            const tr = document.createElement("tr");
            const subjObj = Store.getAllSubjects().find(sub => sub.id === s.subject) || { color: "var(--text-muted)", name: s.subject };
            const color = subjObj.color;
            const d12hr = this.formatTime12hr(s.startTime);

            tr.innerHTML = `
                <td>
                    <div class="dt-subject">
                        <span class="dt-subj-dot" style="background-color: ${color}"></span>
                        ${subjObj.name}
                    </div>
                </td>
                <td><strong>${s.title}</strong></td>
                <td>${s.date} @ ${d12hr}</td>
                <td>${s.duration} mins</td>
                <td><span class="status-pill ${s.status}">${s.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-sched-btn" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="action-btn delete delete-sched-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            tr.querySelector(".edit-sched-btn").addEventListener("click", () => this.openModal(s));
            tr.querySelector(".delete-sched-btn").addEventListener("click", () => this.deleteSession(s.id));

            tbody.appendChild(tr);
        });
    },

    formatTime12hr(timeString) {
        const [hStr, mStr] = timeString.split(":");
        const hours = parseInt(hStr);
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${mStr} ${ampm}`;
    }
};

function initScheduler() {
    // Authenticate user session
    checkAuth();

    // Start Scheduler
    CalendarView.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScheduler);
} else {
    initScheduler();
}

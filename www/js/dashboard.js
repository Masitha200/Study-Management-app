/**
 * Aether Academic - Dashboard Overview Controls
 */
const Dashboard = {
    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Calculate and render dashboard stats
        this.updateMetrics();
        this.renderOverviewLists();
    },

    updateMetrics() {
        const current = AppState.currentUser;
        if (!current) return;

        const schedules = Store.getAllSchedules().filter(s => s.userId === current.id);
        const tasks = Store.getAllTasks().filter(t => t.userId === current.id);

        // Calculate total study hours (completed schedules plus focus minutes)
        const completedSchedules = schedules.filter(s => s.status === "completed");
        const schedDurationTotal = completedSchedules.reduce((acc, curr) => acc + Number(curr.duration), 0);

        const focusMinutes = current.stats ? current.stats.studyTime : 0;
        const totalHours = ((schedDurationTotal + focusMinutes) / 60).toFixed(1);

        document.getElementById("stat-study-hours").textContent = `${totalHours}h`;

        // Upcoming scheduled sessions
        const upcomingSchedules = schedules.filter(s => s.status === "upcoming");
        document.getElementById("stat-sessions-count").textContent = upcomingSchedules.length;

        // Completed tasks
        const completedTasksCount = tasks.filter(t => t.status === "done").length;
        document.getElementById("stat-completed-tasks").textContent = completedTasksCount;

        // Calculate scholar rank
        let rank = "Novice Scholar";
        const hoursNum = parseFloat(totalHours);
        if (hoursNum >= 10) rank = "Master Planner";
        else if (hoursNum >= 5) rank = "Intellectual";
        else if (hoursNum >= 2) rank = "Focus Practitioner";

        document.getElementById("stat-productivity-rank").textContent = rank;

        // Render focus breakdown chart
        this.renderSubjectChart(schedules);
    },

    renderSubjectChart(schedules) {
        const barWrap = document.getElementById("chart-bars");
        const emptyState = document.getElementById("no-chart-data");

        if (schedules.length === 0) {
            barWrap.classList.add("hidden");
            emptyState.classList.remove("hidden");
            return;
        }

        const distribution = {};
        schedules.forEach(s => {
            distribution[s.subject] = (distribution[s.subject] || 0) + Number(s.duration);
        });

        const entries = Object.entries(distribution);
        const total = entries.reduce((a, b) => a + b[1], 0);

        if (total === 0) {
            barWrap.classList.add("hidden");
            emptyState.classList.remove("hidden");
            return;
        }

        barWrap.classList.remove("hidden");
        emptyState.classList.add("hidden");
        barWrap.innerHTML = "";

        // Sort descending by duration
        entries.sort((a, b) => b[1] - a[1]);

        entries.forEach(([subj, duration]) => {
            const pct = Math.round((duration / total) * 100);
            const hours = (duration / 60).toFixed(1);

            const subjObj = Store.getAllSubjects().find(s => s.id === subj) || { color: "var(--text-muted)" };
            const color = subjObj.color;

            const row = document.createElement("div");
            row.className = "chart-row";
            row.innerHTML = `
                <div class="chart-subject-label">${subj.replace(/_/g, " ")}</div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${pct}%; background-color: ${color}"></div>
                </div>
                <div class="chart-bar-value">${hours}h (${pct}%)</div>
            `;
            barWrap.appendChild(row);
        });
    },

    renderOverviewLists() {
        const list = document.getElementById("todays-sessions-list");
        list.innerHTML = "";

        const user = AppState.currentUser;
        if (!user) return;

        // Baseline study center standard target date context
        const todayStr = "2026-08-15";
        const schedules = Store.getAllSchedules().filter(s => s.userId === user.id && s.date === todayStr);

        if (schedules.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-calendar-xmark text-muted"></i>
                    <p>No study sessions scheduled for today.</p>
                </div>
            `;
            return;
        }

        // Sort by start time chronological order
        schedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

        schedules.forEach(s => {
            const item = document.createElement("div");
            item.className = "todays-session-item";

            const time12hr = this.formatTime12hr(s.startTime);

            item.innerHTML = `
                <div class="todays-timebox">${time12hr}</div>
                <div class="todays-subject-indicator todays-${s.subject}"></div>
                <div class="todays-session-info">
                    <h4>${s.title}</h4>
                    <p>${s.subject.toUpperCase().replace(/_/g, " ")} • ${s.duration} Minutes</p>
                </div>
                <div>
                    <span class="status-pill ${s.status}">${s.status}</span>
                </div>
            `;

            const colorIndicator = item.querySelector(".todays-subject-indicator");
            if (colorIndicator) {
                const subjObj = Store.getAllSubjects().find(sub => sub.id === s.subject) || { color: "var(--text-muted)" };
                colorIndicator.style.backgroundColor = subjObj.color;
            }

            list.appendChild(item);
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

function initDashboard() {
    // Authenticate user session
    checkAuth();

    // Start Dashboard
    Dashboard.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
} else {
    initDashboard();
}

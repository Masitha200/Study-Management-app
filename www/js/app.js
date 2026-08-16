/**
 * Aether Academic - Study Scheduler & Focus Hub
 * Core Application Engine with Custom State, Auth, Calendar, Kanban, and Administrator panel.
 */

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = "https://ghwzbmpzorgoniwoavve.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod3pibXB6b3Jnb25pd29hdnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODgxNzAsImV4cCI6MjEwMjM2NDE3MH0.gLbixuKavMTIaqdwUsg5rd3v7M411ITgYZpQvNCpsG8";

let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_API_KEY);
    }
} catch (err) {
    console.error("Supabase client initialization failed: ", err);
}


// --- INITIAL SEED DATA ---
const DEFAULT_USERS = [
    {
        id: "user-admin-seed",
        name: "Aether Administrator",
        email: "admin@learnscheduler.com",
        password: "admin123",
        role: "admin",
        joinedDate: "2026-08-01",
        stats: { studyTime: 120, completedTasks: 8 }
    },
    {
        id: "user-student-seed",
        name: "Emma Watson",
        email: "user@learnscheduler.com",
        password: "user123",
        role: "student",
        joinedDate: "2026-08-10",
        stats: { studyTime: 45, completedTasks: 3 }
    }
];

const DEFAULT_SCHEDULES = [
    {
        id: "sched-1",
        userId: "user-student-seed",
        subject: "mathematics",
        title: "Linear Algebra Exam Prep",
        date: "2026-08-15", // Mocking dates relative to current local time week of Aug 15 2026
        startTime: "09:00",
        duration: 90,
        status: "completed"
    },
    {
        id: "sched-2",
        userId: "user-student-seed",
        subject: "physics",
        title: "Quantum Wave Equations HW",
        date: "2026-08-15",
        startTime: "14:00",
        duration: 60,
        status: "upcoming"
    },
    {
        id: "sched-3",
        userId: "user-student-seed",
        subject: "computer_science",
        title: "Neural Networks Lab Refactoring",
        date: "2026-08-16",
        startTime: "10:30",
        duration: 120,
        status: "upcoming"
    },
    {
        id: "sched-4",
        userId: "user-student-seed",
        subject: "literature",
        title: "Shakespeare Reading Block",
        date: "2026-08-14",
        startTime: "16:00",
        duration: 45,
        status: "completed"
    }
];

const DEFAULT_TASKS = [
    {
        id: "task-1",
        userId: "user-student-seed",
        title: "Complete Calculus Problem Set 4",
        priority: "high",
        status: "todo",
        dueDate: "2026-08-18"
    },
    {
        id: "task-2",
        userId: "user-student-seed",
        title: "Draft abstract for English literature term report",
        priority: "medium",
        status: "progress",
        dueDate: "2026-08-19"
    },
    {
        id: "task-3",
        userId: "user-student-seed",
        title: "Revise logic gates logic chart for quiz",
        priority: "low",
        status: "done",
        dueDate: "2026-08-14"
    }
];

const DEFAULT_SUBJECTS = [
    { id: "mathematics", name: "Mathematics", color: "#8b5cf6" },
    { id: "physics", name: "Physics", color: "#3b82f6" },
    { id: "chemistry", name: "Chemistry", color: "#10b981" },
    { id: "biology", name: "Biology", color: "#f97316" },
    { id: "computer_science", name: "Computer Science", color: "#a78bfa" },
    { id: "literature", name: "Literature", color: "#ec4899" },
    { id: "general_study", name: "General Study", color: "#6b7280" }
];

const DEFAULT_ANNOUNCEMENT = {
    content: "Welcome to Aether Academic! New System Broadcast: Focus Room now loaded with relaxing lofi stream ambient rhythms.",
    active: true,
    date: "2026-08-15"
};

// Helper function to format Date object into local YYYY-MM-DD
function formatDateYMD(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// --- DATA ACCESS LAYER (STORE) ---
const Store = {
    get(key, defaultValue) {
        const raw = localStorage.getItem(`aether_${key}`);
        return raw ? JSON.parse(raw) : defaultValue;
    },
    set(key, value) {
        localStorage.setItem(`aether_${key}`, JSON.stringify(value));
    },

    initialize() {
        if (!localStorage.getItem("aether_users")) {
            this.set("users", DEFAULT_USERS);
        }
        if (!localStorage.getItem("aether_schedules")) {
            this.set("schedules", DEFAULT_SCHEDULES);
        }
        if (!localStorage.getItem("aether_tasks")) {
            this.set("tasks", DEFAULT_TASKS);
        }
        if (!localStorage.getItem("aether_announcement")) {
            this.set("announcement", DEFAULT_ANNOUNCEMENT);
        }
        if (!localStorage.getItem("aether_subjects")) {
            this.set("subjects", DEFAULT_SUBJECTS);
        }
    },

    getAllUsers() { return this.get("users", []); },
    saveAllUsers(users) { this.set("users", users); },

    getAllSchedules() { return this.get("schedules", []); },
    saveAllSchedules(schedules) { this.set("schedules", schedules); },

    getAllTasks() { return this.get("tasks", []); },
    saveAllTasks(tasks) { this.set("tasks", tasks); },

    getAnnouncement() { return this.get("announcement", DEFAULT_ANNOUNCEMENT); },
    saveAnnouncement(ann) { this.set("announcement", ann); },

    getAllSubjects() {
        const subs = this.get("subjects", []);
        if (subs.length === 0) {
            this.set("subjects", DEFAULT_SUBJECTS);
            return DEFAULT_SUBJECTS;
        }
        return subs;
    },
    saveAllSubjects(subjects) { this.set("subjects", subjects); },

    async syncFromSupabase() {
        if (!supabase) return;
        try {
            // 1. Fetch Users
            const { data: users, error: errU } = await supabase.from('users').select('*');
            if (!errU && users) {
                const mappedUsers = users.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    password: u.password,
                    role: u.role,
                    joinedDate: u.joined_date,
                    stats: u.stats || { studyTime: 0, completedTasks: 0 }
                }));
                this.saveAllUsers(mappedUsers);
                if (AppState.currentUser) {
                    const currentU = mappedUsers.find(u => u.id === AppState.currentUser.id);
                    if (currentU) AppState.currentUser = currentU;
                }
            }

            // 2. Fetch Schedules
            const { data: schedules, error: errS } = await supabase.from('schedules').select('*');
            if (!errS && schedules) {
                const mappedSchedules = schedules.map(s => ({
                    id: s.id,
                    userId: s.user_id,
                    subject: s.subject,
                    title: s.title,
                    date: s.date,
                    startTime: s.start_time,
                    duration: s.duration,
                    status: s.status
                }));
                this.saveAllSchedules(mappedSchedules);
            }

            // 3. Fetch Tasks
            const { data: tasks, error: errT } = await supabase.from('tasks').select('*');
            if (!errT && tasks) {
                const mappedTasks = tasks.map(t => ({
                    id: t.id,
                    userId: t.user_id,
                    title: t.title,
                    priority: t.priority,
                    status: t.status,
                    dueDate: t.due_date
                }));
                this.saveAllTasks(mappedTasks);
            }

            // 4. Fetch Subjects
            const { data: subjects, error: errSub } = await supabase.from('subjects').select('*');
            if (!errSub && subjects) {
                this.saveAllSubjects(subjects);
            }

            // 5. Fetch Announcements
            const { data: announcements, error: errAnn } = await supabase.from('announcements').select('*').order('id', { ascending: false }).limit(1);
            if (!errAnn && announcements && announcements.length > 0) {
                const ann = announcements[0];
                this.saveAnnouncement({
                    content: ann.content,
                    active: ann.active,
                    date: ann.date
                });
            }
        } catch (e) {
            console.error("Supabase sync failed: ", e);
        }
    }
};

// Initialize DB seeding
Store.initialize();

// --- STATE MANAGEMENT ---
let AppState = {
    currentUser: null,  // Holds current active user profile
    currentTab: "overview",
    currentDateInView: new Date("2026-08-15T12:00:00"), // Baseline standard study center date
    calendarMode: "weekly", // weekly, monthly

    // Timer State
    timerDuration: 25 * 60, // in seconds
    timerSecondsRemaining: 25 * 60,
    timerIntervalId: null,
    timerIsRunning: false,
    timerMode: "pomodoro", // pomodoro, short, long
    timerSound: "none"
};

// --- CORE UI CONTROLS & ROUTER ---
const Navigator = {
    showView(viewId) {
        document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
        const viewEl = document.getElementById(viewId);
        if (viewEl) viewEl.classList.add("active");

        if (viewId === "view-dashboard") {
            populateSubjectDropdowns();
            this.showTab(AppState.currentTab);
            Dashboard.updateHeaderDisplay();
            Dashboard.updateMetrics();
            CalendarView.render();
            KanbanView.render();
            FocusRoom.render();
            AdminPanel.render();
        }
    },

    showTab(tabId) {
        // Secure access check for admin panel
        if (tabId === "admin" && AppState.currentUser?.role !== "admin") {
            alert("Access Denied: You do not have permissions to access the Administration Panel!");
            this.showTab("overview");
            return;
        }

        AppState.currentTab = tabId;
        document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".sidebar-item").forEach(el => el.classList.remove("active"));

        const tabEl = document.getElementById(`tab-${tabId}`);
        if (tabEl) tabEl.classList.add("active");

        const menuEl = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`);
        if (menuEl) menuEl.classList.add("active");

        // Refresh content
        if (tabId === "overview") {
            Dashboard.updateMetrics();
            Dashboard.renderOverviewLists();
        } else if (tabId === "scheduler") {
            CalendarView.render();
        } else if (tabId === "tasks") {
            KanbanView.render();
        } else if (tabId === "focus") {
            FocusRoom.refreshTaskSelectorList();
        } else if (tabId === "admin") {
            AdminPanel.render();
        }
    }
};

// --- AUTH SYSTEM CONTROLLER ---
const AuthSystem = {
    isSignUpFlow: false,

    init() {
        // Auth navigation buttons
        document.querySelectorAll(".btn-login-trigger").forEach(btn => {
            btn.addEventListener("click", () => {
                this.toggleFlow(false);
                Navigator.showView("view-auth");
            });
        });

        document.querySelectorAll(".btn-get-started").forEach(btn => {
            btn.addEventListener("click", () => {
                this.toggleFlow(true);
                Navigator.showView("view-auth");
            });
        });

        document.querySelector(".btn-demo-login").addEventListener("click", () => {
            // Direct login to user account
            this.login("user@learnscheduler.com", "user123");
        });

        document.querySelector(".btn-back-to-landing").addEventListener("click", () => {
            Navigator.showView("view-landing");
        });

        document.getElementById("auth-switch-btn").addEventListener("click", (e) => {
            e.preventDefault();
            this.toggleFlow(!this.isSignUpFlow);
        });

        document.getElementById("auth-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        document.getElementById("btn-logout").addEventListener("click", (e) => {
            e.preventDefault();
            this.logout();
        });

        // Check remember me state
        const savedSession = localStorage.getItem("aether_active_session");
        if (savedSession) {
            const user = Store.getAllUsers().find(u => u.email === savedSession);
            if (user) {
                AppState.currentUser = user;
                Navigator.showView("view-dashboard");
            }
        }
    },

    toggleFlow(wantsSignUp) {
        this.isSignUpFlow = wantsSignUp;
        const nameGroup = document.getElementById("group-signup-name");
        const title = document.getElementById("auth-title");
        const sub = document.getElementById("auth-subtitle");
        const submitBtn = document.getElementById("btn-auth-submit");
        const switchTxt = document.getElementById("auth-switch-text");
        const switchBtn = document.getElementById("auth-switch-btn");
        const nameInput = document.getElementById("auth-name");

        if (wantsSignUp) {
            nameGroup.style.display = "block";
            nameInput.required = true;
            title.textContent = "Start Scheduling";
            sub.textContent = "Register a profile to begin your academic roadmap.";
            submitBtn.textContent = "Sign Up";
            switchTxt.textContent = "Already have an account?";
            switchBtn.textContent = "Sign In";
        } else {
            nameGroup.style.display = "none";
            nameInput.required = false;
            nameInput.value = "";
            title.textContent = "Welcome Back";
            sub.textContent = "Sign in to access your study schedules and stats.";
            submitBtn.textContent = "Sign In";
            switchTxt.textContent = "Don't have an account?";
            switchBtn.textContent = "Sign Up";
        }
    },

    handleSubmit() {
        const email = document.getElementById("auth-email").value.trim().toLowerCase();
        const pass = document.getElementById("auth-password").value;
        const name = document.getElementById("auth-name").value.trim();

        if (this.isSignUpFlow) {
            // Signup logic
            const users = Store.getAllUsers();
            if (users.some(u => u.email === email)) {
                alert("An account with this email address already exists!");
                return;
            }

            // Determine role: by default email base admin checks for 'admin@' or specific string
            let role = "student";
            if (email.includes("admin@") || email === "admin@learnscheduler.com") {
                role = "admin";
            }

            const newUser = {
                id: "user_" + Date.now(),
                name: name,
                email: email,
                password: pass,
                role: role,
                joinedDate: formatDateYMD(new Date()),
                stats: { studyTime: 0, completedTasks: 0 }
            };

            users.push(newUser);
            Store.saveAllUsers(users);

            if (supabase) {
                supabase.from('users').insert({
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    password: newUser.password,
                    role: newUser.role,
                    joined_date: newUser.joinedDate,
                    stats: newUser.stats
                }).then(({ error }) => { if (error) console.error("Supabase register error:", error); });
            }

            alert(`Registration Successful! Logged in as ${role === 'admin' ? 'Administrator' : 'Student'}.`);
            this.login(email, pass);
        } else {
            // Login logic
            this.login(email, pass);
        }
    },

    login(email, password) {
        const users = Store.getAllUsers();
        const user = users.find(u => u.email === email.toLowerCase() && u.password === password);

        if (!user) {
            alert("Invalid email credentials or incorrect password!");
            return;
        }

        AppState.currentUser = user;

        // Remember me check
        if (document.getElementById("auth-remember").checked) {
            localStorage.setItem("aether_active_session", user.email);
        } else {
            localStorage.removeItem("aether_active_session");
        }

        // Reset inputs
        document.getElementById("auth-form").reset();

        // Route application
        Navigator.showView("view-dashboard");
    },

    logout() {
        AppState.currentUser = null;
        localStorage.removeItem("aether_active_session");
        FocusRoom.stopTimer(); // Ensure sound environments stop on logout
        AppState.currentTab = "overview";
        Navigator.showView("view-landing");
    }
};

// --- GENERAL DASHBOARD LOGIC ---
const Dashboard = {
    init() {
        // Tab switching side menu clicks
        document.querySelectorAll(".sidebar-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                Navigator.showTab(item.getAttribute("data-tab"));
            });
        });

        // Tab redirects via shortcuts
        document.querySelectorAll(".btn-tab-redirect").forEach(btn => {
            btn.addEventListener("click", () => {
                Navigator.showTab(btn.getAttribute("data-target"));
            });
        });
    },

    updateHeaderDisplay() {
        const current = AppState.currentUser;
        if (!current) return;

        // Headings identities
        document.getElementById("nav-username").textContent = current.name;
        document.getElementById("nav-useremail").textContent = current.email;
        document.getElementById("greeting-name").textContent = current.name.split(" ")[0];

        const roleBadge = document.getElementById("sidebar-role-badge");
        roleBadge.textContent = current.role === "admin" ? "Admin" : "Student";
        if (current.role === "admin") {
            roleBadge.classList.add("admin");
            document.getElementById("sidebar-admin-link").style.display = "flex";
        } else {
            roleBadge.classList.remove("admin");
            document.getElementById("sidebar-admin-link").style.display = "none";
        }

        // Live display announcement banner
        this.refreshAnnouncementBanner();
    },

    refreshAnnouncementBanner() {
        const ann = Store.getAnnouncement();
        const banner = document.getElementById("dynamic-announcement");
        const container = document.getElementById("announcement-text");

        if (ann && ann.active) {
            container.textContent = ann.content;
            banner.classList.add("sys-active");
        } else {
            container.textContent = "Set study sessions, coordinate assignments, stay on task!";
            banner.classList.remove("sys-active");
        }
    },

    updateMetrics() {
        const current = AppState.currentUser;
        if (!current) return;

        const schedules = Store.getAllSchedules().filter(s => s.userId === current.id);
        const tasks = Store.getAllTasks().filter(t => t.userId === current.id);

        // Study Hours summary (completed schedules + pomodoros active)
        const completedSchedules = schedules.filter(s => s.status === "completed");
        const schedDurationTotal = completedSchedules.reduce((acc, curr) => acc + Number(curr.duration), 0);

        // Add pomodoro history metrics
        const userDb = Store.getAllUsers();
        const liveUser = userDb.find(u => u.id === current.id) || current;
        const focusMinutes = liveUser.stats ? liveUser.stats.studyTime : 0;

        const totalHours = ((schedDurationTotal + focusMinutes) / 60).toFixed(1);
        document.getElementById("stat-study-hours").textContent = `${totalHours}h`;

        // Scheduled sessions (Upcoming only)
        const upcomingSchedules = schedules.filter(s => s.status === "upcoming");
        document.getElementById("stat-sessions-count").textContent = upcomingSchedules.length;

        // Completed Tasks
        const completedTasksNum = tasks.filter(t => t.status === "done").length;
        document.getElementById("stat-completed-tasks").textContent = completedTasksNum;

        // Rank evaluation
        let rank = "Novice Scholar";
        const rawHours = parseFloat(totalHours);
        if (rawHours >= 10) rank = "Master Planner";
        if (rawHours >= 5) rank = "Intellectual";
        if (rawHours >= 2) rank = "Focus Practitioner";
        document.getElementById("stat-productivity-rank").textContent = rank;

        // Build the visual chart
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

        // Group duration elements
        const distribution = {};
        schedules.forEach(s => {
            distribution[s.subject] = (distribution[s.subject] || 0) + Number(s.duration);
        });

        const entries = Object.entries(distribution);
        let total = entries.reduce((a, b) => a + b[1], 0);

        if (total === 0) {
            barWrap.classList.add("hidden");
            emptyState.classList.remove("hidden");
            return;
        }

        barWrap.classList.remove("hidden");
        emptyState.classList.add("hidden");
        barWrap.innerHTML = "";

        // Sort by duration descending
        entries.sort((a, b) => b[1] - a[1]);

        entries.forEach(([subj, duration]) => {
            const pct = Math.round((duration / total) * 100);
            const hours = (duration / 60).toFixed(1);

            const subjObj = Store.getAllSubjects().find(s => s.id === subj) || { color: "var(--text-muted)" };
            const color = subjObj.color;

            const row = document.createElement("div");
            row.className = "chart-row";
            row.innerHTML = `
        <div class="chart-subject-label">${subj.replace("_", " ")}</div>
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

        // Get today's study dates formatted in YYYY-MM-DD
        const todayStr = "2026-08-15"; // Target date context
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

        // Sort by startTime
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
          <p>${s.subject.toUpperCase().replace("_", " ")} • ${s.duration} Minutes</p>
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

// --- STUDY SCHEDULER & WEB CALENDAR SYSTEM ---
const CalendarView = {
    currentWeekStart: new Date("2026-08-09T00:00:00"), // Start date boundaries

    init() {
        this.currentWeekStart = this.getStartOfWeek(AppState.currentDateInView);

        document.getElementById("btn-prev-week").addEventListener("click", () => {
            if (AppState.calendarMode === "weekly") {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            } else {
                this.currentWeekStart.setMonth(this.currentWeekStart.getMonth() - 1);
            }
            this.render();
        });

        document.getElementById("btn-next-week").addEventListener("click", () => {
            if (AppState.calendarMode === "weekly") {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            } else {
                this.currentWeekStart.setMonth(this.currentWeekStart.getMonth() + 1);
            }
            this.render();
        });

        document.getElementById("btn-add-schedule").addEventListener("click", () => {
            this.openModal();
        });

        document.getElementById("btn-close-schedule-modal").addEventListener("click", () => this.closeModal());
        document.getElementById("btn-cancel-schedule").addEventListener("click", () => this.closeModal());

        document.getElementById("schedule-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveSession();
        });

        // Filtering controls
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

        // Subject manager hooks
        document.getElementById("btn-manage-subjects").addEventListener("click", () => {
            this.openSubjectsModal();
        });

        document.getElementById("btn-close-subjects-modal").addEventListener("click", () => {
            this.closeSubjectsModal();
        });

        document.getElementById("btn-done-subjects").addEventListener("click", () => {
            this.closeSubjectsModal();
        });

        document.getElementById("subject-manager-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.addCustomSubject();
        });
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

                if (supabase) {
                    supabase.from('schedules').update({
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

            if (supabase) {
                supabase.from('schedules').insert({
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

        Store.saveAllSchedules(schedules);
        this.closeModal();
        this.render();
        Dashboard.updateMetrics();
    },

    deleteSession(sessionId) {
        if (confirm("Are you sure you want to delete this study session?")) {
            const schedules = Store.getAllSchedules().filter(s => s.id !== sessionId);
            Store.saveAllSchedules(schedules);

            if (supabase) {
                supabase.from('schedules').delete().eq('id', sessionId)
                    .then(({ error }) => { if (error) console.error("Supabase schedule delete error:", error); });
            }

            this.render();
            Dashboard.updateMetrics();
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

                columnCell.addEventListener("click", (e) => {
                    if (e.target === columnCell) {
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

                    const timeStr = Dashboard.formatTime12hr(eObj.startTime);
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
                    if (e.target === cellNode || e.target === dayNumBadge) {
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
        Dashboard.updateMetrics();
        Dashboard.renderOverviewLists();
    },

    addCustomSubject() {
        const nameInput = document.getElementById("new-subject-name");
        const colorInput = document.getElementById("new-subject-color");

        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) return;

        const id = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

        const subjects = Store.getAllSubjects();
        if (subjects.some(s => s.id === id || s.name.toLowerCase() === name.toLowerCase())) {
            alert("A subject with this name already exists!");
            return;
        }

        const newSub = { id, name, color };
        subjects.push(newSub);
        Store.saveAllSubjects(subjects);

        if (supabase) {
            supabase.from('subjects').insert({
                id: newSub.id,
                name: newSub.name,
                color: newSub.color
            }).then(({ error }) => { if (error) console.error("Supabase subject insert error:", error); });
        }

        nameInput.value = "";
        colorInput.value = "#8b5cf6";

        this.renderSubjectsDirectory();
        populateSubjectDropdowns();
    },

    deleteCustomSubject(subjId) {
        const subjects = Store.getAllSubjects();
        if (subjects.length <= 1) {
            alert("Error: You must keep at least one subject in the system!");
            return;
        }

        if (confirm(`Are you sure you want to delete the subject "${subjId.replace(/_/g, ' ')}"? Any schedules linked to this subject will revert to general study.`)) {
            const updated = subjects.filter(s => s.id !== subjId);
            Store.saveAllSubjects(updated);

            const schedules = Store.getAllSchedules();
            schedules.forEach(s => {
                if (s.subject === subjId) s.subject = updated[0].id;
            });
            Store.saveAllSchedules(schedules);

            if (supabase) {
                supabase.from('subjects').delete().eq('id', subjId)
                    .then(({ error }) => { if (error) console.error("Supabase subject delete error:", error); });

                schedules.forEach(s => {
                    if (s.subject === updated[0].id) {
                        supabase.from('schedules').update({ subject: updated[0].id }).eq('id', s.id)
                            .then(({ error }) => { if (error) console.error("Supabase schedules subject update error:", error); });
                    }
                });
            }

            this.renderSubjectsDirectory();
            populateSubjectDropdowns();
        }
    },

    renderSubjectsDirectory() {
        const container = document.getElementById("subjects-directory-list");
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

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${s.color}; box-shadow: 0 0 6px ${s.color};"></span>
                    <span style="font-weight: 500;">${s.name}</span>
                </div>
                <button class="action-btn delete btn-delete-subject" title="Delete Subject" style="width: 26px; height: 26px; font-size: 0.8rem;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            item.querySelector(".btn-delete-subject").addEventListener("click", () => this.deleteCustomSubject(s.id));
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

        const subjectColors = {
            mathematics: "var(--primary-accent)",
            physics: "var(--secondary-accent)",
            chemistry: "var(--emerald-accent)",
            biology: "var(--orange-accent)",
            computer_science: "#a78bfa",
            literature: "var(--rose-accent)",
            general_study: "var(--text-secondary)"
        };

        schedules.forEach(s => {
            const tr = document.createElement("tr");
            const color = subjectColors[s.subject] || "var(--text-muted)";
            const d12hr = Dashboard.formatTime12hr(s.startTime);

            tr.innerHTML = `
        <td>
          <div class="dt-subject">
            <span class="dt-subj-dot" style="background-color: ${color}"></span>
            ${s.subject.replace("_", " ")}
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
    }
};

// --- TASK KANBAN SYSTEM LAYOUT ---
const KanbanView = {
    draggedCardElement: null,

    init() {
        document.getElementById("btn-add-task").addEventListener("click", () => this.openModal());
        document.getElementById("btn-close-task-modal").addEventListener("click", () => this.closeModal());
        document.getElementById("btn-cancel-task").addEventListener("click", () => this.closeModal());

        document.getElementById("task-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Drag events support
        const columns = document.querySelectorAll(".kanban-column");
        columns.forEach(col => {
            col.addEventListener("dragover", (e) => {
                e.preventDefault();
                col.classList.add("drag-hover");
            });
            col.addEventListener("dragleave", () => {
                col.classList.remove("drag-hover");
            });
            col.addEventListener("drop", () => {
                col.classList.remove("drag-hover");
                if (this.draggedCardElement) {
                    const taskId = this.draggedCardElement.getAttribute("data-id");
                    const targetStatus = col.getAttribute("data-status");
                    this.updateTaskStatus(taskId, targetStatus);
                }
            });
        });
    },

    openModal(taskObj = null) {
        const form = document.getElementById("task-form");
        form.reset();

        const titleEl = document.getElementById("task-modal-title");
        const submitBtn = document.getElementById("btn-submit-task");

        if (taskObj) {
            titleEl.textContent = "Edit Task Parameters";
            submitBtn.textContent = "Apply Changes";

            document.getElementById("edit-task-id").value = taskObj.id;
            document.getElementById("task-title").value = taskObj.title;
            document.getElementById("task-priority").value = taskObj.priority;
            document.getElementById("task-due").value = taskObj.dueDate;
            document.getElementById("task-status").value = taskObj.status;
        } else {
            titleEl.textContent = "Create Task Card";
            submitBtn.textContent = "Add Task";
            document.getElementById("edit-task-id").value = "";

            // defaults due dates
            document.getElementById("task-due").value = "2026-08-18";
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
            // Edit
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                tasks[idx].title = title;
                tasks[idx].priority = priority;
                tasks[idx].dueDate = due;
                tasks[idx].status = status;

                if (supabase) {
                    supabase.from('tasks').update({
                        title: title,
                        priority: priority,
                        due_date: due,
                        status: status
                    }).eq('id', id).then(({ error }) => { if (error) console.error("Supabase task update error:", error); });
                }
            }
        } else {
            // Create
            const newTask = {
                id: "task_" + Date.now(),
                userId: AppState.currentUser.id,
                title: title,
                priority: priority,
                status: status,
                dueDate: due
            };
            tasks.push(newTask);

            if (supabase) {
                supabase.from('tasks').insert({
                    id: newTask.id,
                    user_id: newTask.userId,
                    title: newTask.title,
                    priority: newTask.priority,
                    status: newTask.status,
                    due_date: newTask.dueDate
                }).then(({ error }) => { if (error) console.error("Supabase task insert error:", error); });
            }
        }

        Store.saveAllTasks(tasks);
        this.closeModal();
        this.render();
        Dashboard.updateMetrics();
    },

    deleteTask(taskId) {
        if (confirm("Remove this tasks card from Kanban board?")) {
            const tasks = Store.getAllTasks().filter(t => t.id !== taskId);
            Store.saveAllTasks(tasks);

            if (supabase) {
                supabase.from('tasks').delete().eq('id', taskId)
                    .then(({ error }) => { if (error) console.error("Supabase task delete error:", error); });
            }

            this.render();
            Dashboard.updateMetrics();
        }
    },

    updateTaskStatus(taskId, targetStatus) {
        const tasks = Store.getAllTasks();
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            tasks[idx].status = targetStatus;

            if (supabase) {
                supabase.from('tasks').update({ status: targetStatus }).eq('id', taskId)
                    .then(({ error }) => { if (error) console.error("Supabase task status update error:", error); });
            }

            // If task is completed, reward stats!
            if (targetStatus === "done") {
                const users = Store.getAllUsers();
                const userIdx = users.findIndex(u => u.id === AppState.currentUser.id);
                if (userIdx !== -1) {
                    users[userIdx].stats.completedTasks = (users[userIdx].stats.completedTasks || 0) + 1;
                    Store.saveAllUsers(users);

                    if (supabase) {
                        supabase.from('users').update({ stats: users[userIdx].stats }).eq('id', AppState.currentUser.id)
                            .then(({ error }) => { if (error) console.error("Supabase stats save failed:", error); });
                    }
                }
            }

            Store.saveAllTasks(tasks);
            this.render();
            Dashboard.updateMetrics();
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
            <!-- Kanban movement helper buttons (essential for accessibility/mobile templates) -->
            ${t.status !== 'todo' ? '<button class="action-btn btn-mv-left" title="Move Left"><i class="fa-solid fa-arrow-left"></i></button>' : ''}
            <button class="action-btn btn-task-edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete btn-task-del" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            ${t.status !== 'done' ? '<button class="action-btn btn-mv-right" title="Move Right"><i class="fa-solid fa-arrow-right"></i></button>' : ''}
          </div>
        </div>
      `;

            // Movement logic
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

            // Drag and drop event integrations
            card.addEventListener("dragstart", () => {
                card.classList.add("dragging");
                this.draggedCardElement = card;
            });
            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                this.draggedCardElement = null;
            });

            // Append cards to designated columns lists
            if (t.status === "todo") todoList.appendChild(card);
            else if (t.status === "progress") progressList.appendChild(card);
            else if (t.status === "done") doneList.appendChild(card);
        });

        // Update subcounts labels
        document.getElementById("todo-count").textContent = todoList.children.length;
        document.getElementById("progress-count").textContent = progressList.children.length;
        document.getElementById("done-count").textContent = doneList.children.length;
    }
};

// --- FOCUS ROOM & POMODORO SYSTEM ---
const FocusRoom = {
    historicalSessions: [],

    init() {
        // Mode toggles
        document.getElementById("btn-mode-pomodoro").addEventListener("click", () => this.setTimerMode("pomodoro", 25));
        document.getElementById("btn-mode-short").addEventListener("click", () => this.setTimerMode("short", 5));
        document.getElementById("btn-mode-long").addEventListener("click", () => this.setTimerMode("long", 15));

        // Playback state toggles
        document.getElementById("btn-timer-toggle").addEventListener("click", () => this.togglePlayback());
        document.getElementById("btn-timer-reset").addEventListener("click", () => this.resetTimer());
        document.getElementById("btn-timer-skip").addEventListener("click", () => this.completeFocusCycle());

        // Sound adjustments
        document.getElementById("timer-ambient-sound").addEventListener("change", (e) => this.handleSoundSelection(e.target.value));
    },

    setTimerMode(mode, minutes) {
        this.stopTimer();
        AppState.timerMode = mode;
        AppState.timerDuration = minutes * 60;
        AppState.timerSecondsRemaining = minutes * 60;

        // Toggle active state layout styling
        document.querySelectorAll(".timer-mode-btn").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.querySelector(`.timer-mode-btn[data-time="${minutes}"]`);
        if (activeBtn) activeBtn.classList.add("active");

        const statusMap = {
            pomodoro: "Deep Study Session",
            short: "Short Resting Break",
            long: "Extended Break Interval"
        };

        document.getElementById("timer-subtitle-status").textContent = statusMap[mode];
        this.updateVisualTimerHUD();
    },

    updateVisualTimerHUD() {
        const timeDisplay = document.getElementById("timer-time-display");
        const ring = document.getElementById("timer-progress-ring");

        const mins = Math.floor(AppState.timerSecondsRemaining / 60);
        const secs = AppState.timerSecondsRemaining % 60;

        timeDisplay.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

        // SVG Circular Ring offset math: perimeter = 816.8 (2 * PI * 130)
        const pct = AppState.timerSecondsRemaining / AppState.timerDuration;
        const offset = 816.8 - (pct * 816.8);
        ring.style.strokeDashoffset = offset;
    },

    togglePlayback() {
        const icon = document.getElementById("timer-play-icon");
        const playBtn = document.getElementById("btn-timer-toggle");

        if (AppState.timerIsRunning) {
            this.stopTimer();
            icon.className = "fa-solid fa-play";
            playBtn.style.backgroundColor = "var(--primary-accent)";
        } else {
            this.startTimer();
            icon.className = "fa-solid fa-pause";
            playBtn.style.backgroundColor = "var(--rose-accent)";
        }
    },

    startTimer() {
        AppState.timerIsRunning = true;

        // Safe Audio environment trigger
        this.handleSoundSelection(AppState.timerSound);

        AppState.timerIntervalId = setInterval(() => {
            AppState.timerSecondsRemaining--;
            this.updateVisualTimerHUD();

            if (AppState.timerSecondsRemaining <= 0) {
                this.completeFocusCycle();
            }
        }, 1000);
    },

    stopTimer() {
        AppState.timerIsRunning = false;
        if (AppState.timerIntervalId) {
            clearInterval(AppState.timerIntervalId);
        }

        // Stop backing tracking audios
        const streams = ["rain", "library", "lofi"];
        streams.forEach(s => {
            const aud = document.getElementById(`ambient-audio-${s}`);
            if (aud) {
                aud.pause();
            }
        });
    },

    resetTimer() {
        this.stopTimer();
        const modes = {
            pomodoro: 25,
            short: 5,
            long: 15
        };
        const mins = modes[AppState.timerMode] || 25;
        AppState.timerSecondsRemaining = mins * 60;

        document.getElementById("timer-play-icon").className = "fa-solid fa-play";
        document.getElementById("btn-timer-toggle").style.backgroundColor = "var(--primary-accent)";
        this.updateVisualTimerHUD();
    },

    completeFocusCycle() {
        this.stopTimer();

        // Log user stats on success!
        if (AppState.timerMode === "pomodoro") {
            const completedSecs = AppState.timerDuration - AppState.timerSecondsRemaining;
            const completedMins = Math.round(completedSecs / 60);

            if (completedMins > 0) {
                const users = Store.getAllUsers();
                const userIdx = users.findIndex(u => u.id === AppState.currentUser.id);
                if (userIdx !== -1) {
                    users[userIdx].stats.studyTime = (users[userIdx].stats.studyTime || 0) + completedMins;
                    Store.saveAllUsers(users);
                    AppState.currentUser = users[userIdx];

                    if (supabase) {
                        supabase.from('users').update({ stats: users[userIdx].stats }).eq('id', AppState.currentUser.id)
                            .then(({ error }) => { if (error) console.error("Supabase stats save failed:", error); });
                    }
                }

                // Store to local focus history logger
                const course = document.getElementById("focus-session-title").value;
                const linked = document.getElementById("focus-task-linked").value;

                const focusRecord = {
                    subject: course,
                    timeSpent: completedMins,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                this.historicalSessions.push(focusRecord);
                this.renderHistoryRecords();

                alert(`Success! You have added ${completedMins} focus minutes to ${course}!`);
            }
        } else {
            alert("Break period ended, time to start focusing again!");
        }

        this.resetTimer();
        Dashboard.updateMetrics();
    },

    handleSoundSelection(soundName) {
        AppState.timerSound = soundName;

        // Pause matches
        const streams = ["rain", "library", "lofi"];
        streams.forEach(s => {
            const aud = document.getElementById(`ambient-audio-${s}`);
            if (aud) aud.pause();
        });

        if (!AppState.timerIsRunning || soundName === "none") return;

        const activeAudio = document.getElementById(`ambient-audio-${soundName}`);
        if (activeAudio) {
            activeAudio.volume = 0.45;
            activeAudio.play().catch(err => {
                console.warn("Backing streaming audio could not autoPlay. Interactive triggers required:", err);
            });
        }
    },

    refreshTaskSelectorList() {
        const list = document.getElementById("focus-task-linked");
        list.innerHTML = `<option value="none">No specific task selected</option>`;

        const userTasks = Store.getAllTasks().filter(t => t.userId === AppState.currentUser.id && t.status !== "done");
        userTasks.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = `${t.title} (${t.priority.toUpperCase()})`;
            list.appendChild(opt);
        });
    },

    renderHistoryRecords() {
        const wrap = document.getElementById("today-focus-sessions-list");
        wrap.innerHTML = "";

        if (this.historicalSessions.length === 0) {
            wrap.innerHTML = `<p class="text-muted" style="font-size: 0.8rem; text-align: center;">No focus sessions logged yet today.</p>`;
            return;
        }

        this.historicalSessions.forEach(f => {
            const row = document.createElement("div");
            row.className = "activity-row";
            const subjObj = Store.getAllSubjects().find(s => s.id === f.subject) || { name: f.subject.replace(/_/g, ' ') };
            row.innerHTML = `
        <span class="activity-subj" style="border-left: 3px solid ${subjObj.color || 'var(--text-muted)'}; padding-left: 8px;">${subjObj.name}</span>
        <div>
          <span class="activity-time">${f.timeSpent}m</span>
          <span class="text-muted" style="margin-left: 8px;">${f.timestamp}</span>
        </div>
      `;
            wrap.appendChild(row);
        });
    },

    render() {
        this.refreshTaskSelectorList();
        this.renderHistoryRecords();
        this.resetTimer();
    }
};

// --- SYSTEM ADMIN PANEL CONTROLLER (EMAIL-AUTHORIZED ACTIONS) ---
const AdminPanel = {
    init() {
        // Announcements Submit
        document.getElementById("admin-announcement-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.publishBroadcast();
        });

        document.getElementById("btn-clear-announcement").addEventListener("click", () => {
            this.clearAnnouncement();
        });

        // Filtering users in admin directory
        document.getElementById("admin-user-search").addEventListener("input", () => this.renderUsersDirectory());
    },

    publishBroadcast() {
        const text = document.getElementById("announcement-input").value.trim();
        if (!text) return;

        const ann = {
            content: text,
            active: true,
            date: formatDateYMD(new Date())
        };

        Store.saveAnnouncement(ann);

        if (supabase) {
            supabase.from('announcements').insert({
                content: ann.content,
                active: ann.active,
                date: ann.date
            }).then(({ error }) => { if (error) console.error("Supabase announcement insert error:", error); });
        }

        document.getElementById("announcement-input").value = "";
        Dashboard.refreshAnnouncementBanner();
        alert("New system announcement broadcasted to all logged-in profiles!");
    },

    clearAnnouncement() {
        const ann = Store.getAnnouncement();
        ann.active = false;
        Store.saveAnnouncement(ann);

        if (supabase) {
            supabase.from('announcements').update({ active: false }).eq('active', true)
                .then(({ error }) => { if (error) console.error("Supabase announcement cancel error:", error); });
        }

        Dashboard.refreshAnnouncementBanner();
        alert("Active administrator announcement removed from banner dashboard.");
    },

    toggleUserRole(userId) {
        const users = Store.getAllUsers();
        const idx = users.findIndex(u => u.id === userId);

        if (idx !== -1) {
            const oldRole = users[idx].role;
            const newRole = oldRole === "admin" ? "student" : "admin";

            // Prevent admin self-demotion to lock themselves out
            if (users[idx].email === AppState.currentUser.email) {
                alert("Action Revoked: You cannot change your own administrator access settings!");
                return;
            }

            users[idx].role = newRole;
            Store.saveAllUsers(users);

            if (supabase) {
                supabase.from('users').update({ role: newRole }).eq('id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase role update failed:", error); });
            }

            this.render();
            alert(`User role change: ${users[idx].email} updated to ${newRole}`);

            // Refresh sidebar visibility if needed
            Dashboard.updateHeaderDisplay();
        }
    },

    deleteUser(userId) {
        const users = Store.getAllUsers();
        const liveTarget = users.find(u => u.id === userId);

        if (!liveTarget) return;

        if (liveTarget.email === AppState.currentUser.email) {
            alert("Action Revoked: You cannot destroy your own administration profile!");
            return;
        }

        if (confirm(`CRITICAL WARNING: This will permanently wipe registration, study logs, and schedules for: ${liveTarget.name} (${liveTarget.email}). Continue?`)) {
            // Delete user account
            const updatedUsers = users.filter(u => u.id !== userId);
            Store.saveAllUsers(updatedUsers);

            // Clean associated schedules & tasks
            const cleanScheds = Store.getAllSchedules().filter(s => s.userId !== userId);
            Store.saveAllSchedules(cleanScheds);

            const cleanTasks = Store.getAllTasks().filter(t => t.userId !== userId);
            Store.saveAllTasks(cleanTasks);

            if (supabase) {
                supabase.from('users').delete().eq('id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase delete user failed:", error); });

                supabase.from('schedules').delete().eq('user_id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase schedules cascade delete failed:", error); });

                supabase.from('tasks').delete().eq('user_id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase tasks cascade delete failed:", error); });
            }

            this.render();
            alert("User account and database records successfully wiped.");
        }
    },

    render() {
        if (AppState.currentUser?.role !== "admin") return;

        // Platform aggregates metrics calculation
        const users = Store.getAllUsers();
        document.getElementById("admin-total-users").textContent = users.length;

        // Total aggregate study minutes across all registers
        let schedMinutesAcc = Store.getAllSchedules().reduce((acc, curr) => acc + (curr.status === "completed" ? Number(curr.duration) : 0), 0);
        let pomodoroMinutesAcc = users.reduce((acc, curr) => acc + (curr.stats?.studyTime || 0), 0);

        document.getElementById("admin-total-hours").textContent = `${Math.round((schedMinutesAcc + pomodoroMinutesAcc) / 60)}h`;

        const totalSessions = Store.getAllSchedules().length;
        document.getElementById("admin-total-tasks").textContent = totalSessions;

        // Render registry table
        this.renderUsersDirectory();
    },

    renderUsersDirectory() {
        const tbody = document.getElementById("admin-users-table-body");
        tbody.innerHTML = "";

        const users = Store.getAllUsers();
        const searchVal = document.getElementById("admin-user-search").value.toLowerCase();

        const matchedUsers = users.filter(u => u.email.toLowerCase().includes(searchVal) || u.name.toLowerCase().includes(searchVal));

        if (matchedUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center;">No registered user accounts found matching email filter.</td></tr>`;
            return;
        }

        // Sort by name
        matchedUsers.sort((a, b) => a.name.localeCompare(b.name));

        matchedUsers.forEach(u => {
            const totalMin = (u.stats?.studyTime || 0); // Focus room time spent
            const totalHrs = (totalMin / 60).toFixed(1);

            // Count tasks assignments parameters
            const userTasksCount = Store.getAllTasks().filter(t => t.userId === u.id).length;

            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${u.joinedDate || "2026-08-15"}</td>
        <td><strong>${u.name}</strong></td>
        <td><code>${u.email}</code></td>
        <td><span class="role-badge ${u.role}">${u.role}</span></td>
        <td>${totalHrs} Hrs focus</td>
        <td>${userTasksCount} Tasks board</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary btn-admin-toggle-role" style="font-size:0.75rem; padding: 4px 10px;">Toggle Role</button>
            <button class="action-btn delete btn-admin-delete-user" title="Delete Profile"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;

            tr.querySelector(".btn-admin-toggle-role").addEventListener("click", () => this.toggleUserRole(u.id));
            tr.querySelector(".btn-admin-delete-user").addEventListener("click", () => this.deleteUser(u.id));

            tbody.appendChild(tr);
        });
    }
};

// --- MAIN RUNTIME INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    // Setup Subsystems
    AuthSystem.init();
    Dashboard.init();
    CalendarView.init();
    KanbanView.init();
    FocusRoom.init();
    AdminPanel.init();

    // Sync from Supabase at startup
    if (supabase) {
        await Store.syncFromSupabase();
    }

    // If no session, route to Landing View
    if (!AppState.currentUser) {
        Navigator.showView("view-landing");
    } else {
        Navigator.showView("view-dashboard");
    }
});

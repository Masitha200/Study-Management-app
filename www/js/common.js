/**
 * Aether Academic - Common Shared Configuration & Storage
 * Handles Store (Local & Supabase Client), State, Check-Auth, common UI elements like sidebar / topbar, and utility helpers.
 */

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = "https://njpsvzfzucfmvatihdyr.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qcHN2emZ6dWNmbXZhdGloZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODcyOTAsImV4cCI6MjEwMjM2MzI5MH0.gvSUsiG-c9L-YNYZ1cH1wcqCHzGw3HVDn_eK9gjWIWU"; // Replace this with your project's Anon/Public API Key

let supabaseClient = null; // Always null to run in 100% offline local-storage mode

// --- INITIAL SEED DATA ---
const DEFAULT_USERS = [
    {
        id: "user-admin-seed",
        name: "Aether Administrator",
        email: "admin@learnscheduler.com",
        password: "admin123",
        role: "admin",
        joinedDate: "2026-08-01",
        stats: { studyTime: 0, completedTasks: 0 }
    },
    {
        id: "user-student-seed",
        name: "Student Profile",
        email: "student@learn.com",
        password: "user123",
        role: "student",
        joinedDate: "2026-08-16",
        stats: { studyTime: 0, completedTasks: 0 }
    }
];

const DEFAULT_SCHEDULES = [];

const DEFAULT_TASKS = [];

const DEFAULT_SUBJECTS = [
    { id: "mathematics", name: "Mathematics", color: "#8b5cf6", user_id: null },
    { id: "physics", name: "Physics", color: "#3b82f6", user_id: null },
    { id: "chemistry", name: "Chemistry", color: "#10b981", user_id: null },
    { id: "biology", name: "Biology", color: "#f97316", user_id: null },
    { id: "computer_science", name: "Computer Science", color: "#a78bfa", user_id: null },
    { id: "literature", name: "Literature", color: "#ec4899", user_id: null },
    { id: "general_study", name: "General Study", color: "#6b7280", user_id: null }
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

// Convert Hex color to RGB string (e.g. #8b5cf6 -> 139, 92, 246)
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '139, 92, 246';
}

// --- DATA ACCESS LAYER (STORE) ---
const Store = {
    get(key, defaultValue) {
        try {
            const raw = localStorage.getItem(`aether_${key}`);
            if (!raw) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.error(`Error parsing localStorage key 'aether_${key}'. Resetting to default.`, e);
            localStorage.setItem(`aether_${key}`, JSON.stringify(defaultValue));
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(`aether_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error(`Error writing to localStorage key 'aether_${key}':`, e);
        }
    },

    initialize() {
        // Auto purge old seed data if present in localStorage to guarantee a clean slate
        if (localStorage.getItem("aether_schedules") && localStorage.getItem("aether_schedules").includes("sched-1")) {
            localStorage.removeItem("aether_users");
            localStorage.removeItem("aether_schedules");
            localStorage.removeItem("aether_tasks");
            localStorage.removeItem("aether_active_session");
        }

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
        const fallback = subs.length > 0 ? subs : DEFAULT_SUBJECTS;
        if (AppState.currentUser) {
            return fallback.filter(s => !s.user_id || s.user_id === AppState.currentUser.id);
        }
        return fallback.filter(s => !s.user_id);
    },
    saveAllSubjects(subjects) { this.set("subjects", subjects); },

    async syncFromSupabase() {
        if (!supabaseClient) return;
        try {
            // 1. Fetch Users
            const { data: users, error: errU } = await supabaseClient.from('users').select('*');
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
            const { data: schedules, error: errS } = await supabaseClient.from('schedules').select('*');
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
            const { data: tasks, error: errT } = await supabaseClient.from('tasks').select('*');
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

            // 4. Fetch Subjects (defaults + current user's subjects)
            let subQuery = supabaseClient.from('subjects').select('*');
            if (AppState.currentUser) {
                subQuery = subQuery.or(`user_id.is.null,user_id.eq.${AppState.currentUser.id}`);
            } else {
                subQuery = subQuery.is('user_id', null);
            }
            const { data: subjects, error: errSub } = await subQuery;
            if (!errSub && subjects) {
                const localSubs = this.get("subjects", DEFAULT_SUBJECTS);
                const currentUserId = AppState.currentUser ? AppState.currentUser.id : null;
                const otherUsersSubs = localSubs.filter(s => s.user_id && s.user_id !== currentUserId);
                const mergedSubs = [
                    ...otherUsersSubs,
                    ...subjects.map(s => ({
                        id: s.id,
                        name: s.name,
                        color: s.color,
                        user_id: s.user_id
                    }))
                ];
                this.saveAllSubjects(mergedSubs);
            }

            // 5. Fetch Announcements
            const { data: announcements, error: errAnn } = await supabaseClient.from('announcements').select('*').order('id', { ascending: false }).limit(1);
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

// Load active user, fallback to default student profile if none exists
let activeUser = null;
const savedSession = localStorage.getItem("aether_active_session");
if (savedSession) {
    activeUser = Store.getAllUsers().find(u => u.email === savedSession);
}
if (!activeUser) {
    activeUser = Store.getAllUsers().find(u => u.role === "student") || DEFAULT_USERS[1];
    localStorage.setItem("aether_active_session", activeUser.email);
}
AppState.currentUser = activeUser;

// Bypass auth redirects for offline mode
function checkAuth() {
    // currentUser is always auto-assigned, so they are always authenticated!
}

function redirectIfLoggedIn() {
    // No need to redirect
}

// Handle Logout
function logoutCommon() {
    AppState.currentUser = null;
    localStorage.removeItem("aether_active_session");

    // Stop backing tracking audios if focus room is running
    const streams = ["rain", "library", "lofi"];
    streams.forEach(s => {
        const aud = document.getElementById(`ambient-audio-${s}`);
        if (aud) {
            aud.pause();
        }
    });

    window.location.href = "index.html";
}

// Refresh banner displays
function refreshAnnouncementBannerCommon() {
    const ann = Store.getAnnouncement();
    const banner = document.getElementById("dynamic-announcement");
    const container = document.getElementById("announcement-text");

    if (banner && container) {
        if (ann && ann.active) {
            container.textContent = ann.content;
            banner.classList.add("sys-active");
        } else {
            container.textContent = "Set study sessions, coordinate assignments, stay on task!";
            banner.classList.remove("sys-active");
        }
    }
}

// Populate Subject Dropdowns dynamically
function populateSubjectDropdowns() {
    const subjects = Store.getAllSubjects();

    // Dropdown 1: Scheduler Filter
    const filterSelect = document.getElementById("scheduler-filter-subject");
    if (filterSelect) {
        const currentVal = filterSelect.value || "all";
        filterSelect.innerHTML = `<option value="all">All Subjects</option>`;
        subjects.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = currentVal;
    }

    // Dropdown 2: Scheduler add/edit modal subject dropdown
    const scheduleSelect = document.getElementById("schedule-subject");
    if (scheduleSelect) {
        const currentVal = scheduleSelect.value || "";
        scheduleSelect.innerHTML = "";
        subjects.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            scheduleSelect.appendChild(opt);
        });
        if (currentVal && subjects.some(s => s.id === currentVal)) {
            scheduleSelect.value = currentVal;
        }
    }

    // Dropdown 3: Focus Session subject dropdown
    const focusSelect = document.getElementById("focus-session-title");
    if (focusSelect) {
        const currentVal = focusSelect.value || "";
        focusSelect.innerHTML = "";
        subjects.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            focusSelect.appendChild(opt);
        });
        if (currentVal && subjects.some(s => s.id === currentVal)) {
            focusSelect.value = currentVal;
        }
    }
}

/**
 * Initialize Mobile Navigation Bar & Drawer Slide Trigger
 */
function setupMobileSidebar() {
    if (typeof document === "undefined") return;

    const sidebar = document.querySelector(".sidebar");
    const layout = document.querySelector(".dashboard-layout");
    const mainContent = document.querySelector(".dashboard-main");
    if (!sidebar || !layout || !mainContent) return;

    // Create a beautiful hamburger toggle button inside a sticky mobile bar
    if (!document.getElementById("aether-mobile-hdr")) {
        const mobileHdr = document.createElement("div");
        mobileHdr.id = "aether-mobile-hdr";
        mobileHdr.className = "aether-mobile-header";

        mobileHdr.innerHTML = `
            <button class="mobile-hdr-btn" id="btn-mobile-menu-open">
                <i class="fa-solid fa-bars-staggered"></i>
            </button>
            <div class="mobile-hdr-logo">
                <i class="fa-solid fa-graduation-cap logo-icon" style="color: var(--primary-accent);"></i>
                <span>Aether<span class="gradient-text" style="font-weight:800; background: linear-gradient(135deg, #a78bfa 0%, #3b82f6 50%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Academic</span></span>
            </div>
            <div class="mobile-hdr-profile" id="btn-mobile-menu-profile">
                <div class="avatar-circle" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-accent); display:flex; align-items:center; justify-content:center; font-size:0.85rem; color:#fff;">
                    <i class="fa-solid fa-user"></i>
                </div>
            </div>
        `;

        layout.insertBefore(mobileHdr, mainContent);

        // Backdrop overlay
        const overlay = document.createElement("div");
        overlay.id = "mobile-sidebar-overlay";
        overlay.className = "mobile-menu-overlay";
        document.body.appendChild(overlay);

        // Sidebar close gesture
        if (!document.getElementById("btn-mobile-menu-close")) {
            const sidebarHdr = document.querySelector(".sidebar-header");
            if (sidebarHdr) {
                const closeBtn = document.createElement("button");
                closeBtn.id = "btn-mobile-menu-close";
                closeBtn.className = "sidebar-hdr-close-btn";
                closeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
                sidebarHdr.appendChild(closeBtn);

                closeBtn.addEventListener("click", () => closeMobileMenu());
            }
        }

        // Toggle triggers
        document.getElementById("btn-mobile-menu-open").addEventListener("click", () => openMobileMenu());
        overlay.addEventListener("click", () => closeMobileMenu());

        // Redirect profile action click to settings
        document.getElementById("btn-mobile-menu-profile").addEventListener("click", () => {
            window.location.href = "settings.html";
        });
    }

    function openMobileMenu() {
        sidebar.classList.add("open");
        document.getElementById("mobile-sidebar-overlay").classList.add("active");
        document.body.style.overflow = "hidden"; // Disable body scroll
    }

    function closeMobileMenu() {
        sidebar.classList.remove("open");
        const overlay = document.getElementById("mobile-sidebar-overlay");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = ""; // Enable body scroll
    }
}

// Common UI Initialization
function updateCommonUI() {
    const current = AppState.currentUser;
    if (!current) return;

    // Request local notification permissions if available
    if (typeof Notifications !== "undefined") {
        Notifications.requestPermission();
    }

    // Call mobile sidebar initialization
    setupMobileSidebar();

    // Sidebar user details
    const navUsername = document.getElementById("nav-username");
    if (navUsername) navUsername.textContent = current.name;
    const navUseremail = document.getElementById("nav-useremail");
    if (navUseremail) navUseremail.textContent = current.email;

    // Sidebar profile image render
    const navUserAvatar = document.getElementById("nav-user-avatar");
    if (navUserAvatar) {
        if (current.profileImage) {
            navUserAvatar.innerHTML = `<img src="${current.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            navUserAvatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
    }

    // Mobile header profile image render
    const mobileHdrProfile = document.getElementById("btn-mobile-menu-profile");
    if (mobileHdrProfile) {
        const avatarCircle = mobileHdrProfile.querySelector(".avatar-circle");
        if (avatarCircle) {
            if (current.profileImage) {
                avatarCircle.innerHTML = `<img src="${current.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarCircle.innerHTML = `<i class="fa-solid fa-user"></i>`;
            }
        }
    }

    // Header greeting
    const greetingName = document.getElementById("greeting-name");
    if (greetingName) greetingName.textContent = current.name.split(" ")[0];

    // Role badge
    const roleBadge = document.getElementById("sidebar-role-badge");
    if (roleBadge) {
        roleBadge.textContent = current.role === "admin" ? "Admin" : "Student";
        if (current.role === "admin") {
            roleBadge.classList.add("admin");
        } else {
            roleBadge.classList.remove("admin");
        }
    }

    // Role-restricted sidebar links
    const adminLink = document.getElementById("sidebar-admin-link");
    if (adminLink) {
        if (current.role === "admin") {
            adminLink.style.display = "flex";
        } else {
            adminLink.style.display = "none";
            // Check illegal access
            if (window.location.pathname.includes("admin.html")) {
                localStorage.setItem('aether_pending_alert', JSON.stringify({
                    type: 'error',
                    title: 'Access Denied',
                    msg: 'You do not have permissions to access the Administration Panel!'
                }));
                window.location.href = "dashboard.html";
            }
        }
    }

    // Announcement banner
    refreshAnnouncementBannerCommon();

    // Map active states on sidebar
    const path = window.location.pathname;
    document.querySelectorAll(".sidebar-menu a").forEach(link => {
        const href = link.getAttribute("href");
        if (href && (path.endsWith(href) || (href === "dashboard.html" && path.endsWith("/")))) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // Handle logout button
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.style.display = "none"; // Hide logout button in offline local mode
    }
}

/**
 * Aether Academic Custom Graphical Alerts System
 */
const Alerts = {
    init() {
        if (typeof document === "undefined") return;

        // Create toast container if not exists
        if (!document.getElementById("toast-container")) {
            const container = document.createElement("div");
            container.id = "toast-container";
            container.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                z-index: 99999;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Inject custom toast/modal styling
        if (!document.getElementById("custom-alerts-styles")) {
            const styles = document.createElement("style");
            styles.id = "custom-alerts-styles";
            styles.innerHTML = `
                .aether-toast {
                    min-width: 300px;
                    max-width: 400px;
                    padding: 16px 20px;
                    background: rgba(18, 18, 30, 0.85);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06);
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    transform: translateY(20px);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    pointer-events: auto;
                }
                .aether-toast.show {
                    transform: translateY(0);
                    opacity: 1;
                }
                .aether-toast.success {
                    border-left: 4px solid #10b981;
                }
                .aether-toast.error {
                    border-left: 4px solid #f43f5e;
                }
                .aether-toast.info {
                    border-left: 4px solid #8b5cf6;
                }
                .toast-icon {
                    font-size: 1.25rem;
                }
                .toast-icon.success { color: #10b981; }
                .toast-icon.error { color: #f43f5e; }
                .toast-icon.info { color: #c084fc; }
                .toast-content {
                    flex-grow: 1;
                }
                .toast-title {
                    font-weight: 700;
                    font-size: 0.9rem;
                    margin-bottom: 2px;
                    font-family: 'Outfit', sans-serif;
                }
                .toast-msg {
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.7);
                }
                
                /* Modal Confirm styles */
                .aether-modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(6, 6, 12, 0.7);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .aether-modal-backdrop.show {
                    opacity: 1;
                }
                .aether-modal {
                    background: rgba(18, 18, 30, 0.85);
                    backdrop-filter: blur(30px) saturate(200%);
                    -webkit-backdrop-filter: blur(30px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 420px;
                    padding: 28px;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.06);
                    transform: scale(0.92);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .aether-modal-backdrop.show .aether-modal {
                    transform: scale(1);
                    opacity: 1;
                }
                .aether-modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 15px;
                }
                .aether-modal-header i {
                    font-size: 1.5rem;
                }
                .aether-modal-header i.confirm-warning {
                    color: #fb923c;
                }
                .aether-modal-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #fff;
                }
                .aether-modal-body {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.75);
                    line-height: 1.5;
                    margin-bottom: 24px;
                }
                .aether-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .aether-modal-btn {
                    padding: 8px 18px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.08);
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .aether-modal-btn.cancel {
                    background: rgba(255, 255, 255, 0.03);
                    color: rgba(255,255,255,0.7);
                }
                .aether-modal-btn.cancel:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                }
                .aether-modal-btn.confirm-action {
                    background: var(--primary-accent, #8b5cf6);
                    color: #fff;
                    border: none;
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.25);
                }
                .aether-modal-btn.confirm-action:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
                }
                .aether-modal-btn.danger {
                    background: #f43f5e;
                    color: #fff;
                    border: none;
                    box-shadow: 0 4px 15px rgba(244, 63, 94, 0.25);
                }
                .aether-modal-btn.danger:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(244, 63, 94, 0.35);
                }
            `;
            document.head.appendChild(styles);
        }

        // Check for pending redirects alerts
        const pending = localStorage.getItem('aether_pending_alert');
        if (pending) {
            localStorage.removeItem('aether_pending_alert');
            try {
                const data = JSON.parse(pending);
                if (data.type === 'error') this.error(data.title, data.msg);
                else if (data.type === 'success') this.success(data.title, data.msg);
                else if (data.type === 'info') this.info(data.title, data.msg);
            } catch (e) { }
        }
    },

    // Toast alert popups
    success(title, message = '') {
        this.toast(title, message, 'success', 'fa-circle-check');
    },

    error(title, message = '') {
        this.toast(title, message, 'error', 'fa-circle-exclamation');
    },

    info(title, message = '') {
        this.toast(title, message, 'info', 'fa-circle-info');
    },

    toast(title, message, type, iconClass) {
        this.init();
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `aether-toast ${type}`;

        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon ${type}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-msg">${message}</div>` : ''}
            </div>
        `;

        container.appendChild(toast);

        // Trigger show animation
        setTimeout(() => toast.classList.add("show"), 10);

        // Fade out & delete
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },

    // Promise-based custom confirmation modal dialog
    confirm(title, message, confirmBtnText = "Continue") {
        this.init();
        return new Promise((resolve) => {
            const backdrop = document.createElement("div");
            backdrop.className = "aether-modal-backdrop";

            backdrop.innerHTML = `
                <div class="aether-modal">
                    <div class="aether-modal-header">
                        <i class="fa-solid fa-triangle-exclamation confirm-warning"></i>
                        <span class="aether-modal-title">${title}</span>
                    </div>
                    <div class="aether-modal-body">${message}</div>
                    <div class="aether-modal-footer">
                        <button class="aether-modal-btn cancel" id="aether-confirm-cancel">Cancel</button>
                        <button class="aether-modal-btn danger" id="aether-confirm-ok">${confirmBtnText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);

            // Trigger animation open
            setTimeout(() => backdrop.classList.add("show"), 10);

            document.getElementById("aether-confirm-ok").addEventListener("click", () => {
                closeModal();
                resolve(true);
            });

            document.getElementById("aether-confirm-cancel").addEventListener("click", () => {
                closeModal();
                resolve(false);
            });

            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop) {
                    closeModal();
                    resolve(false);
                }
            });

            function closeModal() {
                backdrop.classList.remove("show");
                setTimeout(() => backdrop.remove(), 300);
            }
        });
    }
};

// Auto initialize on script load
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => Alerts.init());
    } else {
        Alerts.init();
    }
}

// --- NOTIFICATIONS WRAPPER FOR NATIVE NATIVE & WEB FALLBACK ---
const Notifications = {
    async requestPermission() {
        try {
            if (window.Capacitor && window.Capacitor.isPluginAvailable("LocalNotifications")) {
                const { LocalNotifications } = window.Capacitor.Plugins;
                const status = await LocalNotifications.requestPermissions();
                return status.display === 'granted';
            } else if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
        } catch (e) {
            console.error("Error requesting notifications permission:", e);
        }
        return false;
    },

    async send(title, body) {
        try {
            console.log(`Sending notification: [${title}] ${body}`);
            if (window.Capacitor && window.Capacitor.isPluginAvailable("LocalNotifications")) {
                const { LocalNotifications } = window.Capacitor.Plugins;
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: title,
                            body: body,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 1000) },
                            sound: null,
                            attachments: null,
                            actionTypeId: "",
                            extra: null
                        }
                    ]
                });
            } else if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body: body });
            }
        } catch (e) {
            console.error("Failed to send notification:", e);
        }
    }
};

const NotifiedSchedules = new Set();

function startScheduleNotificationMonitor() {
    setInterval(() => {
        const user = AppState.currentUser;
        if (!user) return;

        const now = new Date();
        const currentDateString = formatDateYMD(now);

        // Format current HH:MM
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${hours}:${minutes}`;

        const schedules = Store.getAllSchedules().filter(s => s.userId === user.id);

        schedules.forEach(s => {
            // Check if schedule is today, starting now, status is not completed, and not yet notified
            if (s.date === currentDateString && s.startTime === currentTimeString && s.status !== "completed") {
                if (!NotifiedSchedules.has(s.id)) {
                    NotifiedSchedules.add(s.id);

                    // Fetch subject name
                    const subjects = Store.getAllSubjects();
                    const subObj = subjects.find(sub => sub.id === s.subject);
                    const subName = subObj ? subObj.name : "Study Session";

                    // Trigger notification
                    Notifications.send(`📖 Session Alert: ${subName}`, `It is time to start: "${s.title}"`);
                }
            }
        });
    }, 15000); // Check every 15 seconds for precision
}

// Start schedule monitor on DOM content ready
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startScheduleNotificationMonitor);
    } else {
        startScheduleNotificationMonitor();
    }
}

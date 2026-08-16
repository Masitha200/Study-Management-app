/**
 * Aether Academic - Systems Admin Controls (Restricted Account Commands)
 */
const AdminPanel = {
    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Check if role is indeed admin
        if (AppState.currentUser?.role !== "admin") {
            localStorage.setItem('aether_pending_alert', JSON.stringify({
                type: 'error',
                title: 'Access Denied',
                msg: 'You do not have permissions to access the Administration Panel!'
            }));
            window.location.href = "dashboard.html";
            return;
        }

        // Announcement submit listener
        document.getElementById("admin-announcement-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.publishBroadcast();
        });

        // Clear announcement banner listener
        document.getElementById("btn-clear-announcement").addEventListener("click", () => {
            this.clearAnnouncement();
        });

        // Search directory listener
        document.getElementById("admin-user-search").addEventListener("input", () => this.renderUsersDirectory());

        // Render layout
        this.render();
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

        if (supabaseClient) {
            supabaseClient.from('announcements').insert({
                content: ann.content,
                active: ann.active,
                date: ann.date
            }).then(({ error }) => { if (error) console.error("Supabase announcement insert error:", error); });
        }

        document.getElementById("announcement-input").value = "";
        refreshAnnouncementBannerCommon();
        Alerts.success("Announcement Broadcasted", "New system announcement broadcasted to all logged-in profiles!");
    },

    clearAnnouncement() {
        const ann = Store.getAnnouncement();
        ann.active = false;
        Store.saveAnnouncement(ann);

        if (supabaseClient) {
            supabaseClient.from('announcements').update({ active: false }).eq('active', true)
                .then(({ error }) => { if (error) console.error("Supabase announcement cancel error:", error); });
        }

        refreshAnnouncementBannerCommon();
        Alerts.success("Announcement Removed", "Active administrator announcement removed from banner dashboard.");
    },

    toggleUserRole(userId) {
        const users = Store.getAllUsers();
        const idx = users.findIndex(u => u.id === userId);

        if (idx !== -1) {
            const oldRole = users[idx].role;
            const newRole = oldRole === "admin" ? "student" : "admin";

            // Prevent self-demotion lockout
            if (users[idx].email === AppState.currentUser.email) {
                Alerts.error("Action Revoked", "You cannot change your own administrator access settings!");
                return;
            }

            users[idx].role = newRole;
            Store.saveAllUsers(users);

            if (supabaseClient) {
                supabaseClient.from('users').update({ role: newRole }).eq('id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase role update failed:", error); });
            }

            this.render();
            Alerts.success("User Role Changed", `User role change: ${users[idx].email} updated to ${newRole}`);
            updateCommonUI();
        }
    },

    async deleteUser(userId) {
        const users = Store.getAllUsers();
        const liveTarget = users.find(u => u.id === userId);

        if (!liveTarget) return;

        if (liveTarget.email === AppState.currentUser.email) {
            Alerts.error("Action Revoked", "You cannot destroy your own administration profile!");
            return;
        }

        const confirmed = await Alerts.confirm(
            "CRITICAL WARNING",
            `This will permanently wipe registration, study logs, and schedules for: ${liveTarget.name} (${liveTarget.email}). Continue?`,
            "Delete User"
        );

        if (confirmed) {
            // Delete user account
            const updatedUsers = users.filter(u => u.id !== userId);
            Store.saveAllUsers(updatedUsers);

            // Clean associated schedules & tasks
            const cleanScheds = Store.getAllSchedules().filter(s => s.userId !== userId);
            Store.saveAllSchedules(cleanScheds);

            const cleanTasks = Store.getAllTasks().filter(t => t.userId !== userId);
            Store.saveAllTasks(cleanTasks);

            if (supabaseClient) {
                supabaseClient.from('users').delete().eq('id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase delete user failed:", error); });

                supabaseClient.from('schedules').delete().eq('user_id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase schedules cascade delete failed:", error); });

                supabaseClient.from('tasks').delete().eq('user_id', userId)
                    .then(({ error }) => { if (error) console.error("Supabase tasks cascade delete failed:", error); });
            }

            this.render();
            Alerts.success("User Record Wiped", "User account and database records successfully wiped.");
        }
    },

    render() {
        if (AppState.currentUser?.role !== "admin") return;

        const users = Store.getAllUsers();
        document.getElementById("admin-total-users").textContent = users.length;

        // Cumulative minutes metrics
        let schedMinutesAcc = Store.getAllSchedules().reduce((acc, curr) => acc + (curr.status === "completed" ? Number(curr.duration) : 0), 0);
        let pomodoroMinutesAcc = users.reduce((acc, curr) => acc + (curr.stats?.studyTime || 0), 0);

        document.getElementById("admin-total-hours").textContent = `${Math.round((schedMinutesAcc + pomodoroMinutesAcc) / 60)}h`;

        const totalSessions = Store.getAllSchedules().length;
        document.getElementById("admin-total-tasks").textContent = totalSessions;

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

        matchedUsers.sort((a, b) => a.name.localeCompare(b.name));

        matchedUsers.forEach(u => {
            const totalMin = (u.stats?.studyTime || 0);
            const totalHrs = (totalMin / 60).toFixed(1);

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

function initAdmin() {
    // Authenticate user session
    checkAuth();

    // Start Admin view hooks
    AdminPanel.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
} else {
    initAdmin();
}

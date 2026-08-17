/**
 * Aether Academic - Settings & Preferences Controller
 * Handles user profile modifications and course subjects directory management.
 */
const SettingsPanel = {
    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Populate User Info
        this.loadUserInfo();

        // Render subjects list
        this.renderSubjectsDirectory();

        // Event listener: Save Profile Form
        document.getElementById("profile-settings-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Event listener: New Subject Form
        document.getElementById("settings-subject-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.addCustomSubject();
        });

        // Initialize Performance/Battery Saver toggle
        const perfToggle = document.getElementById("performance-mode-toggle");
        if (perfToggle) {
            perfToggle.checked = PerformanceManager.isEnabled();
            perfToggle.addEventListener("change", (e) => {
                PerformanceManager.set(e.target.checked);
                Alerts.success(
                    e.target.checked ? "Saver Mode Enabled" : "Saver Mode Disabled",
                    e.target.checked ? "Animations and backgrounds optimized to make the app run faster." : "Premium backgrounds and visual effects restored."
                );
            });
        }

        // Initialize Theme Toggle
        const themeToggle = document.getElementById("theme-mode-toggle");
        if (themeToggle) {
            themeToggle.checked = ThemeManager.isLight();
            themeToggle.addEventListener("change", (e) => {
                const targetTheme = e.target.checked ? "light" : "dark";
                ThemeManager.set(targetTheme);
                Alerts.success(
                    e.target.checked ? "Light Mode Active" : "Dark Mode Active",
                    e.target.checked ? "White theme layout loaded successfully." : "Full premium dark themes restored."
                );
            });
        }

        // Setup base64 profile image selector
        this.tempProfileImage = null;
        const avatarInput = document.getElementById("settings-avatar-input");
        if (avatarInput) {
            avatarInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 800000) {
                        Alerts.error("File Too Large", "Please select an image smaller than 800KB.");
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64Url = event.target.result;

                        const imgEl = document.getElementById("settings-avatar-img");
                        const placeholderEl = document.getElementById("settings-avatar-placeholder");
                        if (imgEl && placeholderEl) {
                            imgEl.src = base64Url;
                            imgEl.style.display = "block";
                            placeholderEl.style.display = "none";
                        }

                        this.tempProfileImage = base64Url;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Initialize premium color presets row
        this.setupColorPicker();
    },

    loadUserInfo() {
        const user = AppState.currentUser;
        if (!user) return;

        document.getElementById("settings-fullname").value = user.name;
        document.getElementById("settings-email").value = user.email;

        // Load Avatar
        const imgEl = document.getElementById("settings-avatar-img");
        const placeholderEl = document.getElementById("settings-avatar-placeholder");
        if (imgEl && placeholderEl) {
            if (user.profileImage) {
                imgEl.src = user.profileImage;
                imgEl.style.display = "block";
                placeholderEl.style.display = "none";
            } else {
                imgEl.style.display = "none";
                placeholderEl.style.display = "block";
            }
        }
    },

    saveProfile() {
        const nameVal = document.getElementById("settings-fullname").value.trim();
        if (!nameVal) return;

        const users = Store.getAllUsers();
        const userIdx = users.findIndex(u => u.id === AppState.currentUser.id);

        if (userIdx !== -1) {
            users[userIdx].name = nameVal;
            if (this.tempProfileImage) {
                users[userIdx].profileImage = this.tempProfileImage;
            }
            Store.saveAllUsers(users);
            AppState.currentUser = users[userIdx];

            updateCommonUI();
            Alerts.success("Profile Updated", "Profile details and avatar updated successfully!");
        }
    },

    getColorName(hex) {
        const names = {
            "#8b5cf6": "Violet",
            "#3b82f6": "Blue",
            "#10b981": "Emerald",
            "#f59e0b": "Amber",
            "#f43f5e": "Rose",
            "#14b8a6": "Teal",
            "#6366f1": "Indigo"
        };
        return names[hex.toLowerCase()] || "Custom Color";
    },

    setupColorPicker() {
        const dots = document.querySelectorAll(".color-dot[data-color]");
        const customDot = document.getElementById("custom-picker-dot-btn");
        const customInput = document.getElementById("settings-custom-color-picker");
        const hiddenInput = document.getElementById("settings-new-subject-color");
        const label = document.getElementById("selected-color-label");

        if (!hiddenInput || !label) return;

        // Click preset color dot
        dots.forEach(dot => {
            dot.addEventListener("click", () => {
                // Clear active states
                document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
                dot.classList.add("active");

                const color = dot.getAttribute("data-color");
                hiddenInput.value = color;
                label.textContent = `${this.getColorName(color)} (${color})`;
            });
        });

        // Change custom color input value
        if (customInput && customDot) {
            customInput.addEventListener("input", (e) => {
                const color = e.target.value;
                hiddenInput.value = color;

                // Mark custom dot active
                document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
                customDot.classList.add("active");

                // Update visual styles on custom dot
                customDot.style.background = color;
                customDot.style.setProperty('--dot-glow', color);
                label.textContent = `Custom (${color})`;
            });
        }
    },

    addCustomSubject() {
        const nameInput = document.getElementById("settings-new-subject-name");
        const hiddenInput = document.getElementById("settings-new-subject-color");

        const name = nameInput.value.trim();
        const color = hiddenInput ? hiddenInput.value : "#8b5cf6";

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

        // Reset Name Input field
        nameInput.value = "";

        // Reset color selector back to default Violet preset (#8b5cf6)
        if (hiddenInput) hiddenInput.value = "#8b5cf6";

        // Reset color dots classes
        document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
        const defaultDot = document.querySelector(".color-dot[data-color='#8b5cf6']");
        if (defaultDot) defaultDot.classList.add("active");

        // Reset custom eye-dropper dot elements
        const customDot = document.getElementById("custom-picker-dot-btn");
        if (customDot) {
            customDot.style.background = "linear-gradient(135deg, #ef4444, #3b82f6, #10b981)";
            customDot.style.setProperty('--dot-glow', 'var(--primary-accent)');
        }

        const label = document.getElementById("selected-color-label");
        if (label) label.textContent = "Violet (#8b5cf6)";

        this.renderSubjectsDirectory();
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
            // Remove from the full storage database
            const allSubjects = Store.get("subjects", DEFAULT_SUBJECTS).filter(s => s.id !== subjId);
            Store.saveAllSubjects(allSubjects);

            // Revert schedules to first available subject (from the current user's available subjects list)
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
            Alerts.success("Subject Deleted", "Subject removed successfully.");
        }
    },

    renderSubjectsDirectory() {
        const container = document.getElementById("settings-subjects-directory-list");
        if (!container) return;

        container.innerHTML = "";

        const subjects = Store.getAllSubjects();
        subjects.forEach(s => {
            const item = document.createElement("div");
            item.className = "subject-dir-item";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.justifyContent = "space-between";
            item.style.background = "rgba(255, 255, 255, 0.03)";
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
                <button class="action-btn delete btn-delete-subject" title="Delete Subject" style="width: 28px; height: 28px; font-size: 0.8rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <i class="fa-solid fa-trash"></i>
                </button>
                `}
            `;

            if (!isDefault) {
                item.querySelector(".btn-delete-subject").addEventListener("click", () => this.deleteCustomSubject(s.id));
            }
            container.appendChild(item);
        });
    }
};

function initSettings() {
    // Redirect if not logged in
    checkAuth();

    // Initialize Settings controllers
    SettingsPanel.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettings);
} else {
    initSettings();
}

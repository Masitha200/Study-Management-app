/**
 * Aether Academic - Focus Room & Pomodoro Controls
 */
const FocusRoom = {
    historicalSessions: [],

    async init() {
        // Sync database from Supabase
        if (supabaseClient) {
            await Store.syncFromSupabase();
        }

        // Apply common sidebar/topbar details
        updateCommonUI();

        // Populate subject dropdown
        populateSubjectDropdowns();

        // Mode toggles
        document.getElementById("btn-mode-pomodoro").addEventListener("click", () => this.setTimerMode("pomodoro", 25));
        document.getElementById("btn-mode-short").addEventListener("click", () => this.setTimerMode("short", 5));
        document.getElementById("btn-mode-long").addEventListener("click", () => this.setTimerMode("long", 15));

        // Play/Pause/Reset controls
        document.getElementById("btn-timer-toggle").addEventListener("click", () => this.togglePlayback());
        document.getElementById("btn-timer-reset").addEventListener("click", () => this.resetTimer());
        document.getElementById("btn-timer-skip").addEventListener("click", () => this.completeFocusCycle());

        // Ambient sound dropdown trigger
        document.getElementById("timer-ambient-sound").addEventListener("change", (e) => this.handleSoundSelection(e.target.value));

        // Render variables
        this.render();
    },

    setTimerMode(mode, minutes) {
        this.stopTimer();
        AppState.timerMode = mode;
        AppState.timerDuration = minutes * 60;
        AppState.timerSecondsRemaining = minutes * 60;

        // Active class toggling buttons
        document.querySelectorAll(".timer-mode-btn").forEach(btn => btn.classList.remove("active"));

        // Match active mode setting button
        const activeBtn = document.getElementById(`btn-mode-${mode}`);
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
        if (ring) {
            ring.style.strokeDashoffset = offset;
        }
    },

    togglePlayback() {
        const icon = document.getElementById("timer-play-icon");
        const playBtn = document.getElementById("btn-timer-toggle");

        if (AppState.timerIsRunning) {
            this.stopTimer();
            if (icon) icon.className = "fa-solid fa-play";
            if (playBtn) playBtn.style.backgroundColor = "var(--primary-accent)";
            document.querySelector(".pomodoro-runner-card")?.classList.remove("running");
        } else {
            this.startTimer();
            if (icon) icon.className = "fa-solid fa-pause";
            if (playBtn) playBtn.style.backgroundColor = "var(--rose-accent)";
            document.querySelector(".pomodoro-runner-card")?.classList.add("running");
        }
    },

    startTimer() {
        AppState.timerIsRunning = true;

        // Start selected ambient audio if any
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
        document.querySelector(".pomodoro-runner-card")?.classList.remove("running");

        // Pause ambient audio tracks
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

        const icon = document.getElementById("timer-play-icon");
        const playBtn = document.getElementById("btn-timer-toggle");
        if (icon) icon.className = "fa-solid fa-play";
        if (playBtn) playBtn.style.backgroundColor = "var(--primary-accent)";

        this.updateVisualTimerHUD();
    },

    completeFocusCycle() {
        this.stopTimer();

        // Increment stats on pomodoro completes
        if (AppState.timerMode === "pomodoro") {
            // Trigger local notification
            if (typeof Notifications !== "undefined") {
                Notifications.send("⏱️ Focus Session Completed!", "Great job! A focus study cycle is complete. Time for a break!");
            }

            const completedSecs = AppState.timerDuration - AppState.timerSecondsRemaining;
            const completedMins = Math.round(completedSecs / 60);

            if (completedMins > 0) {
                const users = Store.getAllUsers();
                const userIdx = users.findIndex(u => u.id === AppState.currentUser.id);
                if (userIdx !== -1) {
                    users[userIdx].stats.studyTime = (users[userIdx].stats.studyTime || 0) + completedMins;
                    Store.saveAllUsers(users);
                    AppState.currentUser = users[userIdx];
                }

                // If a task was linked, trigger progress or completion updates optionally
                const linkedTaskId = document.getElementById("focus-task-linked").value;
                if (linkedTaskId !== "none") {
                    this.incrementLinkedTaskProgress(linkedTaskId);
                }

                // Store Focus record history
                const subjectVal = document.getElementById("focus-session-title").value;
                const focusRecord = {
                    subject: subjectVal,
                    timeSpent: completedMins,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                this.historicalSessions.push(focusRecord);
                this.renderHistoryRecords();

                Alerts.success("Focus block finished!", `You completed ${completedMins} focus minutes!`);
            }
        } else {
            // Trigger local notification
            if (typeof Notifications !== "undefined") {
                Notifications.send("🔔 Break Completed!", "Time to get back to work! Start your next study focus cycle.");
            }
            Alerts.info("Break completed", "Rest break completed. Ready to focus again?");
        }

        this.resetTimer();
    },

    incrementLinkedTaskProgress(taskId) {
        const tasks = Store.getAllTasks();
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            // Automatically promote task from todo to progress if not already completed
            if (tasks[idx].status === "todo") {
                tasks[idx].status = "progress";
                Store.saveAllTasks(tasks);

                if (supabaseClient) {
                    supabaseClient.from('tasks').update({ status: "progress" }).eq('id', taskId)
                        .then(({ error }) => { if (error) console.error("Supabase task progress sync failed:", error); });
                }
            }
        }
    },

    handleSoundSelection(soundName) {
        AppState.timerSound = soundName;

        // Stop all audios first
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
                console.warn("Chrome browser requires user input gestures before audio plays: ", err);
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
            wrap.innerHTML = `<p class="text-muted" style="font-size: 0.8rem; text-align: center; margin-top: 15px;">No focus sessions logged yet today.</p>`;
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
                    <span class="text-muted" style="margin-left: 8px; font-size: 0.75rem;">${f.timestamp}</span>
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

function initFocus() {
    // Authenticate user session
    checkAuth();

    // Start Focus Room components
    FocusRoom.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFocus);
} else {
    initFocus();
}

/**
 * Aether Academic - Authentication Systems
 * Handles signin, signup, demo bypass, states toggling, local database session checks, and redirection.
 */
const AuthSystem = {
    isSignUpFlow: false,

    init() {
        // Switch between flows trigger
        document.getElementById("auth-switch-btn").addEventListener("click", (e) => {
            e.preventDefault();
            this.toggleFlow(!this.isSignUpFlow);
        });

        // Submit form
        document.getElementById("auth-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Parse query params for flow direction
        const urlParams = new URLSearchParams(window.location.search);
        const flow = urlParams.get("flow");
        const isDemo = urlParams.get("demo");

        if (isDemo === "true") {
            this.login("user@learnscheduler.com", "user123");
        } else if (flow === "signup") {
            this.toggleFlow(true);
        } else {
            this.toggleFlow(false);
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

    async handleSubmit() {
        const email = document.getElementById("auth-email").value.trim().toLowerCase();
        const pass = document.getElementById("auth-password").value;
        const name = document.getElementById("auth-name").value.trim();

        if (this.isSignUpFlow) {
            // Signup logic
            const users = Store.getAllUsers();
            if (users.some(u => u.email === email)) {
                Alerts.error("Account Exists", "An account with this email address already exists!");
                return;
            }

            // Determine role
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

            if (supabaseClient) {
                try {
                    const { error } = await supabaseClient.from('users').insert({
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        password: newUser.password,
                        role: newUser.role,
                        joined_date: newUser.joinedDate,
                        stats: newUser.stats
                    });
                    if (error) {
                        console.error("Supabase register error:", error);
                        Alerts.error("Registration Sync Warn", "Warning: Registration failed to sync with cloud. Continuing offline.");
                    }
                } catch (e) {
                    console.error("Supabase network registry failed: ", e);
                }
            }

            localStorage.setItem('aether_pending_alert', JSON.stringify({
                type: 'success',
                title: 'Registration Successful',
                msg: `Account created. Logged in as ${role === 'admin' ? 'Administrator' : 'Student'}.`
            }));
            await this.login(email, pass);
        } else {
            // Login logic
            await this.login(email, pass);
        }
    },

    async login(email, password) {
        // Sync database from Supabase on login page first if available
        if (supabaseClient) {
            try {
                await Store.syncFromSupabase();
            } catch (err) {
                console.error("Failed to sync database during login:", err);
            }
        }

        const users = Store.getAllUsers();
        const user = users.find(u => u.email === email.toLowerCase() && u.password === password);

        if (!user) {
            Alerts.error("Login Failed", "Invalid email credentials or incorrect password!");
            return;
        }

        AppState.currentUser = user;

        // Remember me session check
        const rememberCheckbox = document.getElementById("auth-remember");
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem("aether_active_session", user.email);
        } else {
            // By default, since we are moving across pages, we want the session to persist
            // So we save to active session so they don't get logged out immediately on refresh/page redirect!
            localStorage.setItem("aether_active_session", user.email);
        }

        // Reset elements
        const authForm = document.getElementById("auth-form");
        if (authForm) authForm.reset();

        // If redirecting, cache welcome message
        if (!localStorage.getItem('aether_pending_alert')) {
            localStorage.setItem('aether_pending_alert', JSON.stringify({
                type: 'info',
                title: 'Welcome Back',
                msg: `Logged in successfully as ${user.name}.`
            }));
        }

        // Redirect to dashboard page
        window.location.href = "dashboard.html";
    }
};

function initAuth() {
    // Redirect if already logged in
    redirectIfLoggedIn();

    // Initialize Auth triggers
    AuthSystem.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
} else {
    initAuth();
}

/**
 * Aether Academic - Landing Page Controls
 */
function initLanding() {
    // Check if the user is already logged in, and redirect if so
    redirectIfLoggedIn();

    // Sign In button clicks redirect to dashboard.html directly
    document.querySelectorAll(".btn-login-trigger").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    });

    // Start Planning Free redirects to dashboard.html directly
    document.querySelectorAll(".btn-get-started").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    });

    // Try Live Demo triggers a demo login session and redirects to dashboard.html
    const demoBtn = document.querySelector(".btn-demo-login");
    if (demoBtn) {
        demoBtn.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    }

    // Mobile navbar hamburger toggle
    const toggleBtn = document.getElementById("btn-landing-menu-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            const icon = toggleBtn.querySelector("i");
            if (icon) {
                if (navLinks.classList.contains("active")) {
                    icon.className = "fa-solid fa-xmark";
                } else {
                    icon.className = "fa-solid fa-bars";
                }
            }
        });

        // Close menu when clicking a link or button
        navLinks.querySelectorAll("a, button").forEach(item => {
            item.addEventListener("click", () => {
                navLinks.classList.remove("active");
                const icon = toggleBtn.querySelector("i");
                if (icon) icon.className = "fa-solid fa-bars";
            });
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLanding);
} else {
    initLanding();
}

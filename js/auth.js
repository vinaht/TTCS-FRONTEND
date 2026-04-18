(function () {
    const API_BASE_URL = window.CUBEAL_API_BASE_URL || "http://localhost:5000/api";
    const STORAGE_KEY = "cubeal.auth";

    let session = loadSession();
    let currentUser = session?.user || null;

    function loadSession() {
        try {
            const rawValue = localStorage.getItem(STORAGE_KEY);

            if (!rawValue) {
                return null;
            }

            return JSON.parse(rawValue);
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function saveSession(authData) {
        session = {
            token: authData.token,
            tokenType: authData.tokenType || "Bearer",
            expiresIn: authData.expiresIn,
            user: authData.user
        };
        currentUser = authData.user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        emitAuthChange();
    }

    function clearSession() {
        session = null;
        currentUser = null;
        localStorage.removeItem(STORAGE_KEY);
        emitAuthChange();
    }

    function isAuthenticated() {
        return Boolean(session?.token && currentUser);
    }

    async function apiFetch(path, options = {}) {
        const requestInit = {
            method: options.method || "GET",
            headers: {
                ...(options.headers || {})
            }
        };

        if (!requestInit.headers.Accept) {
            requestInit.headers.Accept = "application/json";
        }

        if (!requestInit.headers.Authorization && session?.token) {
            requestInit.headers.Authorization = `${session.tokenType || "Bearer"} ${session.token}`;
        }

        if (options.body !== undefined) {
            requestInit.headers["Content-Type"] = "application/json";
            requestInit.body = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json") ? await response.json() : null;

        if (!response.ok) {
            if (response.status === 401 && session?.token) {
                clearSession();
            }

            throw new Error(payload?.message || "Request failed.");
        }

        return payload;
    }

    async function fetchCurrentUser() {
        if (!session?.token) {
            currentUser = null;
            renderAuthNav();
            return null;
        }

        try {
            const response = await apiFetch("/auth/me");
            currentUser = response.data;
            session.user = response.data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            renderAuthNav();
            emitAuthChange();
            return currentUser;
        } catch (error) {
            clearSession();
            renderAuthNav();
            return null;
        }
    }

    function emitAuthChange() {
        document.dispatchEvent(
            new CustomEvent("cubeal:auth-changed", {
                detail: {
                    user: currentUser,
                    session
                }
            })
        );
    }

    function getCurrentUser() {
        return currentUser;
    }

    function getRedirectUrl() {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");

        if (next && !next.startsWith("http")) {
            return next;
        }

        return "./timer.html";
    }

    function setMessage(element, text, type) {
        if (!element) {
            return;
        }

        element.hidden = !text;
        element.textContent = text || "";
        element.classList.remove("is-error", "is-success");

        if (type) {
            element.classList.add(type === "error" ? "is-error" : "is-success");
        }
    }

    function renderAuthNav() {
        const navs = document.querySelectorAll("[data-auth-nav]");

        navs.forEach((nav) => {
            if (!nav) {
                return;
            }

            if (currentUser) {
                nav.innerHTML = `
                    <span class="auth-user">${currentUser.username}</span>
                    <button class="header-btn" type="button" data-auth-logout>Dang xuat</button>
                `;
            } else {
                nav.innerHTML = `
                    <a class="header-link" href="./login.html">Dang nhap</a>
                    <a class="header-btn" href="./register.html">Dang ky</a>
                `;
            }
        });

        document.querySelectorAll("[data-auth-logout]").forEach((button) => {
            button.addEventListener("click", () => {
                clearSession();
                renderAuthNav();
                window.location.href = "./index.html";
            });
        });
    }

    function bindLoginForm() {
        const form = document.getElementById("login-form");

        if (!form) {
            return;
        }

        const messageElement = form.querySelector("[data-auth-message]");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const payload = {
                email: String(formData.get("email") || "").trim(),
                password: String(formData.get("password") || ""),
                remember: formData.get("remember") === "on"
            };

            setMessage(messageElement, "Dang dang nhap...", "success");

            try {
                const response = await apiFetch("/auth/login", {
                    method: "POST",
                    body: payload
                });

                saveSession(response.data);
                setMessage(messageElement, "Dang nhap thanh cong. Dang chuyen trang...", "success");
                renderAuthNav();
                window.location.href = getRedirectUrl();
            } catch (error) {
                setMessage(messageElement, error.message, "error");
            }
        });
    }

    function bindRegisterForm() {
        const form = document.getElementById("register-form");

        if (!form) {
            return;
        }

        const messageElement = form.querySelector("[data-auth-message]");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const password = String(formData.get("password") || "");
            const confirmPassword = String(formData.get("confirmPassword") || "");

            if (password !== confirmPassword) {
                setMessage(messageElement, "Mat khau xac nhan khong khop.", "error");
                return;
            }

            const payload = {
                username: String(formData.get("username") || "").trim(),
                email: String(formData.get("email") || "").trim(),
                password
            };

            setMessage(messageElement, "Dang tao tai khoan...", "success");

            try {
                const response = await apiFetch("/auth/register", {
                    method: "POST",
                    body: payload
                });

                saveSession(response.data);
                setMessage(messageElement, "Dang ky thanh cong. Dang chuyen trang...", "success");
                renderAuthNav();
                window.location.href = getRedirectUrl();
            } catch (error) {
                setMessage(messageElement, error.message, "error");
            }
        });
    }

    const ready = (async () => {
        await fetchCurrentUser();
        renderAuthNav();
        bindLoginForm();
        bindRegisterForm();

        const isAuthPage =
            window.location.pathname.endsWith("/login.html") ||
            window.location.pathname.endsWith("/register.html");

        if (isAuthPage && currentUser) {
            window.location.href = "./timer.html";
        }

        return currentUser;
    })();

    window.CubeALAuth = {
        apiFetch,
        clearSession,
        getCurrentUser,
        isAuthenticated,
        ready
    };
})();

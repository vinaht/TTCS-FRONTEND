(function () {
    const auth = window.CubeALAuth;
    const shared = window.CubeALShared;

    const PAGE_LIMIT = 100;

    const elements = {
        pageStatus: document.getElementById("admin-page-status"),
        workspace: document.getElementById("admin-workspace"),
        totalUsersMetric: document.getElementById("metric-total-users"),
        activeUsersMetric: document.getElementById("metric-active-users"),
        inactiveUsersMetric: document.getElementById("metric-inactive-users"),
        totalAlgorithmsMetric: document.getElementById("metric-total-algorithms"),
        filterForm: document.getElementById("user-filter"),
        search: document.getElementById("user-search"),
        status: document.getElementById("user-status"),
        clear: document.getElementById("user-filter-clear"),
        listStatus: document.getElementById("user-list-status"),
        list: document.getElementById("user-list")
    };

    let users = [];
    let sendingReminderUserId = null;

    function setStatus(element, text, type) {
        shared.setStatus(element, text, type);
    }

    function formatDateTime(value) {
        if (!value) {
            return "Chua co du lieu";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Chua co du lieu";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function getActivityLabel(user) {
        const inactiveDays = Number(user.inactiveDays);

        if (!Number.isFinite(inactiveDays)) {
            return "Dang hoat dong";
        }

        if (inactiveDays <= 0) {
            return "Hom nay";
        }

        return `${inactiveDays} ngay truoc`;
    }

    function getRoleLabel(role) {
        return role === "admin" ? "Admin" : "User";
    }

    function getReminderNote(user) {
        if (user.canReceiveReminder) {
            if (user.lastReminderAt) {
                return `Lan gui gan nhat: ${formatDateTime(user.lastReminderAt)}`;
            }

            return "Co the gui nhac nho ngay bay gio.";
        }

        return user.reminderBlockedReason || "User nay chua the nhan nhac nho.";
    }

    async function loadOverview() {
        try {
            const response = await auth.apiFetch("/admin");
            const overview = response.data || {};

            elements.totalUsersMetric.textContent = String(overview.totalUsers ?? 0);
            elements.activeUsersMetric.textContent = String(overview.activeUsers60d ?? 0);
            elements.inactiveUsersMetric.textContent = String(overview.inactiveUsers60d ?? 0);
            elements.totalAlgorithmsMetric.textContent = String(overview.totalAlgorithms ?? 0);
        } catch (error) {
            setStatus(elements.pageStatus, error.message || "Khong the tai tong quan admin.", "error");
        }
    }

    async function fetchAllUsers(baseParams) {
        const items = [];
        let page = 1;
        let totalPages = 1;

        do {
            const params = new URLSearchParams(baseParams);
            params.set("page", String(page));
            params.set("limit", String(PAGE_LIMIT));

            const response = await auth.apiFetch(`/admin/users?${params.toString()}`);
            const pageItems = response.data?.items || [];
            items.push(...pageItems);
            totalPages =
                response.data?.pagination?.totalPages ??
                (pageItems.length < PAGE_LIMIT ? page : page + 1);
            page += 1;
        } while (page <= totalPages);

        return items;
    }

    function renderUsers() {
        elements.list.replaceChildren();

        if (users.length === 0) {
            setStatus(elements.listStatus, "Chua co nguoi dung phu hop.");
            return;
        }

        setStatus(elements.listStatus, "");
        const fragment = document.createDocumentFragment();

        users.forEach((user) => {
            const isSending = String(sendingReminderUserId) === String(user.id);

            const item = document.createElement("article");
            item.className = "user-item";

            const avatar = document.createElement("div");
            avatar.className = "user-avatar";
            avatar.textContent = (user.username || user.email || "?").trim().slice(0, 1) || "?";

            const main = document.createElement("div");
            main.className = "user-main";

            const head = document.createElement("div");
            head.className = "user-head";

            const name = document.createElement("h4");
            name.textContent = user.username || "Nguoi dung";

            const email = document.createElement("p");
            email.className = "user-email";
            email.textContent = user.email || "Chua co email";

            const meta = document.createElement("div");
            meta.className = "user-meta";

            [
                getRoleLabel(user.role),
                getActivityLabel(user),
                formatDateTime(user.lastActivityAt || user.lastLoginAt)
            ]
                .filter(Boolean)
                .forEach((value) => {
                    const pill = document.createElement("span");
                    pill.textContent = value;
                    meta.append(pill);
                });

            const reminder = document.createElement("div");
            reminder.className = "user-reminder";

            const reminderNote = document.createElement("p");
            reminderNote.className = "user-reminder-note";
            reminderNote.textContent = getReminderNote(user);

            const reminderButton = document.createElement("button");
            reminderButton.className = user.canReceiveReminder
                ? "primary-action user-reminder-action"
                : "secondary-action user-reminder-action is-disabled";
            reminderButton.type = "button";
            reminderButton.dataset.remindUser = String(user.id);
            reminderButton.disabled = !user.canReceiveReminder || isSending;
            reminderButton.innerHTML = isSending
                ? '<i class="fa-solid fa-spinner fa-spin"></i> Dang gui'
                : '<i class="fa-solid fa-paper-plane"></i> Gui nhac nho';

            if (!user.canReceiveReminder) {
                reminderButton.title = getReminderNote(user);
            }

            reminder.append(reminderNote, reminderButton);
            head.append(name);
            main.append(head, email, meta, reminder);
            item.append(avatar, main);
            fragment.append(item);
        });

        elements.list.append(fragment);
    }

    async function loadUsers() {
        const params = new URLSearchParams();
        const search = elements.search.value.trim();
        const inactive = elements.status.value;

        if (search) {
            params.set("search", search);
        }

        if (inactive) {
            params.set("inactive", inactive);
        }

        setStatus(elements.listStatus, "Dang tai nguoi dung...");

        try {
            users = await fetchAllUsers(params);
            renderUsers();
        } catch (error) {
            setStatus(elements.listStatus, error.message || "Khong the tai nguoi dung.", "error");
        }
    }

    async function sendReminder(userId) {
        sendingReminderUserId = userId;
        renderUsers();
        setStatus(elements.listStatus, "Dang gui mail nhac nho...");

        try {
            const response = await auth.apiFetch(`/admin/users/${userId}/reminder`, {
                method: "POST"
            });
            const successMessage = response.data?.message || "Da gui mail nhac nho.";

            sendingReminderUserId = null;
            await loadUsers();
            setStatus(elements.listStatus, successMessage, "success");
        } catch (error) {
            sendingReminderUserId = null;
            renderUsers();
            setStatus(elements.listStatus, error.message || "Khong the gui nhac nho.", "error");
        }
    }

    function bindEvents() {
        elements.filterForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadUsers();
        });

        elements.clear.addEventListener("click", async () => {
            elements.filterForm.reset();
            await loadUsers();
        });

        elements.list.addEventListener("click", async (event) => {
            const reminderButton = event.target.closest("[data-remind-user]");

            if (!reminderButton || reminderButton.disabled) {
                return;
            }

            await sendReminder(reminderButton.dataset.remindUser);
        });
    }

    async function init() {
        const user = await auth.ready;

        if (!user) {
            window.location.href = "./login.html?next=./admin-users.html";
            return;
        }

        if (user.role !== "admin") {
            setStatus(elements.pageStatus, "Tai khoan hien tai khong co quyen admin.", "error");
            return;
        }

        setStatus(elements.pageStatus, "");
        elements.workspace.hidden = false;
        bindEvents();
        await Promise.all([loadOverview(), loadUsers()]);
    }

    init();
})();

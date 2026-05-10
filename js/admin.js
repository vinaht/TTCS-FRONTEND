(function () {
    const auth = window.CubeALAuth;
    const shared = window.CubeALShared;

    const PAGE_LIMIT = 100;
    const COURSE = "cfop";
    const stageOptions = shared.getCourseConfig(COURSE).stages;

    const elements = {
        pageStatus: document.getElementById("admin-page-status"),
        workspace: document.getElementById("admin-workspace"),
        totalUsersMetric: document.getElementById("metric-total-users"),
        activeUsersMetric: document.getElementById("metric-active-users"),
        inactiveUsersMetric: document.getElementById("metric-inactive-users"),
        totalAlgorithmsMetric: document.getElementById("metric-total-algorithms"),
        searchForm: document.getElementById("admin-search-form"),
        search: document.getElementById("admin-search"),
        form: document.getElementById("algorithm-form"),
        formTitle: document.getElementById("form-title"),
        id: document.getElementById("algorithm-id"),
        course: document.getElementById("algorithm-course"),
        stage: document.getElementById("algorithm-stage"),
        category: document.getElementById("algorithm-category"),
        caseCode: document.getElementById("algorithm-case"),
        name: document.getElementById("algorithm-name"),
        formula: document.getElementById("algorithm-formula"),
        description: document.getElementById("algorithm-description"),
        imageFile: document.getElementById("algorithm-image"),
        imageUrl: document.getElementById("algorithm-image-url"),
        imagePreview: document.getElementById("image-preview"),
        imagePreviewImg: document.getElementById("image-preview-img"),
        removeImage: document.getElementById("algorithm-remove-image"),
        videoUrl: document.getElementById("algorithm-video"),
        videoStart: document.getElementById("algorithm-video-start"),
        videoEnd: document.getElementById("algorithm-video-end"),
        difficulty: document.getElementById("algorithm-difficulty"),
        sortOrder: document.getElementById("algorithm-sort"),
        isActive: document.getElementById("algorithm-active"),
        formStatus: document.getElementById("algorithm-form-status"),
        submit: document.getElementById("algorithm-submit"),
        reset: document.getElementById("algorithm-reset"),
        filter: document.getElementById("algorithm-filter"),
        filterStage: document.getElementById("filter-stage"),
        listStatus: document.getElementById("algorithm-list-status"),
        list: document.getElementById("algorithm-list"),
        activeUserSearchForm: document.getElementById("active-user-search-form"),
        activeUserSearch: document.getElementById("active-user-search"),
        activeUserStatus: document.getElementById("active-user-status"),
        activeUserList: document.getElementById("active-user-list"),
        userEditor: document.getElementById("user-editor"),
        editUserId: document.getElementById("edit-user-id"),
        editUserUsername: document.getElementById("edit-user-username"),
        editUserEmail: document.getElementById("edit-user-email"),
        editUserRole: document.getElementById("edit-user-role"),
        editUserCancel: document.getElementById("edit-user-cancel"),
        userEditorStatus: document.getElementById("user-editor-status")
    };

    let algorithms = [];
    let activeUsers = [];
    let currentAdminId = null;
    let editingId = null;

    function setStatus(element, text, type) {
        shared.setStatus(element, text, type);
    }

    function getStageLabel(course, stage) {
        return shared.getStageLabel(course, stage);
    }

    function getMediaUrl(url) {
        return shared.getMediaUrl(url);
    }

    function formatVideoTime(value) {
        if (value === undefined || value === null || value === "") {
            return "";
        }

        const totalSeconds = Number(value);

        if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
            return "";
        }

        const roundedSeconds = Math.floor(totalSeconds);
        const hours = Math.floor(roundedSeconds / 3600);
        const minutes = Math.floor((roundedSeconds % 3600) / 60);
        const seconds = roundedSeconds % 60;
        const paddedSeconds = String(seconds).padStart(2, "0");

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
        }

        return `${minutes}:${paddedSeconds}`;
    }

    function getVideoRangeLabel(algorithm) {
        const start = formatVideoTime(algorithm.videoStartSeconds);
        const end = formatVideoTime(algorithm.videoEndSeconds);

        if (start && end) {
            return ` (${start}-${end})`;
        }

        if (start) {
            return ` (từ ${start})`;
        }

        if (end) {
            return ` (đến ${end})`;
        }

        return "";
    }

    function formatDateTime(value) {
        if (!value) {
            return "Chưa có dữ liệu";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Chưa có dữ liệu";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function getActivityLabel(user) {
        const inactiveDays = Number(user.inactiveDays);

        if (!Number.isFinite(inactiveDays)) {
            return "Đang hoạt động";
        }

        if (inactiveDays <= 0) {
            return "Hôm nay";
        }

        return `${inactiveDays} ngày trước`;
    }

    function replaceOptions(select, options, includeAllLabel) {
        shared.replaceOptions(select, options, includeAllLabel);
    }

    function updateStageOptions() {
        elements.course.value = COURSE;
        replaceOptions(elements.stage, stageOptions, null);
        if (!elements.stage.value && elements.stage.options.length > 0) {
            elements.stage.value = elements.stage.options[0].value;
        }
    }

    function updateFilterStages() {
        replaceOptions(elements.filterStage, stageOptions, "Tất cả phần CFOP");
    }

    function showImagePreview(url) {
        if (!url) {
            elements.imagePreview.hidden = true;
            elements.imagePreviewImg.removeAttribute("src");
            return;
        }

        elements.imagePreviewImg.src = getMediaUrl(url);
        elements.imagePreview.hidden = false;
    }

    function resetForm() {
        editingId = null;
        elements.form.reset();
        elements.id.value = "";
        elements.imageUrl.value = "";
        elements.sortOrder.value = "0";
        elements.isActive.checked = true;
        elements.formTitle.textContent = "Thêm công thức";
        elements.submit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu công thức';
        updateStageOptions();
        showImagePreview("");
        setStatus(elements.formStatus, "");
    }

    function buildPayload(imageUrl) {
        const videoUrl = elements.videoUrl.value.trim();

        return {
            course: COURSE,
            stage: elements.stage.value,
            category: elements.category.value.trim(),
            caseCode: elements.caseCode.value.trim(),
            name: elements.name.value.trim(),
            formula: elements.formula.value.trim(),
            description: elements.description.value.trim(),
            imageUrl: imageUrl || "",
            videoUrl,
            videoStartSeconds: videoUrl ? elements.videoStart.value.trim() : "",
            videoEndSeconds: videoUrl ? elements.videoEnd.value.trim() : "",
            difficulty: elements.difficulty.value,
            sortOrder: Number.parseInt(elements.sortOrder.value || "0", 10),
            isActive: elements.isActive.checked
        };
    }

    async function uploadSelectedImage() {
        const file = elements.imageFile.files?.[0];

        if (!file) {
            return elements.imageUrl.value;
        }

        const formData = new FormData();
        formData.append("image", file);

        const response = await auth.apiFetch("/admin/uploads/images", {
            method: "POST",
            body: formData
        });

        return response.data.url;
    }

    function createMeta(values) {
        const meta = document.createElement("div");
        meta.className = "algorithm-meta";

        values.filter(Boolean).forEach((value) => {
            const pill = document.createElement("span");
            pill.textContent = value;
            meta.append(pill);
        });

        return meta;
    }

    function renderAlgorithms() {
        elements.list.replaceChildren();

        if (algorithms.length === 0) {
            setStatus(elements.listStatus, "Chưa có công thức phù hợp.");
            return;
        }

        setStatus(elements.listStatus, "");
        const fragment = document.createDocumentFragment();

        algorithms.forEach((algorithm) => {
            const item = document.createElement("article");
            item.className = "algorithm-item";

            const thumb = document.createElement("div");
            thumb.className = algorithm.imageUrl ? "algorithm-thumb" : "algorithm-thumb is-empty";

            if (algorithm.imageUrl) {
                const image = document.createElement("img");
                image.src = getMediaUrl(algorithm.imageUrl);
                image.alt = algorithm.name || "Ảnh công thức";
                image.loading = "lazy";
                thumb.append(image);
            } else {
                const icon = document.createElement("i");
                icon.className = "fa-solid fa-image";
                thumb.append(icon);
            }

            const content = document.createElement("div");
            const head = document.createElement("div");
            head.className = "algorithm-item-head";

            const titleWrap = document.createElement("div");
            const title = document.createElement("h4");
            title.textContent = algorithm.name;
            titleWrap.append(title);
            titleWrap.append(
                createMeta([
                    algorithm.course?.toUpperCase(),
                    getStageLabel(algorithm.course, algorithm.stage),
                    algorithm.category,
                    algorithm.caseCode,
                    algorithm.difficulty,
                    algorithm.isActive ? "Đang hiển thị" : "Đang tắt"
                ])
            );

            const actions = document.createElement("div");
            actions.className = "algorithm-actions";

            const editButton = document.createElement("button");
            editButton.className = "item-action";
            editButton.type = "button";
            editButton.dataset.editAlgorithm = String(algorithm.id);
            editButton.setAttribute("aria-label", "Sửa công thức");
            editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';

            const deleteButton = document.createElement("button");
            deleteButton.className = "item-action is-danger";
            deleteButton.type = "button";
            deleteButton.dataset.deleteAlgorithm = String(algorithm.id);
            deleteButton.setAttribute("aria-label", "Xóa công thức");
            deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';

            actions.append(editButton, deleteButton);
            head.append(titleWrap, actions);

            const code = document.createElement("p");
            code.className = "algorithm-code";
            code.textContent = algorithm.formula;
            content.append(head, code);

            if (algorithm.description) {
                const description = document.createElement("p");
                description.className = "algorithm-description";
                description.textContent = algorithm.description;
                content.append(description);
            }

            if (algorithm.videoUrl) {
                const video = document.createElement("p");
                video.className = "algorithm-video";
                const link = document.createElement("a");
                link.href = algorithm.videoUrl;
                link.target = "_blank";
                link.rel = "noreferrer";
                link.textContent = `Mở video${getVideoRangeLabel(algorithm)}`;
                video.append(link);
                content.append(video);
            }

            item.append(thumb, content);
            fragment.append(item);
        });

        elements.list.append(fragment);
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
            setStatus(elements.pageStatus, error.message || "Không thể tải tổng quan admin.", "error");
        }
    }

    async function fetchAllAdminAlgorithms(baseParams) {
        const items = [];
        let page = 1;
        let totalPages = 1;

        do {
            const params = new URLSearchParams(baseParams);
            params.set("page", String(page));
            params.set("limit", String(PAGE_LIMIT));

            const response = await auth.apiFetch(`/admin/algorithms?${params.toString()}`);
            const pageItems = response.data?.items || [];
            items.push(...pageItems);
            totalPages = response.data?.pagination?.totalPages ??
                (pageItems.length < PAGE_LIMIT ? page : page + 1);
            page += 1;
        } while (page <= totalPages);

        return items;
    }

    async function fetchAllActiveUsers(baseParams) {
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
            totalPages = response.data?.pagination?.totalPages ??
                (pageItems.length < PAGE_LIMIT ? page : page + 1);
            page += 1;
        } while (page <= totalPages);

        return items;
    }

    async function loadAlgorithms() {
        const params = new URLSearchParams({
            course: COURSE
        });
        const search = elements.search.value.trim();

        if (search) {
            params.set("search", search);
        }

        if (elements.filterStage.value) {
            params.set("stage", elements.filterStage.value);
        }

        setStatus(elements.listStatus, "Đang tải công thức...");

        try {
            algorithms = await fetchAllAdminAlgorithms(params);
            renderAlgorithms();
        } catch (error) {
            setStatus(elements.listStatus, error.message || "Không thể tải công thức.", "error");
        }
    }

    function renderActiveUsers() {
        elements.activeUserList.replaceChildren();

        if (activeUsers.length === 0) {
            setStatus(elements.activeUserStatus, "Chưa có người dùng hoạt động phù hợp.");
            return;
        }

        setStatus(elements.activeUserStatus, "");
        const fragment = document.createDocumentFragment();

        activeUsers.forEach((user) => {
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
            name.textContent = user.username || "Người dùng";

            const editButton = document.createElement("button");
            editButton.className = "item-action";
            editButton.type = "button";
            editButton.dataset.editUser = String(user.id);
            editButton.setAttribute("aria-label", "Sửa người dùng");
            editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';

            const email = document.createElement("p");
            email.className = "user-email";
            email.textContent = user.email || "Chưa có email";

            const meta = document.createElement("div");
            meta.className = "user-meta";

            [user.role || "user", getActivityLabel(user), formatDateTime(user.lastActivityAt || user.lastLoginAt)]
                .filter(Boolean)
                .forEach((value) => {
                    const pill = document.createElement("span");
                    pill.textContent = value;
                    meta.append(pill);
                });

            head.append(name, editButton);
            main.append(head, email, meta);
            item.append(avatar, main);
            fragment.append(item);
        });

        elements.activeUserList.append(fragment);
    }

    async function loadActiveUsers() {
        const params = new URLSearchParams({
            inactive: "false"
        });
        const search = elements.activeUserSearch.value.trim();

        if (search) {
            params.set("search", search);
        }

        setStatus(elements.activeUserStatus, "Đang tải người dùng hoạt động...");

        try {
            activeUsers = await fetchAllActiveUsers(params);
            renderActiveUsers();
        } catch (error) {
            setStatus(
                elements.activeUserStatus,
                error.message || "Không thể tải người dùng hoạt động.",
                "error"
            );
        }
    }

    function resetUserEditor() {
        elements.userEditor.hidden = true;
        elements.editUserId.value = "";
        elements.editUserUsername.value = "";
        elements.editUserEmail.value = "";
        elements.editUserRole.value = "user";
        elements.editUserRole.disabled = false;
        setStatus(elements.userEditorStatus, "");
    }

    async function startEditUser(userId) {
        setStatus(elements.userEditorStatus, "Đang tải người dùng...");
        elements.userEditor.hidden = false;

        try {
            const response = await auth.apiFetch(`/admin/users/${userId}`);
            const user = response.data || {};

            elements.editUserId.value = String(user.id || userId);
            elements.editUserUsername.value = user.username || "";
            elements.editUserEmail.value = user.email || "";
            elements.editUserRole.value = user.role || "user";
            elements.editUserRole.disabled = String(user.id) === String(currentAdminId);
            setStatus(elements.userEditorStatus, "Đang sửa người dùng.", "success");
            elements.editUserUsername.focus();
        } catch (error) {
            setStatus(elements.userEditorStatus, error.message || "Không thể tải người dùng.", "error");
        }
    }

    async function saveUserEdit() {
        const userId = elements.editUserId.value;

        if (!userId) {
            return;
        }

        const payload = {
            username: elements.editUserUsername.value.trim(),
            email: elements.editUserEmail.value.trim()
        };

        if (!elements.editUserRole.disabled) {
            payload.role = elements.editUserRole.value;
        }

        setStatus(elements.userEditorStatus, "Đang lưu người dùng...");

        try {
            await auth.apiFetch(`/admin/users/${userId}`, {
                method: "PATCH",
                body: payload
            });

            setStatus(elements.userEditorStatus, "Đã lưu người dùng.", "success");
            await Promise.all([loadOverview(), loadActiveUsers()]);
        } catch (error) {
            setStatus(elements.userEditorStatus, error.message || "Không thể lưu người dùng.", "error");
        }
    }

    function startEdit(algorithmId) {
        const algorithm = algorithms.find((item) => String(item.id) === String(algorithmId));

        if (!algorithm) {
            return;
        }

        editingId = algorithm.id;
        elements.id.value = String(algorithm.id);
        elements.course.value = COURSE;
        updateStageOptions();
        elements.stage.value = algorithm.stage || elements.stage.value;
        elements.category.value = algorithm.category || "";
        elements.caseCode.value = algorithm.caseCode || "";
        elements.name.value = algorithm.name || "";
        elements.formula.value = algorithm.formula || "";
        elements.description.value = algorithm.description || "";
        elements.imageFile.value = "";
        elements.imageUrl.value = algorithm.imageUrl || "";
        elements.videoUrl.value = algorithm.videoUrl || "";
        elements.videoStart.value = formatVideoTime(algorithm.videoStartSeconds);
        elements.videoEnd.value = formatVideoTime(algorithm.videoEndSeconds);
        elements.difficulty.value = algorithm.difficulty || "";
        elements.sortOrder.value = String(algorithm.sortOrder ?? 0);
        elements.isActive.checked = Boolean(algorithm.isActive);
        elements.formTitle.textContent = "Sửa công thức";
        elements.submit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập nhật';
        showImagePreview(algorithm.imageUrl);
        setStatus(elements.formStatus, "Đang sửa công thức hiện có.", "success");
        elements.name.focus();
    }

    async function deleteAlgorithm(algorithmId) {
        const confirmed = window.confirm("Xóa công thức này?");

        if (!confirmed) {
            return;
        }

        setStatus(elements.listStatus, "Đang xóa công thức...");

        try {
            await auth.apiFetch(`/admin/algorithms/${algorithmId}`, {
                method: "DELETE"
            });

            if (String(editingId) === String(algorithmId)) {
                resetForm();
            }

            await loadAlgorithms();
            setStatus(elements.formStatus, "Đã xóa công thức.", "success");
        } catch (error) {
            setStatus(elements.listStatus, error.message || "Không thể xóa công thức.", "error");
        }
    }

    function bindEvents() {
        elements.reset.addEventListener("click", resetForm);

        elements.imageFile.addEventListener("change", () => {
            const file = elements.imageFile.files?.[0];

            if (!file) {
                showImagePreview(elements.imageUrl.value);
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            showImagePreview(objectUrl);
        });

        elements.removeImage.addEventListener("click", () => {
            elements.imageFile.value = "";
            elements.imageUrl.value = "";
            showImagePreview("");
        });

        elements.searchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadAlgorithms();
        });

        elements.filter.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadAlgorithms();
        });

        elements.activeUserSearchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadActiveUsers();
        });

        elements.userEditor.addEventListener("submit", async (event) => {
            event.preventDefault();
            await saveUserEdit();
        });

        elements.editUserCancel.addEventListener("click", resetUserEditor);

        elements.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatus(elements.formStatus, "Đang lưu công thức...");
            elements.submit.disabled = true;

            try {
                const imageUrl = await uploadSelectedImage();
                const payload = buildPayload(imageUrl);
                const path = editingId ? `/admin/algorithms/${editingId}` : "/admin/algorithms";
                const method = editingId ? "PUT" : "POST";
                const wasEditing = Boolean(editingId);

                const response = await auth.apiFetch(path, {
                    method,
                    body: payload
                });

                elements.imageUrl.value = response.data.imageUrl || "";
                elements.imageFile.value = "";
                showImagePreview(response.data.imageUrl);
                await loadAlgorithms();

                if (!wasEditing) {
                    resetForm();
                }

                setStatus(elements.formStatus, "Đã lưu công thức.", "success");
            } catch (error) {
                setStatus(elements.formStatus, error.message || "Không thể lưu công thức.", "error");
            } finally {
                elements.submit.disabled = false;
            }
        });

        elements.list.addEventListener("click", async (event) => {
            const editButton = event.target.closest("[data-edit-algorithm]");
            const deleteButton = event.target.closest("[data-delete-algorithm]");

            if (editButton) {
                startEdit(editButton.dataset.editAlgorithm);
                return;
            }

            if (deleteButton) {
                await deleteAlgorithm(deleteButton.dataset.deleteAlgorithm);
            }
        });

        elements.activeUserList.addEventListener("click", async (event) => {
            const editButton = event.target.closest("[data-edit-user]");

            if (editButton) {
                await startEditUser(editButton.dataset.editUser);
            }
        });
    }

    async function init() {
        const user = await auth.ready;

        if (!user) {
            window.location.href = "./login.html?next=./admin.html";
            return;
        }

        if (user.role !== "admin") {
            setStatus(elements.pageStatus, "Tài khoản hiện tại không có quyền admin.", "error");
            return;
        }

        currentAdminId = user.id;
        setStatus(elements.pageStatus, "");
        elements.workspace.hidden = false;
        updateStageOptions();
        updateFilterStages();
        bindEvents();
        await Promise.all([loadOverview(), loadAlgorithms(), loadActiveUsers()]);
    }

    init();
})();

(function () {
    const auth = window.CubeALAuth || null;
    const shared = window.CubeALShared;

    const elements = {
        title: document.getElementById("user-title"),
        solveCount: document.getElementById("solve-count"),
        formulaCount: document.getElementById("formula-count"),
        tabs: document.querySelectorAll("[data-user-tab]"),
        panels: document.querySelectorAll("[data-user-panel]"),
        solveStatus: document.getElementById("solve-status"),
        solveTableWrap: document.getElementById("solve-table-wrap"),
        solveBody: document.getElementById("solve-body"),
        formulaForm: document.getElementById("formula-form"),
        formulaId: document.getElementById("formula-id"),
        formulaName: document.getElementById("formula-name"),
        formulaCategory: document.getElementById("formula-category"),
        formulaCase: document.getElementById("formula-case"),
        formulaValue: document.getElementById("formula-value"),
        formulaNotes: document.getElementById("formula-notes"),
        formulaFormStatus: document.getElementById("formula-form-status"),
        formulaSubmit: document.getElementById("formula-submit"),
        formulaAddCancel: document.getElementById("formula-add-cancel"),
        formulaEditCancel: document.getElementById("formula-edit-cancel"),
        formulaFilter: document.getElementById("formula-filter"),
        formulaSearch: document.getElementById("formula-search"),
        formulaFilterCategory: document.getElementById("formula-filter-category"),
        formulaFilterClear: document.getElementById("formula-filter-clear"),
        formulaStatus: document.getElementById("formula-status"),
        formulaList: document.getElementById("formula-list"),
        formulaDeleteModal: document.getElementById("formula-delete-modal"),
        formulaDeleteName: document.getElementById("formula-delete-name"),
        formulaDeleteCancel: document.getElementById("formula-delete-cancel"),
        formulaDeleteConfirm: document.getElementById("formula-delete-confirm"),
        passwordForm: document.getElementById("password-form"),
        currentPassword: document.getElementById("current-password"),
        newPassword: document.getElementById("new-password"),
        confirmPassword: document.getElementById("confirm-password"),
        passwordStatus: document.getElementById("password-status"),
        passwordSubmit: document.getElementById("password-submit")
    };

    let formulas = [];
    let editingFormulaId = null;
    let pendingDeleteFormulaId = null;
    let pendingDeleteReturnFocus = null;

    function redirectToLogin() {
        window.location.href = "./login.html?next=./user.html";
    }

    function setStatus(element, message, type = "") {
        shared.setStatus(element, message, type);
    }

    function formatDate(value) {
        if (!value) {
            return "N/A";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "N/A";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function formatSolveTime(solve) {
        const seconds = solve.durationSeconds;
        return Number.isFinite(Number(seconds)) ? `${Number(seconds).toFixed(2)}s` : "N/A";
    }

    function createCell(text, className = "") {
        const cell = document.createElement("td");
        cell.textContent = text || "N/A";

        if (className) {
            cell.className = className;
        }

        return cell;
    }

    function switchTab(tabName) {
        elements.tabs.forEach((tab) => {
            const isActive = tab.dataset.userTab === tabName;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });

        elements.panels.forEach((panel) => {
            const isActive = panel.dataset.userPanel === tabName;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
        });
    }

    async function loadSolves() {
        setStatus(elements.solveStatus, "Đang tải lịch sử giải...");
        elements.solveTableWrap.hidden = true;
        elements.solveBody.replaceChildren();

        try {
            const response = await auth.apiFetch("/solves?limit=50");
            const solves = response.data?.items || [];
            elements.solveCount.textContent = String(response.data?.total ?? solves.length);

            if (solves.length === 0) {
                setStatus(elements.solveStatus, "Chưa có solve nào được lưu.");
                return;
            }

            const fragment = document.createDocumentFragment();

            solves.forEach((solve) => {
                const row = document.createElement("tr");
                row.append(
                    createCell(formatSolveTime(solve), "time-cell"),
                    createCell(solve.scramble || "N/A", "scramble-cell"),
                    createCell(solve.notes || "N/A", "muted-cell"),
                    createCell(formatDate(solve.createdAt), "muted-cell")
                );
                fragment.append(row);
            });

            elements.solveBody.append(fragment);
            elements.solveTableWrap.hidden = false;
            setStatus(elements.solveStatus, "");
        } catch (error) {
            setStatus(elements.solveStatus, error.message || "Không thể tải lịch sử giải.", "error");
        }
    }

    function getFormulaQuery() {
        const params = new URLSearchParams();
        const search = elements.formulaSearch.value.trim();
        const category = elements.formulaFilterCategory.value.trim();

        params.set("limit", "50");

        if (search) {
            params.set("search", search);
        }

        if (category) {
            params.set("category", category);
        }

        return params.toString();
    }

    async function loadFormulas() {
        setStatus(elements.formulaStatus, "Đang tải công thức...");
        elements.formulaList.replaceChildren();

        try {
            const query = getFormulaQuery();
            const response = await auth.apiFetch(`/user-formulas?${query}`);
            formulas = response.data?.items || [];
            elements.formulaCount.textContent = String(response.data?.total ?? formulas.length);

            if (formulas.length === 0) {
                setStatus(elements.formulaStatus, "Chưa có công thức nào phù hợp.");
                return;
            }

            renderFormulaList();
            setStatus(elements.formulaStatus, "");
        } catch (error) {
            setStatus(elements.formulaStatus, error.message || "Không thể tải công thức.", "error");
        }
    }

    function renderFormulaList() {
        const fragment = document.createDocumentFragment();

        formulas.forEach((formula) => {
            const item = document.createElement("article");
            item.className = "formula-item";

            const head = document.createElement("div");
            head.className = "formula-item-head";

            const titleWrap = document.createElement("div");
            const title = document.createElement("h4");
            title.textContent = formula.name;

            const meta = document.createElement("div");
            meta.className = "formula-meta";

            [formula.category, formula.caseCode].filter(Boolean).forEach((value) => {
                const badge = document.createElement("span");
                badge.textContent = value;
                meta.append(badge);
            });

            titleWrap.append(title, meta);

            const actions = document.createElement("div");
            actions.className = "formula-actions";

            const editButton = document.createElement("button");
            editButton.className = "item-action";
            editButton.type = "button";
            editButton.dataset.editFormula = String(formula.id);
            editButton.setAttribute("aria-label", "Sửa công thức");
            editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';

            const deleteButton = document.createElement("button");
            deleteButton.className = "item-action is-danger";
            deleteButton.type = "button";
            deleteButton.dataset.deleteFormula = String(formula.id);
            deleteButton.setAttribute("aria-label", "Xóa công thức");
            deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';

            actions.append(editButton, deleteButton);
            head.append(titleWrap, actions);

            const formulaCode = document.createElement("p");
            formulaCode.className = "formula-code";
            formulaCode.textContent = formula.formula;

            item.append(head, formulaCode);

            if (formula.notes) {
                const notes = document.createElement("p");
                notes.className = "formula-notes";
                notes.textContent = formula.notes;
                item.append(notes);
            }

            const date = document.createElement("p");
            date.className = "formula-date";
            date.textContent = `Cập nhật: ${formatDate(formula.updatedAt || formula.createdAt)}`;
            item.append(date);

            fragment.append(item);
        });

        elements.formulaList.replaceChildren(fragment);
    }

    function resetFormulaForm() {
        editingFormulaId = null;
        elements.formulaForm.reset();
        elements.formulaId.value = "";
        elements.formulaSubmit.textContent = "Lưu công thức";
        elements.formulaAddCancel.hidden = false;
        elements.formulaEditCancel.hidden = true;
        setStatus(elements.formulaFormStatus, "");
    }

    function getFormulaPayload() {
        return {
            name: elements.formulaName.value.trim(),
            category: elements.formulaCategory.value.trim(),
            caseCode: elements.formulaCase.value.trim(),
            formula: elements.formulaValue.value.trim(),
            notes: elements.formulaNotes.value.trim()
        };
    }

    function getPasswordPayload() {
        return {
            currentPassword: elements.currentPassword.value,
            newPassword: elements.newPassword.value,
            confirmPassword: elements.confirmPassword.value
        };
    }

    function resetPasswordForm() {
        elements.passwordForm.reset();
        setStatus(elements.passwordStatus, "");
    }

    function startEditFormula(formulaId) {
        const formula = formulas.find((item) => String(item.id) === String(formulaId));

        if (!formula) {
            return;
        }

        editingFormulaId = formula.id;
        elements.formulaId.value = String(formula.id);
        elements.formulaName.value = formula.name || "";
        elements.formulaCategory.value = formula.category || "";
        elements.formulaCase.value = formula.caseCode || "";
        elements.formulaValue.value = formula.formula || "";
        elements.formulaNotes.value = formula.notes || "";
        elements.formulaSubmit.textContent = "Cập nhật công thức";
        elements.formulaAddCancel.hidden = true;
        elements.formulaEditCancel.hidden = false;
        setStatus(elements.formulaFormStatus, "Đang sửa công thức hiện có.");
        elements.formulaName.focus();
    }

    function closeDeleteFormulaModal({ restoreFocus = true } = {}) {
        elements.formulaDeleteModal.hidden = true;
        document.body.classList.remove("has-formula-delete-modal");
        elements.formulaDeleteConfirm.disabled = false;
        elements.formulaDeleteName.textContent = "";
        pendingDeleteFormulaId = null;

        if (restoreFocus && pendingDeleteReturnFocus) {
            pendingDeleteReturnFocus.focus();
        }

        pendingDeleteReturnFocus = null;
    }

    function openDeleteFormulaModal(formulaId, triggerElement) {
        const formula = formulas.find((item) => String(item.id) === String(formulaId));

        if (!formula) {
            return;
        }

        pendingDeleteFormulaId = formula.id;
        pendingDeleteReturnFocus = triggerElement || document.activeElement;
        elements.formulaDeleteName.textContent = formula.name || "công thức này";
        elements.formulaDeleteModal.hidden = false;
        document.body.classList.add("has-formula-delete-modal");
        elements.formulaDeleteConfirm.focus();
    }

    async function deleteFormula(formulaId) {
        setStatus(elements.formulaStatus, "Đang xóa công thức...");
        elements.formulaDeleteConfirm.disabled = true;

        try {
            await auth.apiFetch(`/user-formulas/${formulaId}`, {
                method: "DELETE"
            });
            if (String(editingFormulaId) === String(formulaId)) {
                resetFormulaForm();
            }
            await loadFormulas();
            setStatus(elements.formulaFormStatus, "Đã xóa công thức.", "success");
            closeDeleteFormulaModal({ restoreFocus: false });
        } catch (error) {
            setStatus(elements.formulaStatus, error.message || "Không thể xóa công thức.", "error");
            elements.formulaDeleteConfirm.disabled = false;
        }
    }

    function bindEvents() {
        elements.tabs.forEach((tab) => {
            tab.addEventListener("click", () => switchTab(tab.dataset.userTab));
        });

        elements.formulaForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const payload = getFormulaPayload();
            const method = editingFormulaId ? "PUT" : "POST";
            const path = editingFormulaId
                ? `/user-formulas/${editingFormulaId}`
                : "/user-formulas";

            setStatus(elements.formulaFormStatus, "Đang lưu công thức...");

            try {
                await auth.apiFetch(path, {
                    method,
                    body: payload
                });
                resetFormulaForm();
                await loadFormulas();
                setStatus(elements.formulaFormStatus, "Đã lưu công thức.", "success");
            } catch (error) {
                setStatus(elements.formulaFormStatus, error.message || "Không thể lưu công thức.", "error");
            }
        });

        elements.formulaAddCancel.addEventListener("click", resetFormulaForm);
        elements.formulaEditCancel.addEventListener("click", resetFormulaForm);

        elements.formulaFilter.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadFormulas();
        });

        elements.formulaFilterClear.addEventListener("click", async () => {
            elements.formulaFilter.reset();
            await loadFormulas();
        });

        elements.formulaList.addEventListener("click", async (event) => {
            const editButton = event.target.closest("[data-edit-formula]");
            const deleteButton = event.target.closest("[data-delete-formula]");

            if (editButton) {
                startEditFormula(editButton.dataset.editFormula);
                return;
            }

            if (deleteButton) {
                openDeleteFormulaModal(deleteButton.dataset.deleteFormula, deleteButton);
            }
        });

        elements.formulaDeleteCancel.addEventListener("click", () => closeDeleteFormulaModal());

        elements.formulaDeleteModal.addEventListener("click", (event) => {
            if (event.target.closest("[data-delete-modal-close]")) {
                closeDeleteFormulaModal();
            }
        });

        elements.formulaDeleteConfirm.addEventListener("click", async () => {
            if (!pendingDeleteFormulaId) {
                return;
            }

            await deleteFormula(pendingDeleteFormulaId);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !elements.formulaDeleteModal.hidden) {
                closeDeleteFormulaModal();
            }
        });

        elements.passwordForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const payload = getPasswordPayload();

            if (payload.newPassword !== payload.confirmPassword) {
                setStatus(elements.passwordStatus, "Confirm password does not match.", "error");
                return;
            }

            elements.passwordSubmit.disabled = true;
            setStatus(elements.passwordStatus, "Đang đổi mật khẩu...");

            try {
                await auth.apiFetch("/auth/password", {
                    method: "PATCH",
                    body: payload
                });
                resetPasswordForm();
                setStatus(elements.passwordStatus, "Đã đổi mật khẩu. Vui lòng đăng nhập lại.", "success");
                window.setTimeout(() => {
                    auth.clearSession();
                    window.location.href = "./login.html?next=./user.html";
                }, 700);
            } catch (error) {
                setStatus(elements.passwordStatus, error.message || "Không thể đổi mật khẩu.", "error");
                elements.passwordSubmit.disabled = false;
            }
        });
    }

    async function initializeUserPage() {
        if (!auth) {
            redirectToLogin();
            return;
        }

        await auth.ready;

        if (!auth.isAuthenticated()) {
            redirectToLogin();
            return;
        }

        const currentUser = auth.getCurrentUser();

        if (currentUser?.username) {
            elements.title.textContent = currentUser.username;
        }

        bindEvents();
        await Promise.all([loadSolves(), loadFormulas()]);
    }

    initializeUserPage();
})();

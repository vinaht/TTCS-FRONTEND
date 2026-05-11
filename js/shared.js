(function () {
    const API_BASE_URL = window.CUBEAL_API_BASE_URL || "http://localhost:5000/api";
    const API_ORIGIN = new URL(API_BASE_URL, window.location.href).origin;
    const sidebarItems = {
        home: {
            href: "./index.html",
            icon: "fa-house",
            label: "Trang chủ"
        },
        timer: {
            href: "./timer.html",
            icon: "fa-stopwatch",
            label: "Timer"
        },
        user: {
            href: "./user.html",
            icon: "fa-user",
            label: "Người dùng"
        },
        notations: {
            href: "./notations.html",
            icon: "fa-signs-post",
            label: "Kí hiệu"
        },
        beginner: {
            href: "./beginner.html",
            icon: "fa-seedling",
            label: "Beginner"
        },
        cfop: {
            href: "./cfop.html",
            icon: "fa-bolt",
            label: "CFOP"
        },
        admin: {
            href: "./admin.html",
            icon: "fa-screwdriver-wrench",
            label: "Admin"
        }
    };
    const sidebarPageMap = {
        "index.html": "home",
        "timer.html": "timer",
        "user.html": "user",
        "notations.html": "notations",
        "beginner.html": "beginner",
        "cfop.html": "cfop",
        "admin.html": "admin",
        "admin-users.html": "admin"
    };

    const courseConfigs = {
        cfop: {
            title: "CFOP",
            stages: [
                { value: "cross", label: "Cross" },
                { value: "f2l", label: "F2L" },
                { value: "oll", label: "OLL" },
                { value: "pll", label: "PLL" }
            ]
        },
        beginner: {
            title: "Beginner",
            stages: [
                { value: "cross", label: "Dấu cộng" },
                { value: "layer1", label: "Tầng 1" },
                { value: "layer2", label: "Tầng 2" },
                { value: "yellow-cross", label: "Dấu cộng vàng" },
                { value: "yellow-face", label: "Mặt vàng" },
                { value: "finish", label: "Hoàn thành" }
            ]
        }
    };

    function getCourseConfig(course) {
        return courseConfigs[course] || courseConfigs.cfop;
    }

    function getStageLabel(course, stage) {
        const option = getCourseConfig(course).stages.find((item) => item.value === stage);
        return option?.label || stage || "";
    }

    function getMediaUrl(url) {
        if (!url) {
            return "";
        }

        if (/^https?:\/\//i.test(url)) {
            return url;
        }

        if (url.startsWith("/uploads/")) {
            return `${API_ORIGIN}${url}`;
        }

        return url;
    }

    function setStatus(element, text, type = "", { hideWhenEmpty = true } = {}) {
        if (!element) {
            return;
        }

        element.hidden = hideWhenEmpty && !text;
        element.textContent = text || "";
        element.classList.remove("is-error", "is-success");

        if (type) {
            element.classList.add(type === "error" ? "is-error" : "is-success");
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function replaceOptions(select, options, includeAllLabel) {
        const currentValue = select.value;
        select.replaceChildren();

        if (includeAllLabel) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = includeAllLabel;
            select.append(option);
        }

        options.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.label;
            select.append(option);
        });

        if ([...select.options].some((option) => option.value === currentValue)) {
            select.value = currentValue;
        }
    }

    function getCurrentPageName() {
        const pathName = window.location.pathname || "";
        const fileName = pathName.split("/").pop();
        return (fileName || "index.html").toLowerCase();
    }

    function renderSidebar() {
        const sidebarMenu = document.querySelector("#sidebar .sidebar-menu");

        if (!sidebarMenu) {
            return;
        }

        const currentPageName = getCurrentPageName();
        const currentPage = sidebarPageMap[currentPageName];

        if (!currentPage) {
            return;
        }

        const itemOrder = ["home"];

        if (!["home", "timer", "user"].includes(currentPage)) {
            itemOrder.push(currentPage);
        }

        itemOrder.push("timer", "user");

        sidebarMenu.innerHTML = itemOrder
            .map((itemKey) => {
                const item = sidebarItems[itemKey];
                const activeClass = itemKey === currentPage ? " sidebar-item--active" : "";
                const currentAttribute = itemKey === currentPage ? ' aria-current="page"' : "";

                return `
                    <a class="sidebar-item${activeClass}" href="${item.href}"${currentAttribute}>
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            })
            .join("");
    }

    renderSidebar();

    window.CubeALShared = {
        API_BASE_URL,
        API_ORIGIN,
        courseConfigs,
        escapeHtml,
        getCourseConfig,
        getMediaUrl,
        getStageLabel,
        renderSidebar,
        replaceOptions,
        setStatus
    };
})();

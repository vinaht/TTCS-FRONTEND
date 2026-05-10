(function () {
    const API_BASE_URL = window.CUBEAL_API_BASE_URL || "http://localhost:5000/api";
    const API_ORIGIN = new URL(API_BASE_URL, window.location.href).origin;

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

    window.CubeALShared = {
        API_BASE_URL,
        API_ORIGIN,
        courseConfigs,
        escapeHtml,
        getCourseConfig,
        getMediaUrl,
        getStageLabel,
        replaceOptions,
        setStatus
    };
})();

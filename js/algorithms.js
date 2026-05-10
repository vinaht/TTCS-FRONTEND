(function () {
    const shared = window.CubeALShared;
    const API_BASE_URL = shared.API_BASE_URL;
    const getMediaUrl = shared.getMediaUrl;

    const course = document.body.dataset.course || "cfop";
    const config = shared.getCourseConfig(course);
    const PAGE_LIMIT = 100;
    const state = {
        activeStage: "",
        items: [],
        filteredItems: []
    };

    const elements = {
        searchForm: document.getElementById("course-search-form"),
        search: document.getElementById("course-search"),
        tabs: document.getElementById("course-tabs"),
        stageKicker: document.getElementById("stage-kicker"),
        stageTitle: document.getElementById("stage-title"),
        stageCount: document.getElementById("stage-count"),
        mediaCount: document.getElementById("media-count"),
        filter: document.getElementById("course-filter"),
        categoryFilter: document.getElementById("category-filter"),
        difficultyFilter: document.getElementById("difficulty-filter"),
        mediaFilter: document.getElementById("media-filter"),
        clearFilters: document.getElementById("filter-clear"),
        status: document.getElementById("course-status"),
        grid: document.getElementById("algorithm-grid"),
        modal: document.getElementById("algorithm-modal"),
        detailMedia: document.getElementById("detail-media"),
        detailKicker: document.getElementById("detail-kicker"),
        detailTitle: document.getElementById("detail-title"),
        detailMeta: document.getElementById("detail-meta"),
        detailFormula: document.getElementById("detail-formula"),
        detailDescription: document.getElementById("detail-description"),
        detailVideo: document.getElementById("detail-video")
    };

    function setStatus(text, type) {
        shared.setStatus(elements.status, text, type, { hideWhenEmpty: false });
    }

    function getStageLabel(stage) {
        return shared.getStageLabel(course, stage);
    }

    function getVideoSeconds(value) {
        const seconds = Number(value);

        if (!Number.isFinite(seconds) || seconds < 0) {
            return null;
        }

        return Math.floor(seconds);
    }

    function getYouTubeEmbedUrl(url, { startSeconds, endSeconds } = {}) {
        if (!url) {
            return "";
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(url);
        } catch (error) {
            return "";
        }

        const host = parsedUrl.hostname.replace(/^www\./, "");
        let videoId = "";

        if (host === "youtu.be") {
            videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
        } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
            if (parsedUrl.pathname.startsWith("/embed/")) {
                videoId = parsedUrl.pathname.split("/").filter(Boolean)[1] || "";
            } else if (parsedUrl.pathname.startsWith("/shorts/")) {
                videoId = parsedUrl.pathname.split("/").filter(Boolean)[1] || "";
            } else {
                videoId = parsedUrl.searchParams.get("v") || "";
            }
        }

        if (!videoId) {
            return "";
        }

        const embedUrl = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
        const start = getVideoSeconds(startSeconds);
        const end = getVideoSeconds(endSeconds);

        if (start !== null) {
            embedUrl.searchParams.set("start", String(start));
        }

        if (end !== null) {
            embedUrl.searchParams.set("end", String(end));
        }

        return embedUrl.toString();
    }

    function isDirectVideo(url) {
        return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || "");
    }

    function hasMedia(item, mediaType) {
        if (mediaType === "image") {
            return Boolean(item.imageUrl);
        }

        if (mediaType === "video") {
            return Boolean(item.videoUrl);
        }

        if (mediaType === "both") {
            return Boolean(item.imageUrl && item.videoUrl);
        }

        return true;
    }

    function matchesSearch(item, searchValue) {
        if (!searchValue) {
            return true;
        }

        const searchable = [
            item.name,
            item.category,
            item.caseCode,
            item.formula,
            item.description,
            item.difficulty
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchable.includes(searchValue);
    }

    function createMeta(values) {
        const meta = document.createElement("div");
        meta.className = "course-meta";

        values.filter(Boolean).forEach((value) => {
            const pill = document.createElement("span");
            pill.textContent = value;
            meta.append(pill);
        });

        return meta;
    }

    function createEmptyMedia(className = "course-media") {
        const media = document.createElement("div");
        media.className = `${className} is-empty`;
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-image";
        media.append(icon);
        return media;
    }

    function createImageMedia(item, className = "course-media") {
        if (!item.imageUrl) {
            return createEmptyMedia(className);
        }

        const media = document.createElement("div");
        media.className = className;
        const image = document.createElement("img");
        image.src = getMediaUrl(item.imageUrl);
        image.alt = item.name || "Ảnh công thức";
        image.loading = "lazy";
        media.append(image);
        return media;
    }

    function appendVideo(container, videoUrl, { compact = false, startSeconds, endSeconds } = {}) {
        if (!videoUrl) {
            return;
        }

        const embedUrl = getYouTubeEmbedUrl(videoUrl, { startSeconds, endSeconds });

        if (embedUrl) {
            const frameWrap = document.createElement("div");
            frameWrap.className = compact ? "video-frame is-compact" : "video-frame";
            const iframe = document.createElement("iframe");
            iframe.src = embedUrl;
            iframe.title = "Video công thức";
            iframe.loading = "lazy";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            frameWrap.append(iframe);
            container.append(frameWrap);
            return;
        }

        if (isDirectVideo(videoUrl)) {
            const frameWrap = document.createElement("div");
            frameWrap.className = compact ? "video-frame is-compact" : "video-frame";
            const video = document.createElement("video");
            const start = getVideoSeconds(startSeconds);
            const end = getVideoSeconds(endSeconds);

            video.src = getMediaUrl(videoUrl);
            video.controls = true;
            video.preload = "metadata";

            if (start !== null) {
                video.addEventListener("loadedmetadata", () => {
                    try {
                        video.currentTime = start;
                    } catch (error) {
                        // Some remote video hosts disallow seeking before metadata ranges are ready.
                    }
                });
            }

            if (end !== null) {
                video.addEventListener("timeupdate", () => {
                    if (video.currentTime >= end) {
                        video.pause();
                        video.currentTime = end;
                    }
                });
            }

            frameWrap.append(video);
            container.append(frameWrap);
            return;
        }

        const linkWrap = document.createElement("p");
        linkWrap.className = "video-link";
        const link = document.createElement("a");
        link.href = videoUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.innerHTML = '<i class="fa-solid fa-circle-play"></i> Mở video';
        linkWrap.append(link);
        container.append(linkWrap);
    }

    function updateStats() {
        elements.stageCount.textContent = String(state.filteredItems.length);
        elements.mediaCount.textContent = String(
            state.filteredItems.filter((item) => item.imageUrl || item.videoUrl).length
        );
    }

    function replaceCategoryOptions() {
        const previousValue = elements.categoryFilter.value;
        const categories = [...new Set(state.items.map((item) => item.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));

        elements.categoryFilter.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "Tất cả";
        elements.categoryFilter.append(allOption);

        categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            elements.categoryFilter.append(option);
        });

        if (categories.includes(previousValue)) {
            elements.categoryFilter.value = previousValue;
        }
    }

    function getFilteredItems() {
        const searchValue = elements.search.value.trim().toLowerCase();
        const category = elements.categoryFilter.value;
        const difficulty = elements.difficultyFilter.value;
        const mediaType = elements.mediaFilter.value;

        return state.items.filter((item) => {
            if (category && item.category !== category) {
                return false;
            }

            if (difficulty && item.difficulty !== difficulty) {
                return false;
            }

            return hasMedia(item, mediaType) && matchesSearch(item, searchValue);
        });
    }

    function renderAlgorithms() {
        state.filteredItems = getFilteredItems();
        elements.grid.replaceChildren();
        updateStats();

        if (!state.items.length) {
            setStatus(`Chưa có công thức cho ${getStageLabel(state.activeStage)}.`);
            return;
        }

        if (!state.filteredItems.length) {
            setStatus("Không có công thức phù hợp với bộ lọc hiện tại.");
            return;
        }

        setStatus("");
        const fragment = document.createDocumentFragment();

        state.filteredItems.forEach((algorithm) => {
            const card = document.createElement("article");
            card.className = "course-card";
            card.append(createImageMedia(algorithm));

            const body = document.createElement("div");
            body.className = "course-card-body";

            const head = document.createElement("div");
            head.className = "course-card-head";

            const title = document.createElement("h3");
            title.textContent = algorithm.name;
            head.append(title);

            if (algorithm.videoUrl) {
                const videoBadge = document.createElement("span");
                videoBadge.className = "media-badge";
                videoBadge.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
                head.append(videoBadge);
            }

            body.append(head);
            body.append(createMeta([algorithm.category, algorithm.caseCode, algorithm.difficulty]));

            const formula = document.createElement("p");
            formula.className = "course-formula";
            formula.textContent = algorithm.formula;
            body.append(formula);

            if (algorithm.description) {
                const description = document.createElement("p");
                description.className = "course-description";
                description.textContent = algorithm.description;
                body.append(description);
            }

            const detailButton = document.createElement("button");
            detailButton.className = "detail-action";
            detailButton.type = "button";
            detailButton.dataset.detailAlgorithm = String(algorithm.id);
            detailButton.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> Xem chi tiết';
            body.append(detailButton);

            card.append(body);
            fragment.append(card);
        });

        elements.grid.append(fragment);
    }

    async function fetchAlgorithmPage(params) {
        const response = await fetch(`${API_BASE_URL}/algorithms?${params.toString()}`, {
            headers: {
                Accept: "application/json"
            }
        });
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload?.message || "Không thể tải công thức.");
        }

        return payload.data || {};
    }

    async function fetchAllAlgorithms(baseParams) {
        const items = [];
        let page = 1;
        let totalPages = 1;

        do {
            const params = new URLSearchParams(baseParams);
            params.set("page", String(page));
            params.set("limit", String(PAGE_LIMIT));

            const data = await fetchAlgorithmPage(params);
            const pageItems = data.items || [];
            items.push(...pageItems);
            totalPages = data.pagination?.totalPages ?? (pageItems.length < PAGE_LIMIT ? page : page + 1);
            page += 1;
        } while (page <= totalPages);

        return items;
    }

    async function loadStage(stage) {
        state.activeStage = stage;
        const params = new URLSearchParams({
            course,
            stage
        });

        elements.stageKicker.textContent = config.title;
        elements.stageTitle.textContent = getStageLabel(stage);
        setStatus("Đang tải công thức...");
        elements.grid.replaceChildren();

        try {
            state.items = await fetchAllAlgorithms(params);
            replaceCategoryOptions();
            renderAlgorithms();
        } catch (error) {
            state.items = [];
            state.filteredItems = [];
            updateStats();
            setStatus(error.message || "Không thể tải công thức.", "error");
            elements.grid.replaceChildren();
        }
    }

    function setActiveStage(stage) {
        document.querySelectorAll("[data-stage]").forEach((button) => {
            const isActive = button.dataset.stage === stage;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });
    }

    function renderTabs() {
        const fragment = document.createDocumentFragment();

        config.stages.forEach((stage) => {
            const button = document.createElement("button");
            button.className = "course-tab";
            button.type = "button";
            button.dataset.stage = stage.value;
            button.setAttribute("role", "tab");
            button.textContent = stage.label;
            fragment.append(button);
        });

        elements.tabs.append(fragment);
    }

    function getInitialStage() {
        const hashStage = window.location.hash.replace("#", "");
        const hasStage = config.stages.some((stage) => stage.value === hashStage);

        if (hasStage) {
            return hashStage;
        }

        return config.stages[0].value;
    }

    function clearFilterValues() {
        elements.search.value = "";
        elements.categoryFilter.value = "";
        elements.difficultyFilter.value = "";
        elements.mediaFilter.value = "";
    }

    function resetFilters() {
        clearFilterValues();
        renderAlgorithms();
    }

    function openDetail(algorithmId) {
        const algorithm = state.filteredItems.find((item) => String(item.id) === String(algorithmId));

        if (!algorithm) {
            return;
        }

        elements.detailMedia.replaceChildren(createImageMedia(algorithm, "detail-image"));
        elements.detailKicker.textContent = `${config.title} / ${getStageLabel(algorithm.stage)}`;
        elements.detailTitle.textContent = algorithm.name;
        elements.detailMeta.replaceChildren(
            ...createMeta([algorithm.category, algorithm.caseCode, algorithm.difficulty]).childNodes
        );
        elements.detailFormula.textContent = algorithm.formula;
        elements.detailDescription.textContent = algorithm.description || "";
        elements.detailDescription.hidden = !algorithm.description;
        elements.detailVideo.replaceChildren();
        appendVideo(elements.detailVideo, algorithm.videoUrl, {
            startSeconds: algorithm.videoStartSeconds,
            endSeconds: algorithm.videoEndSeconds
        });
        elements.modal.hidden = false;
        document.body.classList.add("has-course-modal");
    }

    function closeDetail() {
        elements.modal.hidden = true;
        elements.detailVideo.replaceChildren();
        document.body.classList.remove("has-course-modal");
    }

    function bindEvents() {
        elements.tabs.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-stage]");

            if (!button) {
                return;
            }

            const stage = button.dataset.stage;
            window.location.hash = stage;
            setActiveStage(stage);
            clearFilterValues();
            await loadStage(stage);
        });

        elements.searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
            renderAlgorithms();
        });

        elements.search.addEventListener("input", renderAlgorithms);
        elements.filter.addEventListener("change", renderAlgorithms);
        elements.filter.addEventListener("submit", (event) => {
            event.preventDefault();
            renderAlgorithms();
        });
        elements.clearFilters.addEventListener("click", resetFilters);

        elements.grid.addEventListener("click", (event) => {
            const detailButton = event.target.closest("[data-detail-algorithm]");

            if (detailButton) {
                openDetail(detailButton.dataset.detailAlgorithm);
            }
        });

        elements.modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-detail]")) {
                closeDetail();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !elements.modal.hidden) {
                closeDetail();
            }
        });
    }

    async function init() {
        renderTabs();
        bindEvents();
        const stage = getInitialStage();
        setActiveStage(stage);
        await loadStage(stage);
    }

    init();
})();

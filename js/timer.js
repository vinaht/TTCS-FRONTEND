(function () {
    const auth = window.CubeALAuth || null;
    const shared = window.CubeALShared;

    const SCRAMBLE_LENGTH = 20;
    const READY_COLOR = "#2ecc71";
    const GUEST_BEST_STORAGE_KEY = "cubeBestTime";
    const GUEST_TIMES_STORAGE_KEY = "cubeTimes";

    const elements = {
        scramble: document.getElementById("scramble"),
        timer: document.getElementById("timer"),
        bestTimeValue: document.getElementById("bestTimeValue"),
        avg5: document.getElementById("avg5"),
        avg12: document.getElementById("avg12"),
        syncStatus: document.getElementById("timer-sync"),
        startStopButton: document.getElementById("startstop"),
        resetButton: document.getElementById("reset")
    };

    const state = {
        startTime: 0,
        frameRequestId: null,
        running: false,
        readyToStart: false,
        currentScramble: "",
        localTimes: [],
        sessionTimes: [],
        sessionStatsActive: false
    };

    function generateScramble(length = SCRAMBLE_LENGTH) {
        const faces = ["U", "D", "L", "R", "F", "B"];
        const modifiers = ["", "'", "2"];
        const scramble = [];
        let lastFace = "";

        for (let index = 0; index < length; index += 1) {
            let currentFace;

            do {
                currentFace = faces[Math.floor(Math.random() * faces.length)];
            } while (currentFace === lastFace);

            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            scramble.push(currentFace + modifier);
            lastFace = currentFace;
        }

        return scramble.join(" ");
    }

    function formatTime(seconds) {
        return `${seconds.toFixed(2)}s`;
    }

    function setScramble(scramble) {
        state.currentScramble = scramble;
        elements.scramble.textContent = scramble;
    }

    function setTimerDisplay(timeSeconds) {
        elements.timer.textContent = formatTime(timeSeconds);
    }

    function setBestTime(bestTimeSeconds) {
        elements.bestTimeValue.textContent =
            bestTimeSeconds === null ? "N/A" : formatTime(bestTimeSeconds);
    }

    function setAverageDisplay(element, value) {
        element.textContent = value === null ? "N/A" : formatTime(value);
    }

    function renderStatsFromTimes(times) {
        const values = Array.isArray(times) ? times : [];
        const bestTime = values.length > 0 ? Math.min(...values) : null;
        const avg5 = values.length >= 5 ? calculateAverage(values.slice(-5)) : null;
        const avg12 = values.length >= 12 ? calculateAverage(values.slice(-12)) : null;

        setBestTime(bestTime);
        setAverageDisplay(elements.avg5, avg5);
        setAverageDisplay(elements.avg12, avg12);
    }

    function resetDisplayedStats() {
        renderStatsFromTimes([]);
    }

    function setSyncMessage(message, isError = false) {
        shared.setStatus(elements.syncStatus, message, isError ? "error" : "");
    }

    function loadGuestTimes() {
        try {
            const rawValue = localStorage.getItem(GUEST_TIMES_STORAGE_KEY);

            if (!rawValue) {
                return [];
            }

            const parsedValue = JSON.parse(rawValue);

            if (!Array.isArray(parsedValue)) {
                return [];
            }

            return parsedValue
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0);
        } catch (error) {
            return [];
        }
    }

    function saveGuestTimes() {
        localStorage.setItem(GUEST_TIMES_STORAGE_KEY, JSON.stringify(state.localTimes));
    }

    function calculateAverage(values) {
        if (!Array.isArray(values) || values.length < 3) {
            return null;
        }

        const sortedValues = [...values].sort((left, right) => left - right);
        const trimmedValues = sortedValues.slice(1, sortedValues.length - 1);
        const sum = trimmedValues.reduce((total, value) => total + value, 0);

        return sum / trimmedValues.length;
    }

    function updateGuestStats() {
        renderStatsFromTimes(state.localTimes);
        const bestTime = state.localTimes.length > 0 ? Math.min(...state.localTimes) : null;

        if (bestTime === null) {
            localStorage.removeItem(GUEST_BEST_STORAGE_KEY);
            return;
        }

        localStorage.setItem(GUEST_BEST_STORAGE_KEY, String(bestTime));
    }

    function loadGuestStats({ showSyncMessage = true } = {}) {
        state.localTimes = loadGuestTimes();
        updateGuestStats();
        if (showSyncMessage) {
            setSyncMessage("Đang ở chế độ khách. Kết quả sẽ lưu trên trình duyệt này.");
        }
    }

    async function loadRemoteStats() {
        if (!auth || !auth.isAuthenticated()) {
            loadGuestStats();
            return;
        }

        try {
            const response = await auth.apiFetch("/stats");
            const stats = response.data;

            setBestTime(stats.bestTimeSeconds);
            setAverageDisplay(elements.avg5, stats.ao5Seconds);
            setAverageDisplay(elements.avg12, stats.ao12Seconds);
            setSyncMessage("");
        } catch (error) {
            loadGuestStats({ showSyncMessage: false });
            setSyncMessage("Không thể tải thống kê tài khoản. Đang dùng chế độ local tạm thời.", true);
        }
    }

    async function saveSolveToServer(durationMs) {
        return auth.apiFetch("/solves", {
            method: "POST",
            body: {
                durationMs,
                scramble: state.currentScramble
            }
        });
    }

    async function handleFinishedSolve(timeSeconds) {
        setTimerDisplay(timeSeconds);

        if (auth && auth.isAuthenticated()) {
            try {
                await saveSolveToServer(Math.round(timeSeconds * 1000));
                if (state.sessionStatsActive) {
                    state.sessionTimes.push(timeSeconds);
                    renderStatsFromTimes(state.sessionTimes);
                } else {
                    await loadRemoteStats();
                }
            } catch (error) {
                setSyncMessage("Lưu solve lên server thất bại. Kết quả đã được giữ local.", true);
                if (state.sessionStatsActive) {
                    state.sessionTimes.push(timeSeconds);
                    renderStatsFromTimes(state.sessionTimes);
                }

                state.localTimes.push(timeSeconds);
                saveGuestTimes();

                if (!state.sessionStatsActive) {
                    updateGuestStats();
                }
            }
        } else {
            state.localTimes.push(timeSeconds);
            saveGuestTimes();
            updateGuestStats();
        }

        setScramble(generateScramble());
    }

    function cancelTimerFrame() {
        if (state.frameRequestId) {
            cancelAnimationFrame(state.frameRequestId);
            state.frameRequestId = null;
        }
    }

    function updateTimer() {
        if (!state.running) {
            return;
        }

        const currentTimeSeconds = (performance.now() - state.startTime) / 1000;
        setTimerDisplay(currentTimeSeconds);
        state.frameRequestId = requestAnimationFrame(updateTimer);
    }

    function startTimer() {
        if (state.running) {
            return;
        }

        state.startTime = performance.now();
        state.running = true;
        state.frameRequestId = requestAnimationFrame(updateTimer);
    }

    async function stopTimer() {
        if (!state.running) {
            return;
        }

        const endTime = performance.now();
        const timeSeconds = (endTime - state.startTime) / 1000;

        state.running = false;
        cancelTimerFrame();
        await handleFinishedSolve(timeSeconds);
    }

    function resetGuestStats() {
        state.localTimes = [];
        localStorage.removeItem(GUEST_BEST_STORAGE_KEY);
        localStorage.removeItem(GUEST_TIMES_STORAGE_KEY);
        updateGuestStats();
    }

    function resetTimer() {
        state.running = false;
        state.readyToStart = false;
        cancelTimerFrame();

        elements.timer.style.color = "";
        setTimerDisplay(0);
        setScramble(generateScramble());

        if (auth && auth.isAuthenticated()) {
            state.sessionStatsActive = true;
            state.sessionTimes = [];
            resetDisplayedStats();
            setSyncMessage("");
            return;
        }

        state.sessionStatsActive = false;
        setSyncMessage("");
        resetGuestStats();
    }

    function bindEvents() {
        elements.startStopButton.addEventListener("click", async () => {
            if (state.running) {
                await stopTimer();
                return;
            }

            startTimer();
        });

        document.addEventListener("keydown", async (event) => {
            if (event.key !== " " || event.repeat) {
                return;
            }

            event.preventDefault();

            if (state.running) {
                await stopTimer();
                state.readyToStart = false;
                return;
            }

            state.readyToStart = true;
            elements.timer.style.color = READY_COLOR;
        });

        document.addEventListener("keyup", (event) => {
            if (event.key !== " ") {
                return;
            }

            event.preventDefault();

            if (!state.readyToStart) {
                return;
            }

            state.readyToStart = false;
            elements.timer.style.color = "";
            startTimer();
        });

        elements.resetButton.addEventListener("click", resetTimer);

        document.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.currentTarget.blur();
            });
        });

        document.addEventListener("cubeal:auth-changed", async () => {
            if (auth && auth.isAuthenticated()) {
                if (state.sessionStatsActive) {
                    renderStatsFromTimes(state.sessionTimes);
                    return;
                }

                await loadRemoteStats();
                return;
            }

            state.sessionStatsActive = false;
            state.sessionTimes = [];
            loadGuestStats();
        });
    }

    async function initializeTimerPage() {
        setScramble(generateScramble());
        setTimerDisplay(0);
        bindEvents();

        if (auth) {
            await auth.ready;
            await loadRemoteStats();
            return;
        }

        loadGuestStats();
    }

    initializeTimerPage();
})();

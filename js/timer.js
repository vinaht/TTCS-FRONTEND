let startTime;
let endTime;
let running = false;
let isReadyToStart = false;
let frameRequestId;
let currentScramble = "";
let localTimes = [];

const guestBestStorageKey = "cubeBestTime";
const guestTimesStorageKey = "cubeTimes";

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

const auth = window.CubeALAuth || null;

function generateScramble(length = 20) {
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

function setScramble(scramble) {
    currentScramble = scramble;
    elements.scramble.innerText = scramble;
}

function setTimerDisplay(timeSeconds) {
    elements.timer.innerText = `${timeSeconds.toFixed(2)}s`;
}

function setBestTime(bestTimeSeconds) {
    elements.bestTimeValue.innerText =
        bestTimeSeconds === null ? "N/A" : `${bestTimeSeconds.toFixed(2)}s`;
}

function setAverageDisplay(element, value) {
    element.innerText = value === null ? "N/A" : `${value.toFixed(2)}s`;
}

function setSyncMessage(message, isError = false) {
    elements.syncStatus.innerText = message;
    elements.syncStatus.classList.toggle("is-error", isError);
}

function loadGuestTimes() {
    try {
        const rawValue = localStorage.getItem(guestTimesStorageKey);
        if (!rawValue) return [];
        const parsedValue = JSON.parse(rawValue);
        if (!Array.isArray(parsedValue)) return [];
        return parsedValue
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);
    } catch (error) {
        return [];
    }
}

function saveGuestTimes() {
    localStorage.setItem(guestTimesStorageKey, JSON.stringify(localTimes));
}

function calculateAverage(values) {
    if (!Array.isArray(values) || values.length < 3) return null;
    const sortedValues = [...values].sort((left, right) => left - right);
    const trimmedValues = sortedValues.slice(1, sortedValues.length - 1);
    const sum = trimmedValues.reduce((total, value) => total + value, 0);
    return sum / trimmedValues.length;
}

function updateGuestStats() {
    const bestTime = localTimes.length > 0 ? Math.min(...localTimes) : null;
    const avg5 = localTimes.length >= 5 ? calculateAverage(localTimes.slice(-5)) : null;
    const avg12 = localTimes.length >= 12 ? calculateAverage(localTimes.slice(-12)) : null;

    setBestTime(bestTime);
    setAverageDisplay(elements.avg5, avg5);
    setAverageDisplay(elements.avg12, avg12);

    if (bestTime === null) {
        localStorage.removeItem(guestBestStorageKey);
    } else {
        localStorage.setItem(guestBestStorageKey, String(bestTime));
    }
}

function loadGuestStats() {
    localTimes = loadGuestTimes();
    updateGuestStats();
    setSyncMessage("Dang o che do khach. Ket qua se luu tren trinh duyet nay.");
}

async function loadRemoteStats() {
    if (!auth || !auth.isAuthenticated()) {
        loadGuestStats();
        return;
    }
    const user = auth.getCurrentUser();
    try {
        const response = await auth.apiFetch("/stats");
        const stats = response.data;
        setBestTime(stats.bestTimeSeconds);
        setAverageDisplay(elements.avg5, stats.ao5Seconds);
        setAverageDisplay(elements.avg12, stats.ao12Seconds);
        setSyncMessage(`Dang dong bo solve cho ${user.username}.`);
    } catch (error) {
        setSyncMessage("Khong the tai thong ke tai khoan. Dang dung che do local tam thoi.", true);
        loadGuestStats();
    }
}

async function saveSolveToServer(durationMs) {
    return auth.apiFetch("/solves", {
        method: "POST",
        body: { durationMs, scramble: currentScramble }
    });
}

async function handleFinishedSolve(timeSeconds) {
    setTimerDisplay(timeSeconds);
    if (auth && auth.isAuthenticated()) {
        setSyncMessage("Dang luu solve vao tai khoan...");
        try {
            await saveSolveToServer(Math.round(timeSeconds * 1000));
            await loadRemoteStats();
        } catch (error) {
            setSyncMessage("Luu solve len server that bai. Ket qua da duoc giu local.", true);
            localTimes.push(timeSeconds);
            saveGuestTimes();
            updateGuestStats();
        }
    } else {
        localTimes.push(timeSeconds);
        saveGuestTimes();
        updateGuestStats();
    }
    setScramble(generateScramble());
}

function updateTimer() {
    if (!running) return;
    const currentTimeSeconds = (performance.now() - startTime) / 1000;
    setTimerDisplay(currentTimeSeconds);
    frameRequestId = requestAnimationFrame(updateTimer);
}

function startTimer() {
    if (running) return;
    startTime = performance.now();
    running = true;
    frameRequestId = requestAnimationFrame(updateTimer);
}

async function stopTimer() {
    if (!running) return;
    endTime = performance.now();
    running = false;
    const timeSeconds = (endTime - startTime) / 1000;
    if (frameRequestId) cancelAnimationFrame(frameRequestId);
    await handleFinishedSolve(timeSeconds);
}

function resetTimer() {
    running = false;
    isReadyToStart = false;
    if (frameRequestId) cancelAnimationFrame(frameRequestId);
    elements.timer.style.color = "";
    setTimerDisplay(0);
    setScramble(generateScramble());
    if (auth && auth.isAuthenticated()) {
        loadRemoteStats();
        return;
    }
    localTimes = [];
    localStorage.removeItem(guestBestStorageKey);
    localStorage.removeItem(guestTimesStorageKey);
    updateGuestStats();
}

function bindEvents() {
    elements.startStopButton.addEventListener("click", async () => {
        if (running) {
            await stopTimer();
        } else {
            startTimer();
        }
    });

    document.addEventListener("keydown", async (event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        if (event.repeat) return;

        if (running) {
            await stopTimer();
            isReadyToStart = false;
        } else {
            isReadyToStart = true;
            elements.timer.style.color = "#2ecc71";
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.key !== " ") return;
        event.preventDefault();

        if (isReadyToStart) {
            isReadyToStart = false;
            elements.timer.style.color = "";
            startTimer();
        }
    });

    elements.resetButton.addEventListener("click", resetTimer);

    document.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.target.blur();
        });
    });

    document.addEventListener("cubeal:auth-changed", async () => {
        if (auth && auth.isAuthenticated()) {
            await loadRemoteStats();
            return;
        }
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
const DEFAULT_LANGUAGE = "en-us";
const STORAGE_KEY = "benchmark.language";
const I18N_DIR = "assets/i18n";
const I18N_INDEX_URL = `${I18N_DIR}/index.json`;

const i18nState = {
    initialized: false,
    page: "index",
    languages: [],
    dictionaries: new Map(),
    activeLanguage: DEFAULT_LANGUAGE,
};

const languageListeners = new Set();

function appendTimestamp(url) {
    const ts = Date.now();
    return url.includes("?") ? `${url}&ts=${ts}` : `${url}?ts=${ts}`;
}

function normalizeLanguageCode(value) {
    return String(value ?? "").trim().toLowerCase();
}

function tryReadStorage(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function tryWriteStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures.
    }
}

function inferLanguageCodeFromFileName(fileName) {
    return normalizeLanguageCode(String(fileName ?? "").replace(/\.json$/i, ""));
}

function readKeyPath(source, keyPath) {
    const pathText = String(keyPath ?? "").trim();
    if (!pathText) {
        return undefined;
    }

    const pathParts = pathText.split(".");
    let current = source;

    for (const part of pathParts) {
        if (!current || typeof current !== "object" || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

function formatTemplate(text, params = {}) {
    const base = String(text ?? "");
    return base.replace(/\{(\w+)\}/g, (_match, key) => {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            return String(params[key]);
        }
        return `{${key}}`;
    });
}

function pickLanguageByCandidates(candidates) {
    const normalizedCandidates = candidates
        .map((value) => normalizeLanguageCode(value))
        .filter((value) => value.length > 0);

    const available = i18nState.languages.map((entry) => entry.code);
    if (!available.length) {
        return DEFAULT_LANGUAGE;
    }

    for (const candidate of normalizedCandidates) {
        if (available.includes(candidate)) {
            return candidate;
        }
    }

    for (const candidate of normalizedCandidates) {
        const base = candidate.split("-")[0];
        if (!base) {
            continue;
        }

        const exactBase = available.find((code) => code === base);
        if (exactBase) {
            return exactBase;
        }

        const prefixMatch = available.find((code) => code.startsWith(`${base}-`));
        if (prefixMatch) {
            return prefixMatch;
        }
    }

    return available.includes(DEFAULT_LANGUAGE)
        ? DEFAULT_LANGUAGE
        : available[0];
}

async function tryDiscoverFilesFromIndex() {
    const response = await fetch(appendTimestamp(I18N_INDEX_URL), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`i18n index request failed (${response.status})`);
    }

    const payload = await response.json();
    const files = [];

    if (Array.isArray(payload?.files)) {
        for (const fileLike of payload.files) {
            if (typeof fileLike === "string") {
                const fileName = fileLike.trim();
                if (/\.json$/i.test(fileName)) {
                    files.push(fileName);
                }
            }
        }
    }

    if (Array.isArray(payload)) {
        for (const fileLike of payload) {
            if (typeof fileLike === "string" && /\.json$/i.test(fileLike.trim())) {
                files.push(fileLike.trim());
            }
        }
    }

    return [...new Set(files)];
}

async function tryDiscoverFilesFromDirectoryListing() {
    const response = await fetch(appendTimestamp(`${I18N_DIR}/`), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`i18n directory listing request failed (${response.status})`);
    }

    const text = await response.text();
    const pattern = /href\s*=\s*["']([^"']+?\.json(?:\?[^"']*)?)["']/gi;

    const files = [];
    for (const match of text.matchAll(pattern)) {
        const href = String(match[1] || "").trim();
        if (!href) {
            continue;
        }

        const withoutHash = href.split("#")[0];
        const withoutQuery = withoutHash.split("?")[0];
        const fileName = decodeURIComponent(withoutQuery).split("/").pop();
        if (fileName && /\.json$/i.test(fileName)) {
            files.push(fileName);
        }
    }

    return [...new Set(files)];
}

async function discoverLanguageFiles() {
    try {
        const fromIndex = await tryDiscoverFilesFromIndex();
        if (fromIndex.length) {
            return fromIndex;
        }
    } catch {
        // Fallback to directory listing.
    }

    try {
        const fromListing = await tryDiscoverFilesFromDirectoryListing();
        if (fromListing.length) {
            return fromListing;
        }
    } catch {
        // Fall through and rely on defaults.
    }

    return ["en-us.json"];
}

async function loadDictionaryFromFile(fileName) {
    const url = `${I18N_DIR}/${encodeURIComponent(fileName)}`;
    const response = await fetch(appendTimestamp(url), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`failed to load language file: ${fileName}`);
    }

    const payload = await response.json();
    const dictionary = payload && typeof payload.strings === "object"
        ? payload.strings
        : payload;

    const meta = payload && typeof payload.meta === "object" ? payload.meta : {};
    const code = normalizeLanguageCode(meta.code || inferLanguageCodeFromFileName(fileName));
    if (!code) {
        return null;
    }

    return {
        code,
        name: String(meta.name || code),
        fileName,
        dictionary: dictionary && typeof dictionary === "object" ? dictionary : {},
    };
}

async function loadAllDictionaries() {
    const files = await discoverLanguageFiles();
    const entries = [];

    for (const fileName of files) {
        try {
            const loaded = await loadDictionaryFromFile(fileName);
            if (loaded) {
                entries.push(loaded);
            }
        } catch {
            // Ignore broken language files to keep dashboard available.
        }
    }

    if (!entries.some((entry) => entry.code === DEFAULT_LANGUAGE)) {
        entries.push({
            code: DEFAULT_LANGUAGE,
            name: "English",
            fileName: "en-us.json",
            dictionary: {},
        });
    }

    const byCode = new Map();
    for (const entry of entries) {
        byCode.set(entry.code, entry);
    }

    const sorted = [...byCode.values()].sort((a, b) => {
        if (a.code === DEFAULT_LANGUAGE) {
            return -1;
        }
        if (b.code === DEFAULT_LANGUAGE) {
            return 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    i18nState.languages = sorted.map(({ code, name, fileName }) => ({ code, name, fileName }));
    i18nState.dictionaries.clear();
    for (const entry of sorted) {
        i18nState.dictionaries.set(entry.code, entry.dictionary);
    }
}

export function t(key, fallback = "", params = {}) {
    const normalizedKey = String(key ?? "").trim();

    const activeDict = i18nState.dictionaries.get(i18nState.activeLanguage) || {};
    const englishDict = i18nState.dictionaries.get(DEFAULT_LANGUAGE) || {};

    const activeValue = readKeyPath(activeDict, normalizedKey);
    const englishValue = readKeyPath(englishDict, normalizedKey);

    const picked = typeof activeValue === "string"
        ? activeValue
        : (typeof englishValue === "string" ? englishValue : fallback || normalizedKey);

    return formatTemplate(picked, params);
}

function applyTranslations(root = document) {
    const scope = root || document;

    const textNodes = scope.querySelectorAll("[data-i18n]");
    textNodes.forEach((node) => {
        const key = node.getAttribute("data-i18n");
        if (!key) {
            return;
        }
        node.textContent = t(key, node.textContent);
    });

    const htmlNodes = scope.querySelectorAll("[data-i18n-html]");
    htmlNodes.forEach((node) => {
        const key = node.getAttribute("data-i18n-html");
        if (!key) {
            return;
        }
        node.innerHTML = t(key, node.innerHTML);
    });

    const placeholderNodes = scope.querySelectorAll("[data-i18n-placeholder]");
    placeholderNodes.forEach((node) => {
        const key = node.getAttribute("data-i18n-placeholder");
        if (!key) {
            return;
        }
        node.setAttribute("placeholder", t(key, node.getAttribute("placeholder") || ""));
    });

    const titleNodes = scope.querySelectorAll("[data-i18n-title]");
    titleNodes.forEach((node) => {
        const key = node.getAttribute("data-i18n-title");
        if (!key) {
            return;
        }
        node.setAttribute("title", t(key, node.getAttribute("title") || ""));
    });

    const ariaNodes = scope.querySelectorAll("[data-i18n-aria-label]");
    ariaNodes.forEach((node) => {
        const key = node.getAttribute("data-i18n-aria-label");
        if (!key) {
            return;
        }
        node.setAttribute("aria-label", t(key, node.getAttribute("aria-label") || ""));
    });
}

function setDocumentTitleByPage() {
    const titleKey = i18nState.page === "help" ? "help.meta.title" : "index.meta.title";
    document.title = t(titleKey, document.title);
}

function notifyLanguageChanged() {
    applyTranslations(document);
    setDocumentTitleByPage();

    for (const listener of languageListeners) {
        try {
            listener(i18nState.activeLanguage);
        } catch {
            // Keep other listeners running.
        }
    }
}

function applyLanguage(code, options = {}) {
    const normalized = normalizeLanguageCode(code);
    const availableCodes = i18nState.languages.map((entry) => entry.code);
    const target = availableCodes.includes(normalized)
        ? normalized
        : pickLanguageByCandidates([normalized]);

    i18nState.activeLanguage = target;
    document.documentElement.lang = target;

    if (options.persist !== false) {
        tryWriteStorage(STORAGE_KEY, target);
    }

    if (options.notify !== false) {
        notifyLanguageChanged();
    }
}

function populateLanguageSelect(selectEl) {
    if (!selectEl) {
        return;
    }

    selectEl.innerHTML = "";
    for (const entry of i18nState.languages) {
        const option = document.createElement("option");
        option.value = entry.code;
        option.textContent = entry.name;
        selectEl.appendChild(option);
    }

    selectEl.value = i18nState.activeLanguage;
}

function setupLanguageSwitcher() {
    const button = document.getElementById("langFloatButton");
    const menu = document.getElementById("langMenu");
    const select = document.getElementById("langSelect");

    if (!button || !menu || !select) {
        return;
    }

    populateLanguageSelect(select);

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.classList.toggle("hidden");
    });

    select.addEventListener("change", () => {
        applyLanguage(select.value, { persist: true, notify: true });
        menu.classList.add("hidden");
    });

    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target || !(target instanceof Node)) {
            return;
        }
        if (!menu.contains(target) && !button.contains(target)) {
            menu.classList.add("hidden");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            menu.classList.add("hidden");
        }
    });
}

function resolveInitialLanguage() {
    const search = new URLSearchParams(window.location.search);
    const fromQuery = normalizeLanguageCode(search.get("lang"));
    const fromNavigator = Array.isArray(navigator.languages)
        ? navigator.languages
        : [navigator.language];
    const fromStorage = normalizeLanguageCode(tryReadStorage(STORAGE_KEY));

    const candidates = [fromQuery, ...fromNavigator, fromStorage, DEFAULT_LANGUAGE];
    return pickLanguageByCandidates(candidates);
}

export async function initI18n(options = {}) {
    const page = String(options.page || "index").trim().toLowerCase();
    i18nState.page = page === "help" ? "help" : "index";

    if (!i18nState.initialized) {
        await loadAllDictionaries();
        i18nState.initialized = true;
    }

    const initial = resolveInitialLanguage();
    applyLanguage(initial, { persist: true, notify: false });

    setupLanguageSwitcher();
    notifyLanguageChanged();
}

export function onLanguageChange(listener) {
    if (typeof listener !== "function") {
        return () => {};
    }

    languageListeners.add(listener);
    return () => {
        languageListeners.delete(listener);
    };
}

export function getActiveLanguage() {
    return i18nState.activeLanguage;
}

export function getAvailableLanguages() {
    return [...i18nState.languages];
}

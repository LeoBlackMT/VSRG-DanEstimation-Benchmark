import { initI18n } from "./i18n.js";

initI18n({ page: "help" }).catch((error) => {
    console.error("[help] i18n init failed:", error);
});

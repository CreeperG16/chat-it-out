import { config } from "dotenv";
config();

import path from "path";
import Store from "electron-store";
import { app, ipcMain } from "electron";
import { AppData } from "./types";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkStoredTokenValid({ store }: { store: Store<AppData> }) {
    const userData = store.get("userData");
    const currentTime = Math.floor(Date.now() / 1000);

    if (!userData) return false;
    return userData.expires_at > currentTime;
}

async function initApp({ store }: { store: Store<AppData> }) {
    // Check persistent storage for already logged in user
    const isTokenValid = checkStoredTokenValid({ store });

    if (!isTokenValid) {
        // TODO: refreshing stored token logic
        // Delete all stored data for now, effectively logging the user out
        console.warn("Existing token invalid or not found.");
        store.delete("userData");
        store.delete("userProfile");

        return { isLoggedIn: false };
    }

    const userData = store.get("userData")!;
}

function persistentStorage() {
    const store = new Store<AppData>();

    ipcMain.handle("store-get", (_ev, key) => store.get(key));
    ipcMain.handle("store-set", (_ev, key, val) => store.set(key, val));

    return store;
}

async function main() {
    const store = persistentStorage();
    await app.whenReady();
}

main();

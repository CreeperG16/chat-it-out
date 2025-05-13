import { BrowserWindow } from "electron";
import type Store from "electron-store";
import type { AppData } from "../../types";

import { fileURLToPath } from "url";
import path from "node:path";
import { getChannels, getMessages } from "../../lib/api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ipcEvents = {
    "get-channels": async ({ store }: { store: Store<AppData> }) => {
        const token = store.get("userData.access_token");
        if (!token) {
            console.error("Cannot fetch channels: Access token not found.");
            return { data: null, error: { message: "User not authenticated" } };
        }

        const { data: channels, error } = await getChannels(token);

        if (error) {
            console.error("Failed to fetch channels:", error);
            return { data: null, error };
        }

        return { data: channels, error: null };
    },
    "get-messages": async ({ store, channelId }: { store: Store<AppData>; channelId: string }) => {
        const token = store.get("userData.access_token");
        if (!token) {
            console.error("Cannot fetch messages: Access token not found.");
            return { data: null, error: { message: "User not authenticated" } };
        }

        const { data: messages, error } = await getMessages(channelId, token);

        if (error) {
            console.error("Failed to fetch messages:", error);
            return { data: null, error };
        }

        return { data: messages, error: null };
    },
};

interface ChatWindowParams {
    store: Store<AppData>;
    width: number;
    height: number;
}

export function chatWindow({ store, width = 800, height = 600 }: ChatWindowParams) {
    const lastWindowState = store.get("lastWindowState", { width, height });
    const window = new BrowserWindow({
        width: lastWindowState.width,
        height: lastWindowState.height,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    window.loadFile(path.join(__dirname, "index.html"));

    const emit = (eventName: string, ...args: any[]) => window.webContents.send("event:" + eventName, ...args);

    window.on("close", () => {
        const bounds = window.getBounds();
        store.set("lastWindowState", { width: bounds.width, height: bounds.height });
    });

    return {
        window,
        emit,
    };
}

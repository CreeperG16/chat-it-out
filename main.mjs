import { config } from "dotenv";
config();

import { deleteMessage, getChannels, getMessages, getProfiles, postMessage } from "./lib/api.mjs";
import { MessageSocket } from "./lib/socket.mjs";
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import Store from "electron-store";
import path from "path";
import { createAuthWindow } from "./windows/auth/main.mjs";
import { uploadHashedImage } from "./lib/storage.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
console.log("Store path:", store.path); // Useful for debugging

let messageSocket;
let profilesMap = new Map();
let mainWindow, loginWindow, chatWindow;

function createWindow(htmlPath, width = 800, height = 600) {
    const lastWindowState = store.get("lastWindowState", { width, height });

    const win = new BrowserWindow({
        width: lastWindowState.width,
        height: lastWindowState.height,
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.loadFile(htmlPath);

    win.on("close", () => {
        const bounds = win.getBounds();
        store.set("lastWindowState", { width: bounds.width, height: bounds.height });
    });
    return win;
}

function createMainWindow() {
    // The main window will initially load the local login trigger page.
    mainWindow = createWindow(path.join(__dirname, "windows/login/index.html"));
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// This function is for the local login trigger page, not used for external auth directly.
export function openLoginWindow() {
    if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.focus();
        return;
    }
    // This window will now just be a simple page to trigger the external login.
    loginWindow = createWindow(path.join(__dirname, "windows/login/index.html"), 400, 300);
    loginWindow.on("closed", () => {
        loginWindow = null;
    });
}

export function openChatWindow() {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.focus();
        return;
    }
    chatWindow = createWindow(path.join(__dirname, "windows/chat/index.html"), 1000, 700);
    chatWindow.on("closed", () => {
        chatWindow = null;
    });

    // Close the local login window if it's open
    if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
    }
    // If the main window was the local login page, close it.
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.getURL().includes("login/index.html")) {
        mainWindow.close();
    }
}

ipcMain.handle("get-store-value", async (_ev, key) => store.get(key));
ipcMain.handle("set-store-value", async (_ev, key, value) => store.set(key, value));

ipcMain.handle("get-channels", async () => {
    const userData = store.get("userData");
    if (userData && userData.access_token) {
        console.log("Fetching channels...");
        const { data: channels, error } = await getChannels(userData.access_token);
        if (error) {
            console.error("Failed to fetch channels:", error);
            return { data: null, error };
        }
        console.log("Channels fetched successfully.");
        return { data: channels, error: null };
    } else {
        console.error("Cannot fetch channels: User data or access token not found.");
        return { data: null, error: { message: "User not authenticated" } };
    }
});

ipcMain.handle("get-messages-for-channel", async (_ev, channelId) => {
    const userData = store.get("userData");

    if (!userData || !userData.access_token) {
        console.error("Cannot fetch messages: User data or access token not found.");
        return { data: null, error: { message: "User not authenticated" } };
    }

    if (!channelId) {
        console.error("Cannot fetch messages: Channel ID is missing.");
        return { data: null, error: { message: "Channel ID is required" } };
    }

    const { data: messages, error } = await getMessages(channelId, userData.access_token);

    if (error) {
        console.error(`Failed to fetch messages for channel ${channelId}:`, error);
        return { data: null, error };
    }

    return { data: messages, error: null };
});

ipcMain.handle("get-all-profiles", async () => {
    const userData = store.get("userData");

    if (!userData || !userData.access_token) {
        console.error("Cannot fetch profiles: User data or access token not found.");
        return { data: null, error: { message: "User not authenticated" } };
    }

    if (profilesMap.size > 0) {
        console.log("Returning cached profiles.");
        return { data: Array.from(profilesMap.values()), error: null };
    }

    console.log("Fetching all profiles...");
    const { data: profiles, error } = await getProfiles(userData.access_token);
    if (error) {
        console.error("Failed to fetch profiles:", error);
        return { data: null, error };
    }

    console.log("Profiles fetched successfully.");
    profilesMap = new Map(profiles.map((p) => [p.id, p]));
    return { data: profiles, error: null };
});

ipcMain.handle("send-chat-message", async (_event, channelId, messageContent, isImageContent, repliedId) => {
    const userData = store.get("userData");
    if (!userData || !userData.access_token || !userData.user || !userData.user.id) {
        console.error("Cannot send message: User data, access token, or user ID not found.");
        return { data: null, error: { message: "User not authenticated or user ID missing" } };
    }

    if (!channelId || !messageContent) {
        console.error("Cannot send message: Channel ID or message content is missing.");
        return { data: null, error: { message: "Channel ID and message content are required" } };
    }

    const userId = userData.user.id;
    const token = userData.access_token;

    console.log(
        `Main: Attempting to post message "${messageContent}" to channel ${channelId} by user ${userId}, isImage: ${isImageContent}`
    );
    const { data, error } = await postMessage(messageContent, userId, channelId, token, isImageContent, repliedId);

    if (error) {
        console.error("Main: Failed to post message:", error);
        return { data: null, error };
    }

    console.log("Main: Message posted successfully");
    return { data, error: null };
});

ipcMain.handle("delete-chat-message", async (_event, id) => {
    const userData = store.get("userData");
    if (!userData || !userData.access_token || !userData.user || !userData.user.id) {
        console.error("Cannot delete message: User data, access token, or user ID not found.");
        return { data: null, error: { message: "User not authenticated or user ID missing" } };
    }

    const { data, error } = await deleteMessage(id, userData.access_token);

    if (error) {
        console.error("Main: Failed to delete message:", error);
        return { data: null, error };
    }

    console.log("Main: Message deleted successfully");
    return { data, error: null };
});

// This is for the external login flow
ipcMain.handle("open-external-login", async () => {
    const userData = await createAuthWindow(mainWindow);
    if (!userData) {
        console.error("Problem occured during authentication - user data is null");
        return { success: false };
    }

    store.set("userData", userData);

    await initApp();
    openChatWindow();

    return { success: true };
});

// This can be used if other parts of the app need to trigger chat window opening,
// assuming auth is already handled.
ipcMain.handle("request-open-chat-window", () => {
    openChatWindow();
    return { success: true };
});

ipcMain.handle("join-chat-room", async (_event, roomId) => {
    if (messageSocket && roomId) {
        console.log(`Main: Joining room ${roomId}`);
        messageSocket.joinRoom(roomId);
        return { success: true };
    }
    console.error("Main: Could not join room. Socket or roomId missing.", { hasSocket: !!messageSocket, roomId });
    return { success: false, error: "Socket not initialized or roomId missing" };
});

ipcMain.handle("leave-chat-room", async (_event, roomId) => {
    if (messageSocket && roomId) {
        console.log(`Main: Leaving room ${roomId}`);
        messageSocket.leaveRoom(roomId);
        return { success: true };
    }
    console.error("Main: Could not leave room. Socket or roomId missing.");
    return { success: false, error: "Socket not initialized or roomId missing" };
});

// Modified to accept a single object with image details
ipcMain.handle("upload-image", async (_event, imageDetails) => {
    const accessToken = store.get("userData.access_token");
    if (!accessToken) {
        return { success: false, error: "User not authenticated" };
    }

    // The 'buffer' from renderer is an ArrayBuffer, convert to Node.js Buffer
    const nodeBuffer = Buffer.from(imageDetails.buffer);

    const { data: response, error } = await uploadHashedImage({
        fileBuffer: nodeBuffer, // Pass the Node.js Buffer
        mimeType: imageDetails.type, // Pass the MIME type from renderer
        accessToken,
        upsert: imageDetails.upsert !== undefined ? imageDetails.upsert : false, // Handle optional upsert
        // name: imageDetails.name // name is used for storagePath generation inside uploadHashedImage
    });

    if (error) {
        console.error("Main: Error uploading image:", error);
        return { success: false, error };
    }
    console.log("Main: Image uploaded successfully:", response);
    return { success: true, data: response }; // Changed to return 'data'
});

function checkStoredTokenValidity() {
    const userData = store.get("userData");
    const currentTime = Math.floor(Date.now() / 1000);

    if (!userData || !userData.access_token) return false;
    if (userData.expires_at > currentTime) return true;
}

function emitRendererEvent(window, eventName, ...args) {
    console.log("EVENT:", eventName, [...args]);
    return window.webContents.send("event:" + eventName, ...args);
}

async function initApp() {
    // Check if we already have user data and a valid token.
    const userData = store.get("userData");
    const isTokenValid = checkStoredTokenValidity();

    if (!isTokenValid) {
        console.log("Existing token has expired or is invalid.");

        // delete all user data, effectively logging them out
        store.delete("userData"); // Delete expired user data
        store.delete("currentUserProfile"); // Also delete profile
        if (messageSocket) {
            messageSocket.socket?.close(); // Clean up existing socket if any
            messageSocket = null;
        }
        return { isLoggedIn: false };
    }

    console.log("Token valid, proceeding with app initialization.");

    // Initialize MessageSocket if we have an access token
    if (userData && userData.access_token) {
        if (messageSocket) {
            // Close existing socket before creating a new one
            messageSocket.socket?.close();
        }
        messageSocket = new MessageSocket(userData.access_token);
        messageSocket.connect();
        messageSocket.onMessage = (message) => {
            // Forward to chat window if it exists
            if (chatWindow && !chatWindow.isDestroyed() && chatWindow.webContents) {
                // console.log("Main: Received message via socket, forwarding to chat window:", message);
                chatWindow.webContents.send("new-message", message);
            } else {
                console.log("Main: Received message via socket, but chat window not available:", message);
            }
        };

        messageSocket.on("message-create", (...args) => emitRendererEvent(chatWindow, "message-create", ...args));
        messageSocket.on("message-delete", (...args) => emitRendererEvent(chatWindow, "message-delete", ...args));

        console.log("Main: MessageSocket initialized and connected.");
    } else {
        console.error("Main: Could not initialize MessageSocket, user data or access token missing.");
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await getProfiles(userData.access_token);
    if (profilesError) {
        console.error("Failed to fetch initial profiles:", profilesError);
    }
    if (profiles) {
        profilesMap = new Map(profiles.map((p) => [p.id, p]));
        console.log("Initial profiles loaded and cached.");
    }

    // Store the current user's profile
    const currentUser = profilesMap.get(userData.user.id);
    if (!currentUser) {
        console.log("No profile data found for the current user.");
        store.delete("currentUserProfile");
    } else {
        console.log("User profile fetched for '%s'", currentUser.username);
        store.set("currentUserProfile", currentUser);
    }

    return { isLoggedIn: true };
}

app.whenReady().then(async () => {
    const { isLoggedIn } = await initApp();
    if (isLoggedIn) {
        openChatWindow();
        return;
    }

    // Prompt a login
    createMainWindow();
});

app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length > 0) return;
    const isTokenValid = checkStoredTokenValidity();

    if (isTokenValid) {
        // Reopen the chat window
        openChatWindow();
        return;
    }

    console.log("Existing token has expired or is invalid.");

    // delete all user data, effectively logging the user out
    store.delete("userData"); // Delete expired user data
    store.delete("currentUserProfile"); // Also delete profile

    // Prompt a login
    createMainWindow();

    return;
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

console.log("Main process (main.mjs) loaded.");

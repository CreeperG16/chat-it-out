// preload.mjs
const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script (preload.mjs) loaded.");

contextBridge.exposeInMainWorld("electronAPI", {
    // Store interaction
    getStoreValue: (key) => ipcRenderer.invoke("get-store-value", key),
    setStoreValue: (key, value) => ipcRenderer.invoke("set-store-value", key, value),

    // Window management
    openChatWindow: () => ipcRenderer.invoke("request-open-chat-window"), // Renamed in main.mjs
    openExternalLogin: () => ipcRenderer.invoke("open-external-login"), // Added for auth flow

    // User Profile
    getAllProfiles: () => ipcRenderer.invoke("get-all-profiles"), // Added for fetching all profiles
    onUserProfileUpdated: (callback) => ipcRenderer.on("user-profile-updated", (_event, value) => callback(value)),

    // Channels
    getChannels: () => ipcRenderer.invoke("get-channels"),

    // Messages
    getMessagesForChannel: (channelId) => ipcRenderer.invoke("get-messages-for-channel", channelId),
    sendChatMessage: (channelId, message) => ipcRenderer.invoke("send-chat-message", channelId, message),
    onNewMessage: (callback) => ipcRenderer.on("new-message", (_event, value) => callback(value)), // Added
    joinChatRoom: (roomId) => ipcRenderer.invoke("join-chat-room", roomId), // Added
    leaveChatRoom: (roomId) => ipcRenderer.invoke("leave-chat-room", roomId), // Added

    // Example: send a message to the main process
    // sendMessage: (channel, data) => ipcRenderer.send(channel, data),

    // Example: receive a message from the main process
    // onMessage: (channel, func) => {
    //   ipcRenderer.on(channel, (event, ...args) => func(...args));
    // },

    // Example: invoke a handler in the main process and get a response
    invokeHandler: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

    // According to your authflow.md, you might need to notify the main process
    // about successful login to close the login window and open the chat window.
    // This specific IPC call 'login-successful' might not be needed anymore with the new auth flow
    // as token detection and chat window opening is handled in main.mjs after external auth.
    // loginSuccessful: () => ipcRenderer.invoke('login-successful'),

    uploadImage: (data, upsert) =>
        ipcRenderer.invoke("upload-file", data, upsert),
});

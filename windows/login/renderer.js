// Renderer process for login window (windows/login/index.js)
console.log("Login window renderer script loaded.");

document.addEventListener("DOMContentLoaded", () => {
    const externalLoginButton = document.getElementById("externalLoginButton");

    if (externalLoginButton) {
        externalLoginButton.addEventListener("click", async () => {
            console.log("External login button clicked");
            try {
                // Call the main process to open the external authentication window
                const result = await window.electronAPI.openExternalLogin();
                console.log("openExternalLogin IPC call result:", result);
                // The main process will handle the rest of the auth flow (cookie detection, window closing, opening chat)
                // This window (the local login trigger) might be closed by the main process if auth is successful.
            } catch (error) {
                console.error("Error triggering external login:", error);
                // You could display an error message to the user here
            }
        });
    }

    // Example: If you have a login button with id "loginButton"
    const loginButton = document.getElementById("loginButton"); // This might be from an old setup
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            console.log("Local login button clicked (should this exist anymore?)");
            // Implement login logic here
            // For example, send credentials to the main process or an API
            // If login is successful, you might want to tell the main process to open the chat window
            // e.g., window.electronAPI.openChatWindow(); (if you set up a preload script with such an API)
        });
    }
});

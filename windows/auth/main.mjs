import { BrowserWindow } from "electron";

const ACCESS_TOKEN_COOKIE_NAME = "sb-wkuimailekpioxrlteqk-auth-token";
const LOGIN_URL = "https://www.chatitin.com/login";

function extractDataFromCookie(cookies) {
    const userDataCookie = cookies.find((cookie) => cookie.name === ACCESS_TOKEN_COOKIE_NAME);

    if (!userDataCookie) {
        console.log(
            `Cookie '${ACCESS_TOKEN_COOKIE_NAME}' not found after redirect to ${navigationUrl}. Cookies found:`,
            cookies.map((c) => c.name)
        );

        // Handle case where cookie is not found - maybe show an error or retry

        return;
    }

    const cookieValue = userDataCookie.value.startsWith("base64-")
        ? userDataCookie.value.slice(7)
        : userDataCookie.value;

    let userData;
    try {
        userData = JSON.parse(Buffer.from(cookieValue, "base64").toString());
    } catch (parseError) {
        console.error("Failed to parse user data from cookie:", parseError);
        return null;
    }

    return userData;
}

const handleNavigation = (webContents) =>
    new Promise((resolve) => {
        webContents.on("did-navigate-in-page", async (_ev, navigationUrl) => {
            console.log("Auth window navigated to:", navigationUrl);

            // Check if the navigation is a redirect from the login page (and not to the login page itself)
            // and is within the expected domain.
            const loginUrlHostname = new URL(LOGIN_URL).hostname;
            const navigationHostname = new URL(navigationUrl).hostname;

            if (navigationHostname !== loginUrlHostname) return;
            if (navigationUrl === LOGIN_URL) return;

            try {
                const cookies = await webContents.session.cookies.get({ domain: loginUrlHostname });
                const userData = extractDataFromCookie(cookies);

                resolve(userData);
            } catch (error) {
                console.error("Failed to get cookies or process auth redirect:", error);
                // Handle error - maybe show an error to the user
            }
        });
    });

export async function createAuthWindow(mainWindow) {
    const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    authWindow.loadURL(LOGIN_URL);
    const userData = await handleNavigation(authWindow.webContents);

    if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close(); // Close the auth window
    }

    return userData;
}

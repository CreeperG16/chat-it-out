// EXTREMELY JANK WAY of getting static data
// emotes' IDs and image filenames, for example, are hardcoded in an array
// This array is in two(?) JS files the website fetches
// so I can just fetch them myself LOL

// IDEA: loading screen splash texts are in the page-XXXX.js file

const ACCESS_TOKEN_COOKIE_NAME = "sb-wkuimailekpioxrlteqk-auth-token";
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"; // I mean it's not like they don't know im doing this LOL
const SITE_URL = "https://www.chatitin.com";

export async function getStaticData({ store, staticData }) {
    const userData = store.get("userData");

    // reconstruct cookie - to skip the login page and go straight to the main page
    const cookie = "base64-" + Buffer.from(JSON.stringify(userData), "utf-8").toString("base64");

    // try and get the website itself
    const params = {
        method: "GET",
        headers: {
            Cookie: `${ACCESS_TOKEN_COOKIE_NAME}=${cookie}`,
            "User-Agent": USER_AGENT,
        },
    };

    const res = await fetch(SITE_URL, params);

    if (!res.ok) {
        console.error("Failed to fetch site:", res.status, res.statusText);
        return;
    }

    // Get all the script tags from the website
    // this way I can find JS files with randomly(?) generated names
    const html = await res.text();
    const scriptTags = html.match(/<script[^>]+src="(.+?)"/g);

    const scriptPaths = [];
    for (const scriptTag of scriptTags) {
        const scriptPath = scriptTag.match(/src="(.+?)"/)?.[1];
        if (!scriptPath) continue;
        scriptPaths.push(scriptPath);
    }

    // This JS file contains an array of all emotes' IDs and filenames
    const layoutScriptPath = scriptPaths.find((s) => /app\/layout-.+\.js/.test(s));
    const layoutScriptRes = await fetch(SITE_URL + layoutScriptPath);

    if (!layoutScriptRes.ok) {
        console.error("Failed to fetch layout script:", layoutScriptRes.status, layoutScriptRes.statusText);
        return;
    }

    const layoutScript = await layoutScriptRes.text();

    const emotesStr = layoutScript.match(/\[\{id:.+?\]/)?.[0];
    if (!emotesStr) {
        console.error("Failed to find emoji array in layout script.");
        return;
    }

    // staticData.set("emotes", eval(emotesStr)); // LAZY AND UNSECURE
    const emotes = JSON.parse(emotesStr.replace(/id:/g, '"id":').replace(/image:/g, '"image":'));
    staticData.set(
        "emotes",
        emotes.map((x) => ({ ...x, image: SITE_URL + "/" + x.image })) // Add the site URL to the images to get full URLs for each image
    );
}

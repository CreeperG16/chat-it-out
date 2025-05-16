import { SUPABASE_ANON_KEY as API_KEY } from "./constants.mjs";

async function fetchWithAuth(url, method, token, headers = {}, body = "") {
    const res = await fetch(url, {
        method,
        headers: {
            apiKey: API_KEY,
            Authorization: "Bearer " + token,
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Content-Type": typeof body === "object" ? "application/json" : "text/plain",
            ...headers,
        },
        body: method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });

    if (!res.ok) {
        return { data: null, error: { status: res.status, statusText: res.statusText } };
    }

    if (
        ["application/json", "application/vnd.pgrst.object+json"].includes(
            res.headers.get("Content-Type")?.split(";")?.[0]
        )
    ) {
        return { data: await res.json(), error: null };
    } else {
        return { data: await res.text(), error: null };
    }
}

const get = async (url, token, headers = {}) => fetchWithAuth(url, "GET", token, headers);
const post = async (url, body, token, headers = {}) => fetchWithAuth(url, "POST", token, headers, body);

// Gets all the existing channels
async function getChannels(token) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/rooms?select=*";

    /**
     * @type {{ data: {
     *   id: string; // uuid
     *   name: string;
     *   description: string;
     *   admin_only: boolean;
     *   position: number; // index from the top of the channel list
     *   type: "TEXT"; // TODO: add support for other channel types. Not important for now.
     *   icon: string | null; // ID of the icon (not a uuid, just a word like "gamble" or "stock")
     *   hidden: boolean;
     * }[] }}
     */
    const { data: channels, error: channelsErr } = await get(ENDPOINT, token);

    if (channelsErr) {
        return { data: null, error: { message: "Error fetching channels", details: channelsErr } };
    }

    return {
        data: channels,
        error: null,
    };
}

// Gets all messages. If no channel ID is specified, it returns all messages from all channels.
// Otherwise, it returns messages from the specified channel.
async function getMessages(channelId, token) {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "created_at.desc");
    params.set("limit", "50");
    if (channelId) params.set("room_id", `eq.${channelId}`);

    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages?" + params.toString();

    /**
     * @type {{ data: {
     *   id: string; // uuid
     *   room_id: string; // uuid of the channel
     *   author_id: string | null; // uuid of the author's profile. If null, the message is a sort of system event, in the middle of the chat.
     *   content: string;
     *   created_at: string; // ISO date
     *   is_image_content: boolean; // Whether the content contains a URL to an image - TODO
     *   replied_message_id: string | null; // The ID of the message this message is replying to
     *   type: null; // ???
     * }[] }}
     */
    const { data: messages, error: messagesErr } = await get(ENDPOINT, token);

    if (messagesErr) {
        return { data: null, error: { message: "Error fetching messages", details: messagesErr } };
    }

    return {
        data: messages,
        error: null,
    };
}

async function getProfiles(token) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/profiles?select=*";

    /**
     * @type {{ data: {
     *   id: string; // UUID of the profile
     *   username: string;
     *   admin: boolean;
     *   display_colour: string; // hex colour code that the name is coloured in on the front end
     *   bio: string | null;
     *   avatar_url: string | null;
     *   status: string; // TODO - figure this out. this contains whether they're online, and what room they're currently viewing, in a special format
     *   status_last_updated: string; // ISO date
     *   notification_type: "mentions"; // TODO: different notification types
     *   version: 1; // unsure of other versions for now
     * }[] }}
     */
    const { data: profiles, error: profilesErr } = await get(ENDPOINT, token);

    if (profilesErr) {
        return { data: null, error: { message: "Error fetching profiles", details: profilesErr } };
    }

    return {
        data: profiles,
        error: null,
    };
}

async function getProfile(userId, token) {
    const ENDPOINT = `https://wkuimailekpioxrlteqk.supabase.co/rest/v1/profiles?select=*&id=eq.${userId}`;

    /**
     * @type {{ data: {
     *   id: string; // UUID of the profile
     *   username: string;
     *   admin: boolean;
     *   display_colour: string; // hex colour code that the name is coloured in on the front end
     *   bio: string | null;
     *   avatar_url: string | null;
     *   status: string; // TODO - figure this out. this contains whether they're online, and what room they're currently viewing, in a special format
     *   status_last_updated: string; // ISO date
     *   notification_type: "mentions"; // TODO: different notification types
     *   version: 1; // unsure of other versions for now
     * }}}
     */
    const { data: profile, error: profileErr } = await get(ENDPOINT, token);

    if (profileErr) {
        return { data: null, error: { message: "Error fetching profiles", details: profileErr } };
    }

    return {
        data: profile,
        error: null,
    };
}

async function postMessage(content, authorId, channelId, token, isImageContent = false, repliedMessageId = null) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages";

    const messagePayload = {
        content,
        room_id: channelId,
        author_id: authorId,
        is_image_content: isImageContent,
    };

    // console.log("API: Posting message with payload:", messagePayload);

    if (repliedMessageId) {
        messagePayload.replied_message_id = repliedMessageId;
    }

    const { data: messageResult, error: messageErr } = await post(ENDPOINT, messagePayload, token);

    if (messageErr) {
        return { data: null, error: { message: "Failed to post message", details: messageErr } };
    }

    return { data: messageResult, error: null };
}

async function deleteMessage(id, token) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages";

    const res = await fetchWithAuth(ENDPOINT + "?id=eq." + id, "DELETE", token);
    return res;
}

async function updateStatus({ status = "online", userId, token }) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/rpc/status";

    /**
     * @type {{ data: {
     *   id: string; // UUID of the profile
     *   username: string;
     *   admin: boolean;
     *   display_colour: string; // hex colour code that the name is coloured in on the front end
     *   bio: string | null;
     *   avatar_url: string | null;
     *   status: string; // TODO - figure this out. this contains whether they're online, and what room they're currently viewing, in a special format
     *   status_last_updated: string; // ISO date
     *   notification_type: "mentions"; // TODO: different notification types
     *   version: 1; // unsure of other versions for now
     * }[] }}
     */
    const { data: onlineUsers, error } = await post(
        ENDPOINT,
        {
            status_text: status,
            user_id: userId,
        },
        token
    );

    if (error) {
        return { data: null, error: { message: "Failed to update status", details: error } };
    }

    return { data: onlineUsers, error: null };
}

async function respondToScreenshot({ imageName, targetUser, token }) {
    const ENDPOINT = "https://wkuimailekpioxrlteqk.supabase.co/realtime/v1/api/broadcast";

    const { data, error } = await post(
        ENDPOINT,
        {
            messages: [
                {
                    topic: "main",
                    event: "screenshot-response",
                    payload: { image_url: imageName, target_user: targetUser },
                },
            ],
        },
        token
    );

    if (error) {
        return { data: null, error: { message: "Failed to send screenshot response", details: error } };
    }

    return { data, error: null };
}

export {
    getChannels,
    getMessages,
    getProfiles,
    getProfile,
    postMessage,
    deleteMessage,
    updateStatus,
    respondToScreenshot,
};

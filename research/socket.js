const WebSocket = require("ws");

const API_KEY = "eyJ...";
const ACCESS_TOKEN = "eyJ...";

const SOCKET_URL = `wss://wkuimailekpioxrlteqk.supabase.co/realtime/v1/websocket?apikey=${API_KEY}&vsn=1.0.0`

const socket = new WebSocket(SOCKET_URL);

let messageRef = 1;
let joinRef = 1;
let heartbeatInterval = null;

// The "GENERAL" channel's ID
const GENERAL_ROOM = "080f3272-4e79-4e68-af5c-123e868b3db0";

socket.onopen = () => {
    console.log("WebSocket connection established.");

    heartbeatInterval = setInterval(() => {
        socket.send(JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: (messageRef++).toString(),
        }));
    }, 30_000);

    socket.send(JSON.stringify({
        topic: `realtime:room:${GENERAL_ROOM}`,
        event: "phx_join",
        payload: {
            config: {
                broadcast: { ack: false, self: false },
                presence: { key: "" },
                postgres_changes: [],
                private: true,
            },
            access_token: ACCESS_TOKEN,
        },
        ref: (messageRef++).toString(),
        join_ref: (joinRef++).toString(),
    }))
};

socket.onmessage = (event) => {
    console.log("Message received:", event.data.toString());
};

socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    clearInterval(heartbeatInterval);
};

socket.onclose = (event) => {
    console.log("WebSocket connection closed:", event.reason);
    clearInterval(heartbeatInterval);
};

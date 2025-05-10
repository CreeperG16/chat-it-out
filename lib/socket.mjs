import { config } from "dotenv";
config();

import { WebSocket } from "ws";

const API_KEY = process.env.API_KEY;
const WSS_URL = `wss://wkuimailekpioxrlteqk.supabase.co/realtime/v1/websocket?apikey=${API_KEY}&vsn=1.0.0`;

class MessageSocket {
    constructor(accessToken) {
        this.messageRef = 1;
        this.joinRef = 1;
        this.accessToken = accessToken;
        this.socket = null;
        this.heartbeatInterval = null;

        this.onMessage = (message) => {};
    }

    connect() {
        this.socket = new WebSocket(WSS_URL);
        this.socket.onopen = () => {
            this.heartbeatInterval = setInterval(() => {
                this.sendMessage("phoenix", "heartbeat");
            }, 30_000);
        };

        this.socket.onmessage = (event) => {
            // console.log(data);
            this.onMessage(JSON.parse(event.data.toString()));
        };

        this.socket.onclose = () => {
            clearInterval(this.heartbeatInterval);
        };
    }

    sendMessage(topic, event, payload = {}, hasJoinRef = false) {
        const msg = {
            topic,
            event,
            payload,
            ref: (this.messageRef++).toString(),
        };

        if (hasJoinRef) msg.join_ref = this.joinRef.toString();

        this.socket.send(JSON.stringify(msg));
    }

    joinRoom(roomId) {
        this.joinRef = this.messageRef;
        this.sendMessage(
            `realtime:room:${roomId}`,
            "phx_join",
            {
                config: {
                    broadcast: { ack: false, self: false },
                    presence: { key: "" },
                    postgres_changes: [],
                    private: true,
                },
                access_token: this.accessToken,
            },
            true
        );
    }

    leaveRoom(roomId) {
        this.sendMessage(`realtime:room:${roomId}`, "phx_leave", {}, true);
    }
}

export { MessageSocket };

const example_message = {
    ref: null,
    event: "broadcast",
    payload: {
        event: "message-create",
        payload: { id: "170f6108-1c70-4278-99b8-7191a53ce7a1", message: {
            // This is the same structure as `api.mjs` `getMessages(channelId)`
        } },
        type: "broadcast",
    },
    topic: "realtime:room:080f3272-4e79-4e68-af5c-123e868b3db0",
};

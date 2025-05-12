import { config } from "dotenv";
config();

import { WebSocket } from "ws";
import { EventEmitter } from "node:events";

const API_KEY = process.env.API_KEY;
const WSS_URL = `wss://wkuimailekpioxrlteqk.supabase.co/realtime/v1/websocket?apikey=${API_KEY}&vsn=1.0.0`;

class MessageSocket extends EventEmitter {
    /** @deprecated */ onMessage = (_message) => {};
    socket = null;
    heartbeatInterval = null;
    messageRef = 1;
    joinRef = 1;

    /** @readonly */ joinedRooms = new Map();
    /** @readonly */ sentMessages = new Map();
    /** @readonly */ accessToken;

    constructor(accessToken) {
        super();

        this.accessToken = accessToken;
    }

    connect() {
        this.socket = new WebSocket(WSS_URL);
        this.socket.onopen = () => {
            this.heartbeatInterval = setInterval(() => {
                this.sendMessage("phoenix", "heartbeat");
            }, 30_000);
        };

        this.socket.onmessage = (ev) => {
            this.handleMessage(ev.data.toString());
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
            ref: this.messageRef.toString(),
        };

        let resolve;
        const promise = new Promise(r => (resolve = r));
        this.sentMessages.set((this.messageRef++).toString(), { message: msg, resolve });

        if (hasJoinRef) msg.join_ref = this.joinRef.toString();

        this.socket.send(JSON.stringify(msg));
    }

    joinRoom(roomId) {
        this.joinRef = this.messageRef;
        this.joinedRooms.set(roomId, this.joinRef);

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
        const ref = this.joinedRooms.get(roomId);
        if (!ref) return;

        this.joinRef = ref;
        this.sendMessage(`realtime:room:${roomId}`, "phx_leave", {}, true);
    }

    handleMessage(data) {
        // Legacy onMessage
        this.onMessage(JSON.parse(data));

        const { event, topic, payload, ref } = JSON.parse(data);

        if (event === "broadcast") {
            this.emit(payload.event, payload.payload);

            return;
        }

        if (event === "phx_reply") {
            const message = this.sentMessages.get(ref);
            if (!message) return;

            message.resolve(payload);

            return;
        }

        // TODO: other event types
    }
}

export { MessageSocket };

const example_create = {
    ref: null,
    event: "broadcast",
    payload: {
        event: "message-create",
        payload: {
            id: "170f6108-1c70-4278-99b8-7191a53ce7a1",
            message: {
                // This is the same structure as `api.mjs` `getMessages(channelId)`
            },
        },
        type: "broadcast",
    },
    topic: "realtime:room:080f3272-4e79-4e68-af5c-123e868b3db0",
};

const example_delete = {
    ref: null,
    event: "broadcast",
    payload: {
        event: "message-delete",
        payload: {
            id: "587f331a-9c8c-443e-a2df-0ad5a4131945",
            message: { id: "1fa8744f-f1b7-48a6-bc10-8d97310be4cc", room_id: "080f3272-4e79-4e68-af5c-123e868b3db0" },
        },
        type: "broadcast",
    },
    topic: "realtime:room:080f3272-4e79-4e68-af5c-123e868b3db0",
};

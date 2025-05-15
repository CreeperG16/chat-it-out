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

        this.socket.onmessage = (ev) => {
            this.handleMessage(ev.data.toString());
        };

        this.socket.onclose = () => {
            clearInterval(this.heartbeatInterval);
        };

        return new Promise((resolve) => {
            this.socket.onopen = () => {
                this.emit("open");
                resolve();

                this.heartbeatInterval = setInterval(() => {
                    this.emit("heartbeat");
                    this.sendMessage("phoenix", "heartbeat");
                }, 30_000);
            };
        });
    }

    sendMessage(topic, event, payload = {}, hasJoinRef = false) {
        const msg = {
            topic,
            event,
            payload,
            ref: this.messageRef.toString(),
        };

        let resolve;
        const promise = new Promise((r) => (resolve = r));
        this.sentMessages.set((this.messageRef++).toString(), { message: msg, resolve });

        if (hasJoinRef) msg.join_ref = this.joinRef.toString();

        this.socket.send(JSON.stringify(msg));

        return promise;
    }

    // TODO: rewrite instead of the bool
    joinRoom(roomId, isRoom = true, isPrivate = true, presenceKey = "") {
        this.joinRef = this.messageRef;
        this.joinedRooms.set(isRoom ? "room:" + roomId : roomId, this.joinRef);

        return this.sendMessage(
            isRoom ? `realtime:room:${roomId}` : `realtime:${roomId}`,
            "phx_join",
            {
                config: {
                    broadcast: { ack: false, self: false },
                    presence: { key: presenceKey },
                    postgres_changes: [],
                    private: isPrivate,
                },
                access_token: this.accessToken,
            },
            true
        );
    }

    leaveRoom(roomId, isRoom = true) {
        const ref = this.joinedRooms.get(isRoom ? `room:${roomId}` : roomId);
        if (!ref) return Promise.resolve({ status: "error" });

        this.joinRef = ref;
        return this.sendMessage(`realtime:room:${roomId}`, "phx_leave", {}, true);
    }

    handleMessage(data) {
        // Legacy onMessage
        this.onMessage(JSON.parse(data));

        const { event, topic, payload, ref } = JSON.parse(data);
        // console.log("Got message", event, topic);

        if (event === "broadcast") {
            this.emit(payload.event, payload.payload, topic);
            return;
        }

        if (event === "presence_diff") {
            this.emit("presence-diff", payload, topic);
            return;
        }

        if (event === "phx_reply") {
            const message = this.sentMessages.get(ref);
            if (!message) return;

            message.resolve(payload);
            this.sentMessages.delete(ref);

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

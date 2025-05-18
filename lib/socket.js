import { SUPABASE_ANON_KEY as API_KEY } from "./constants.js";
import { WebSocket } from "ws";
import { EventEmitter } from "node:events";

const WSS_URL = `wss://wkuimailekpioxrlteqk.supabase.co/realtime/v1/websocket?apikey=${API_KEY}&vsn=1.0.0`;

export class RealtimeSocket extends EventEmitter {
    /** @private */ heartbeatInterval = null;
    /** @private */ currentMessageRef = 1;
    /** @private @readonly */ accessToken;

    /** @readonly @type {WebSocket | null} - The WebSocket instance */
    socket = null;

    /** @readonly @type {Map<string, number>} - Map of room IDs to the ref of the join request for the room */
    channels = new Map();

    /** @readonly @type {Map<number, (value: any) => void>} - Map of message refs to promises to be resolved on reply */
    pendingMessages = new Map();

    constructor() {
        super();
    }

    async connect(accessToken) {
        this.accessToken = accessToken;
        this.socket = new WebSocket(WSS_URL);

        this.socket.addEventListener("message", (ev) => {
            try {
                const data = ev.data.toString();
                const json = JSON.parse(data);
                this.emit("socket-message", json);
                this.handleMessage(json);
            } catch (err) {
                this.emit("error", { message: "Failed to parse and handle incoming message.", details: err });
            }
        });

        this.socket.addEventListener("close", (ev) => {
            clearInterval(this.heartbeatInterval);
            this.socket = null;

            for (const resolve of this.pendingMessages.values()) {
                resolve({
                    success: false,
                    data: null,
                    error: { message: "Socket closed before any reply received." },
                });
            }
            this.pendingMessages.clear();
            this.channels.clear();

            this.emit("close");
        });

        return new Promise((resolve) => {
            this.socket.addEventListener("open", (ev) => {
                console.log("SOCKET OPEN!!!");

                this.heartbeatInterval = setInterval(() => {
                    this.emit("heartbeat");
                    this.sendMessage({ topic: "phoenix", event: "heartbeat" });
                }, 30_000);

                this.emit("open");
                resolve();
            });
        });
    }

    async sendMessage({ topic, event, payload = {}, joinRef }) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return {
                success: false,
                data: null,
                error: { message: "Failed to send message: socket not open." },
            };
        }

        const ref = (this.currentMessageRef++).toString();
        const msg = { topic, event, payload, ref };

        return await new Promise((resolve) => {
            if (joinRef) msg.join_ref = joinRef.toString();

            try {
                this.socket.send(JSON.stringify(msg));
            } catch (err) {
                resolve({
                    success: false,
                    data: null,
                    error: { message: "Failed to send message: socket.send() failed.", details: err },
                });
                return;
            }

            this.pendingMessages.set(parseInt(ref), resolve);
        });
    }

    async joinChannel({ channelId, isPrivate = false, presenceKey = "" }) {
        this.channels.set(channelId, this.currentMessageRef);

        const result = await this.sendMessage({
            topic: `realtime:${channelId}`,
            event: "phx_join",
            joinRef: this.currentMessageRef,
            payload: {
                config: {
                    broadcast: { ack: false, self: false },
                    presence: { key: presenceKey },
                    postgres_changes: [],
                    private: isPrivate,
                },
                access_token: this.accessToken,
            },
        });

        if (!result.success) this.channels.delete(channelId);

        return result;
    }

    async leaveChannel({ channelId }) {
        const joinRef = this.channels.get(channelId);
        if (!joinRef) return { success: false };

        const result = await this.sendMessage({
            topic: `realtime:${channelId}`,
            event: "phx_leave",
            joinRef,
        });

        if (result.success) this.channels.delete(channelId);

        return result;
    }

    async trackPresence({ channelId, presenceId }) {
        const channelRef = this.channels.get(channelId);
        if (!channelRef) {
            return {
                success: false,
                data: null,
                error: {
                    message: "Failed to track presence - channel with specified ID not found (have you joined it?).",
                },
            };
        }

        const result = await this.sendMessage({
            topic: `realtime:${channelId}`,
            event: "presence",
            joinRef: channelRef.toString(),
            payload: {
                type: "presence",
                event: "track",
                payload: { id: presenceId },
            },
        });

        return result;
    }

    async close({ leaveChannels = true } = {}) {
        clearInterval(this.heartbeatInterval);

        for (const resolve of this.pendingMessages.values()) {
            resolve({
                success: false,
                data: null,
                error: { message: "Socket closed before any reply received." },
            });
        }
        this.pendingMessages.clear();

        if (leaveChannels) {
            const promises = [];
            for (const channelId of this.channels.keys()) {
                promises.push(this.leaveChannel({ channelId }));
            }

            await Promise.all(promises);
        } else {
            this.channels.clear();
        }

        this.socket.close();
        this.socket = null;
    }

    handleMessage({ topic, event, payload, ref }) {
        if (event === "broadcast") {
            this.emit(payload.event, {
                channelId: topic.replace("realtime:", ""),
                payload: payload.payload,
            });
            return;
        }

        if (event === "presence_diff") {
            for (const [presenceKey, { metas }] of Object.entries(payload.joins)) {
                this.emit("presence-joins", {
                    channelId: topic.replace("realtime:", ""),
                    presenceKey,
                    joins: metas.map((x) => ({
                        presenceId: x.id,
                    })),
                });
            }

            for (const [presenceKey, { metas }] of Object.entries(payload.leaves)) {
                this.emit("presence-leaves", {
                    channelId: topic.replace("realtime:", ""),
                    presenceKey,
                    leaves: metas.map((x) => ({
                        presenceId: x.id,
                    })),
                });
            }

            return;
        }

        if (event === "phx_reply") {
            const resolve = this.pendingMessages.get(parseInt(ref));
            if (!resolve) return;

            resolve({
                success: payload.status === "ok",
                data: payload,
            });

            this.pendingMessages.delete(parseInt(ref));
            return;
        }
    }

    isDestroyed() {
        return this.socket === null;
    }
}

export class MessageSocket extends EventEmitter {
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

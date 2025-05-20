import { ChannelManager } from "./channels.js";
import { Message, MessageManager } from "./messages.js";
import { UserManager } from "./users.js";

// Handles the chat bar and sending messages
export class InputManager {
    /** @readonly @type {HTMLDivElement} (contentetitable) */
    chatBarElement = document.createElement("div");

    /** @readonly @type {HTMLDivElement} */
    replyBarElement = document.createElement("div");

    /** @readonly @type {HTMLDivElement} */
    attachmentBarElement = document.createElement("div");

    /** @private @type {Message | null} */
    replyingToMessage;

    /** @private @readonly @type {any[]} */
    attachments = [];

    /** @private @readonly @type {ChannelManager} */ channelManager;
    /** @private @readonly @type {MessageManager} */ messageManager;
    /** @private @readonly @type {UserManager} */ userManager;

    constructor({ channelManager, messageManager, userManager }) {
        this.channelManager = channelManager;
        this.messageManager = messageManager;
        this.userManager = userManager;

        this.chatBarElement.contentEditable = "true";
        this.chatBarElement.classList.add("message-input");
        this.chatBarElement.addEventListener("input", (ev) => {
            if (ev.target.innerHTML.trim() === "<br>") ev.target.innerHTML = "";
        });
        this.chatBarElement.dataset.placeholder = "Type a message in general...";

        this.chatBarElement.addEventListener("keypress", (ev) => {
            if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                this.sendMessage();
            }
        })
    }

    updatePlaceholder(message) {
        this.chatBarElement.dataset.placeholder = message;
    }

    //#region Input logic
    async sendMessage() {
        const id = crypto.randomUUID();

        // TODO: replies, attachments
        const content = this.chatBarElement.textContent;
        if (!content) return; // Don't send empty message (TODO: images)

        // Can't send a message if no channel is selected
        if (!this.channelManager.selectedChannel) return;

        // TODO: emoji

        const payload = {
            id,
            content,
            room_id: this.channelManager.selectedChannel,
            is_image_content: false, // TODO
            author_id: this.userManager.self.id,
            created_at: new Date().toISOString(),
        }        

        this.chatBarElement.innerHTML = "";
        
        // TODO: messagemanager - show a ghost message until sendmessage resolves
        // Need to add logged in profile as a User to have an author

        console.log("sending and rendering msg", payload);

        this.messageManager.setAndRenderMessage(payload, { ghost: true });

        return await window.electronAPI.sendChatMessage(payload);
    }
    //#endregion

    //#region Reply logic
    /** @param {Message} message */
    startReplying(message) {
        this.replyingToMessage = message;
    }

    stopReplying() {
        this.replyingToMessage = null;
    }

    renderReplyBar() {
        this.replyBarElement.innerHTML = "";

        if (!this.replyingToMessage) {
            this.replyBarElement.style.display = "none";
            return;
        }
    }
    //#endregion

    //#region Attachment logic
    async addAttachment(/* TODO */) {}

    removeAttachment(index) {}

    renderAttachmentBar() {}
    //#endregion
}

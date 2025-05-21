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
    replyingToMessage = null;

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
        });

        this.replyBarElement.id = "reply-preview-bar";
        this.replyBarElement.style.display = "none";
        this.replyBarElement.addEventListener("click", () => {
            // Try to scroll to the message
            if (!this.replyingToMessage) return;
            this.messageManager.scrollToMessage(this.replyingToMessage, true);
        });

        this.messageManager.onEvent("message-reply-request", (ev) => {
            if (!ev.detail || !ev.detail.messageId) return;

            const message = this.messageManager.getMessage(ev.detail.messageId);
            if (!message) return;

            this.startReplying(message);
            this.chatBarElement.focus();
        });
    }

    updatePlaceholder(message) {
        this.chatBarElement.dataset.placeholder = message;
    }

    //#region Input logic
    async sendMessage() {
        const id = crypto.randomUUID();

        // TODO: attachments
        const content = this.chatBarElement.textContent;
        if (!content) return; // Don't send empty message (TODO: images)

        // Can't send a message if no channel is selected
        if (!this.channelManager.selectedChannel) return;

        // TODO: emotes

        const payload = {
            id,
            content,
            room_id: this.channelManager.selectedChannel,
            is_image_content: false, // TODO
            replied_message_id: this.replyingToMessage?.id ?? null,
            author_id: this.userManager.self.id,
            created_at: new Date().toISOString(),
        };

        this.chatBarElement.innerHTML = "";

        console.log("Renderer: rendering ghost message.", payload);

        // Render a client-side ghost message
        // Will become a full message when it's received via the realtime socket
        this.messageManager.setAndRenderMessage(payload, { ghost: true });
        if (this.replyingToMessage) this.stopReplying();

        return await window.electronAPI.sendChatMessage(payload);
    }
    //#endregion

    //#region Reply logic
    /** @param {Message} message */
    startReplying(message) {
        this.replyingToMessage = message;
        this.renderReplyBar();
    }

    stopReplying() {
        this.replyingToMessage = null;
        this.renderReplyBar();
    }

    isReplying() {
        return this.replyingToMessage !== null;
    }

    renderReplyBar() {
        this.replyBarElement.innerHTML = "";

        if (!this.replyingToMessage) {
            this.replyBarElement.style.display = "none";
            this.chatBarElement.style.paddingTop = "10px";
            return this.replyBarElement;
        }

        let contentSnippet =
            this.replyingToMessage.content.type === "text" ? this.replyingToMessage.content.text : "Image";

        contentSnippet = contentSnippet.substring(0, 100) + (contentSnippet.length > 100 ? "..." : "");

        this.replyBarElement.innerHTML = /* html */ `
            <div class="reply-preview-content">
                <span class="reply-preview-label">Replying to ${this.replyingToMessage.author.name}:</span>
                <span class="reply-preview-snippet">${contentSnippet}</span>
            </div>
            <button class="cancel-reply-button" id="cancel-reply-btn" aria-label="Cancel reply">&times;</button>
        `;
        this.replyBarElement.style.display = "flex";
        this.chatBarElement.style.paddingTop = "5px";
        this.replyBarElement.querySelector("button").addEventListener("click", () => this.stopReplying());

        return this.replyBarElement;
    }
    //#endregion

    //#region Attachment logic
    async addAttachment(/* TODO */) {}

    removeAttachment(index) {}

    renderAttachmentBar() {}
    //#endregion
}

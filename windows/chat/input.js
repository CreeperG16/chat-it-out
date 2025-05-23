import { ChannelManager } from "./channels.js";
import { Message, MessageManager } from "./messages.js";
import { NotificationManager } from "./notifications.js";
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

    /** @private @readonly @type {{ url: string; hash: string }[]} */
    attachments = [];

    /** @private @readonly @type {ChannelManager} */ channelManager;
    /** @private @readonly @type {MessageManager} */ messageManager;
    /** @private @readonly @type {UserManager} */ userManager;
    /** @private @readonly @type {NotificationManager} */ notifications;

    constructor({ channelManager, messageManager, userManager, notifications }) {
        this.channelManager = channelManager;
        this.messageManager = messageManager;
        this.userManager = userManager;
        this.notifications = notifications;

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

        this.chatBarElement.addEventListener("paste", (ev) => {
            /** @type {DataTransferItemList} */
            const items = (ev.clipboardData || ev.originalEvent.clipboardData)?.items;
            if (!items) return;

            ev.preventDefault();

            for (const item of items) {
                if (!item.type.includes("image")) continue;

                const file = item.getAsFile();
                if (!file) continue;

                this.addAttachment(file);
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

        this.attachmentBarElement.id = "image-preview-area";
        this.attachmentBarElement.classList.add("image-preview-area");
        this.attachmentBarElement.style.display = "none";
    }

    updatePlaceholder(message) {
        this.chatBarElement.dataset.placeholder = message;
    }

    //#region Input logic
    async sendMessage() {
        // Generate an ID client side so that we can display a ghost message
        const id = crypto.randomUUID();

        const content = this.chatBarElement.innerHTML.replace(/<br>/g, "\n").trim();
        if (!content) return; // Don't send empty message (TODO: images)

        // Show the user a warning that CHAT IT IN doesn't show newlines
        if (content.includes("\n")) {
            this.notifications.showNotification(
                {
                    title: "Warning: Unsupported feature",
                    body: "CHAT IT IN does not render messages with newlines. On the official client, newlines get replaced by same-line spaces. What you see and send with line breaks here will not look the same on CHAT IT IN.",
                },
                10_000
            );
        }

        // Can't send a message if no channel is selected
        if (!this.channelManager.selectedChannel) return;

        const replyingToMessage = this.replyingToMessage?.id ?? null;
        if (replyingToMessage) this.stopReplying();

        this.chatBarElement.innerHTML = "";
        this.attachmentBarElement.style.display = "none";

        // TODO: emotes

        const payload = {
            id,
            content,
            room_id: this.channelManager.selectedChannel,
            is_image_content: false, // TODO
            replied_message_id: replyingToMessage,
            author_id: this.userManager.self.id,
            created_at: new Date().toISOString(),
        };

        console.log("Renderer: rendering ghost message.", payload);

        // Render a client-side ghost message
        // Will become a full message when it's received via the realtime socket
        const message = this.messageManager.setAndRenderMessage(payload, { ghost: true });

        const { data, error } = await window.electronAPI.sendChatMessage(payload);

        if (error) {
            message.element.classList.remove("ghost-message");
            message.element.classList.add("ghost-message-failed");
            message.render();
        }

        // Attachments
        const attachmentResponses = [];
        for (const { url, hash } of this.attachments) {
            const messageId = crypto.randomUUID();

            const imagePayload = {
                id: messageId,
                content: url,
                room_id: this.channelManager.selectedChannel,
                is_image_content: true,
                replied_message_id: replyingToMessage,
                author_id: this.userManager.self.id,
                created_at: new Date().toISOString(),
            };

            const imageMessage = this.messageManager.setAndRenderMessage(imagePayload, { ghost: true });
            const { data, error } = await window.electronAPI.sendChatMessage(imagePayload);

            if (error) {
                imageMessage.element.classList.remove("ghost-message");
                imageMessage.element.classList.add("ghost-message-failed");
                imageMessage.render();
            }

            attachmentResponses.push({ hash, response: data });
        }

        if (this.attachments.length > 0) this.removeAllAttachments();

        return { data: { message: data, attachments: attachmentResponses }, error };
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
    // TODO: uploadButton.classList.add("uploading") etc.
    /** @param {File} file */
    async addAttachment(file) {
        const { data, error } = await this.uploadImage(file);
        if (error) {
            this.notifications.showNotification({
                title: `Failed to upload ${file.name}`,
                body: error.message + " (" + JSON.stringify(error.details) + ")",
            });
            return;
        }

        // Add the image url to the attachments array
        this.attachments.push(data);
        this.renderAttachmentBar();
    }

    /**
     * Remove an attachment from the active attachment list of the current message
     * @param {number | string} indexOrHash The index or the hash of the attachment to remove
     * @returns {boolean} Whether the attachment was removed or not (if it wasn't in the list)
     */
    removeAttachment(indexOrHash) {
        let itemWasRemoved = false;

        if (typeof indexOrHash === "number") {
            const item = this.attachments.splice(indexOrHash, 1);
            if (item) itemWasRemoved = true;
        } else {
            const index = this.attachments.findIndex((x) => x.hash === indexOrHash);
            if (index) {
                this.attachments.splice(index, 1);
                itemWasRemoved = true;
            }
        }

        if (itemWasRemoved) this.renderAttachmentBar();
        return itemWasRemoved;
    }

    removeAllAttachments() {
        this.attachments.splice(0, this.attachments.length);
        this.renderAttachmentBar();
    }

    renderAttachmentBar() {
        this.attachmentBarElement.innerHTML = "";

        if (this.attachments.length === 0) {
            this.attachmentBarElement.style.display = "none";
            return this.attachmentBarElement;
        }

        this.attachmentBarElement.style.display = "flex";

        for (const { url, hash } of this.attachments) {
            const image = document.createElement("img");
            image.src = url;
            image.alt = hash;
            image.classList.add("image-preview-img");

            this.attachmentBarElement.appendChild(image);
        }

        const cancelAllButton = document.createElement("button");
        cancelAllButton.id = "cancel-image-upload-button";
        cancelAllButton.classList.add("cancel-upload-button");
        cancelAllButton.innerHTML = "&times;";

        cancelAllButton.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.removeAllAttachments();
        });

        this.attachmentBarElement.appendChild(cancelAllButton);

        return this.attachmentBarElement;
    }

    // TODO: move this logic to its own class (profile pic)
    // and maybe make it not so image-specific
    /** @param {File} file */
    async uploadImage(file) {
        if (!file) {
            return { data: null, error: { message: "No file provided" } };
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const { data, error } = await window.electronAPI.uploadImage({
                buffer: arrayBuffer,
                type: file.type,
                name: file.name,
            });

            if (error) return { data: null, error };

            return { data, error: null };
        } catch (err) {
            return { data: null, error: { message: "Exception during image upload.", details: err } };
        }
    }
    //#endregion
}

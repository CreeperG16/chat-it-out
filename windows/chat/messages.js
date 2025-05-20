import { User, UserManager } from "./users.js";

const EXAMPLE_MESSAGE = {
    id: "1e0fff31-3c58-4193-81ba-c7f4ce6f9bad",
    room_id: "080f3272-4e79-4e68-af5c-123e868b3db0",
    content: "WOOO my profile pic is back",
    created_at: "2025-05-16T19:51:24.474167+00:00",
    is_image_content: false,
    replied_message_id: null,
    author: {
        id: "c59218d0-c7f8-4921-a914-cca3af98800c",
        admin: true,
        flags: 16,
        username: "Tom",
        avatar_url:
            "https://wkuimailekpioxrlteqk.supabase.co/storage/v1/object/public/avatars/hashed/688f71072def33ef17311d0b6e112fd8e5801117bacdad340f857b3e917dbb4f.png",
        border_colour: "#1d2258",
        display_colour: "#ffffff",
    },
    reactions: [],
};

export class Message {
    /**
     * @readonly
     * @type {{
     *  type: "system_event"; event: string
     * } | {
     *  type: "image"; imageUrl: string
     * } | {
     *  type: "text"; text: string
     * }}
     */
    content;

    /** @readonly @type {HTMLDivElement} */
    element = document.createElement("div");

    /** @type {boolean} */
    showDetails = true;

    /** @type {boolean} Whether it's a client-side ghost message */
    isGhostMessage = false;

    /**
     * @param {any} msg
     * @param {UserManager} userManager
     */
    constructor(msg, userManager) {
        this.updateData(msg, userManager);
    }

    /**
     * @param {any} msg
     * @param {UserManager} userManager
     */
    updateData(msg, userManager) {
        this.id = msg.id;
        this.time = new Date(msg.created_at);
        this.channelId = msg.room_id; // TODO: ?

        this.content = {};

        if (msg.author_id === null || msg.author === null) {
            this.content.type = "system_event";
            this.content.event = msg.content;
            return;
        }

        if (msg.is_image_content) {
            this.content.type = "image";
            this.content.imageUrl = msg.content;
        } else {
            this.content.type = "text";
            this.content.text = msg.content;
        }

        this.repliedMessageId = msg.replied_message_id; // Store the ID for now
        this.replyTo = null; // Will be populated by MessageManager
        this.reactions = msg.reactions;

        const authorId = msg.author_id || (msg.author && msg.author.id);
        if (!authorId) {
            console.error("Author ID not found!");
            return;
        }

        this.author = userManager.getUser(authorId);
        if (!this.author) {
            // TODO - handle if the user isnt in the user manager
            return;
        }
    }

    scrollIntoView(highlight = false) {
        if (!this.element) return false;

        this.element.scrollIntoView({ behavior: "smooth", block: "center" });

        if (!highlight) return true;

        this.element.classList.add("highlighted-message");
        setTimeout(() => this.element.classList.remove("highlighted-message"), 1500);

        return true;
    }

    /** @returns {HTMLDivElement} */
    render() {
        this.element.classList.remove("no-message-details");

        if (this.isGhostMessage) {
            this.element.classList.add("ghost-message");
        } else {
            this.element.classList.remove("ghost-message");
        }

        switch (this.content.type) {
            case "system_event":
                return this.renderSystemEvent();
            case "image":
                return this.renderImageMessage();
            case "text":
                return this.renderTextMessage();
        }
    }

    /**
     * @private
     * @returns {HTMLDivElement}
     */
    renderTextMessage() {
        this.element.innerHTML = "";
        this.element.classList.add("message");
        this.element.dataset.messageId = this.id;

        if (!this.hasDetails) {
            this.element.classList.add("no-message-details");

            const messageBodyDiv = document.createElement("div");
            messageBodyDiv.classList.add("message-body");

            const textSpan = document.createElement("span");
            textSpan.classList.add("message-text");
            textSpan.textContent = this.content.text;

            messageBodyDiv.appendChild(textSpan);
            this.element.appendChild(messageBodyDiv);

            // Render buttons
            const buttons = this.renderMessageButtons();
            this.element.appendChild(buttons);

            return this.element;
        }

        const messageDiv = document.createElement("div");
        messageDiv.style.display = "flex";
        messageDiv.style.flexDirection = "row";
        messageDiv.style.alignItems = "flex-start";

        // Author avatar
        if (this.author instanceof User) {
            const avatarElement = this.author.renderAvatar();
            messageDiv.appendChild(avatarElement);
        } else {
            const avatar = document.createElement("img");
            avatar.classList.add("message-avatar");
            avatar.src = "../../assets/person.svg"; // Consistent with previous fallback path
            avatar.alt = "User's avatar";
            messageDiv.appendChild(avatar);
        }

        const messageContentDiv = document.createElement("div");
        messageContentDiv.classList.add("message-content-holder");

        // Author username
        if (this.author instanceof User) {
            const usernameElement = this.author.renderUsername();
            usernameElement.classList.add("message-username"); // Ensure class for styling
            messageContentDiv.appendChild(usernameElement);
        } else {
            const usernameSpan = document.createElement("span");
            usernameSpan.classList.add("message-username");
            usernameSpan.textContent = "Unknown User";
            messageContentDiv.appendChild(usernameSpan);
        }

        // Timestamp
        const timestampSpan = document.createElement("span");
        timestampSpan.classList.add("message-timestamp");
        timestampSpan.textContent = this.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        messageContentDiv.appendChild(timestampSpan);

        // Wrapper for message body (content)
        const messageBodyDiv = document.createElement("div");
        messageBodyDiv.classList.add("message-body");

        const textSpan = document.createElement("span");
        textSpan.classList.add("message-text");
        textSpan.textContent = this.content.text;
        messageBodyDiv.appendChild(textSpan);

        messageContentDiv.appendChild(messageBodyDiv);
        messageDiv.appendChild(messageContentDiv);
        this.element.appendChild(messageDiv);

        // Prepend the replied message preview if this message is a reply
        if (this.repliedMessageId) {
            const repliedMessagePreview = this.renderRepliedPreview(this.replyTo);
            this.element.prepend(repliedMessagePreview);
        }

        // Render buttons
        const buttons = this.renderMessageButtons();
        this.element.appendChild(buttons);

        return this.element;
    }

    /**
     * @private
     * @returns {HTMLDivElement}
     */
    renderImageMessage() {
        this.element.innerHTML = "";
        this.element.classList.add("message");
        this.element.dataset.messageId = this.id;

        if (!this.hasDetails) {
            this.element.classList.add("no-message-details");

            const messageBodyDiv = document.createElement("div");
            messageBodyDiv.classList.add("message-body");

            const imageElement = document.createElement("img");
            imageElement.classList.add("message-image");
            imageElement.src = this.content.imageUrl;
            imageElement.alt = "User uploaded image";

            imageElement.addEventListener("click", () => {
                const event = new CustomEvent("image-modal-open-request", {
                    detail: { imageUrl: this.content.imageUrl },
                    bubbles: true,
                    composed: true,
                });
                imageElement.dispatchEvent(event);
            });

            messageBodyDiv.appendChild(imageElement);
            this.element.appendChild(messageBodyDiv);

            // Render buttons
            const buttons = this.renderMessageButtons();
            this.element.appendChild(buttons);

            return this.element;
        }

        const messageDiv = document.createElement("div");
        messageDiv.style.display = "flex";
        messageDiv.style.flexDirection = "row";
        messageDiv.style.alignItems = "flex-start";

        // Author avatar
        if (this.author instanceof User) {
            const avatarElement = this.author.renderAvatar();
            messageDiv.appendChild(avatarElement);
        } else {
            const avatar = document.createElement("img");
            avatar.classList.add("message-avatar");
            avatar.src = "../../assets/person.svg";
            avatar.alt = "User's avatar";
            messageDiv.appendChild(avatar);
        }

        const messageContentDiv = document.createElement("div");
        messageContentDiv.classList.add("message-content-holder");

        // Author username
        if (this.author instanceof User) {
            const usernameElement = this.author.renderUsername();
            usernameElement.classList.add("message-username");
            messageContentDiv.appendChild(usernameElement);
        } else {
            const usernameSpan = document.createElement("span");
            usernameSpan.classList.add("message-username");
            usernameSpan.textContent = "Unknown User";
            messageContentDiv.appendChild(usernameSpan);
        }

        // Timestamp
        const timestampSpan = document.createElement("span");
        timestampSpan.classList.add("message-timestamp");
        timestampSpan.textContent = this.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        messageContentDiv.appendChild(timestampSpan);

        // Wrapper for message body (content)
        const messageBodyDiv = document.createElement("div");
        messageBodyDiv.classList.add("message-body");

        // Message content
        const imageElement = document.createElement("img");
        imageElement.classList.add("message-image");
        imageElement.src = this.content.imageUrl;
        imageElement.alt = "User uploaded image";

        imageElement.addEventListener("click", () => {
            const event = new CustomEvent("image-modal-open-request", {
                detail: { imageUrl: this.content.imageUrl },
                bubbles: true,
                composed: true,
            });
            imageElement.dispatchEvent(event);
        });

        messageBodyDiv.appendChild(imageElement);

        messageContentDiv.appendChild(messageBodyDiv);
        messageDiv.appendChild(messageContentDiv);
        this.element.appendChild(messageDiv);

        // Prepend the replied message preview if this message is a reply
        if (this.repliedMessageId) {
            const repliedMessagePreview = this.renderRepliedPreview(this.replyTo);
            this.element.prepend(repliedMessagePreview);
        }

        // Render buttons
        const buttons = this.renderMessageButtons();
        this.element.appendChild(buttons);

        return this.element;
    }

    /** @private @returns {HTMLDivElement} */
    renderSystemEvent() {
        this.element.innerHTML = "";
        this.element.classList.add("system-event");

        const contentParagraph = document.createElement("p");
        contentParagraph.textContent = this.content.event;
        this.element.appendChild(contentParagraph);

        return this.element;
    }

    /**
     * Creates the HTML element for a replied message preview.
     * @param {Message} originalMessage - The message being replied to.
     * @returns {HTMLDivElement} The preview element.
     * @private
     */
    renderRepliedPreview(originalMessage) {
        const repliedMessageDiv = document.createElement("div");
        repliedMessageDiv.classList.add("replied-message-preview");

        if (originalMessage) {
            const originalAuthorName = originalMessage.author ? originalMessage.author.name : "Unknown User";

            const repliedAuthorSpan = document.createElement("span");
            repliedAuthorSpan.classList.add("replied-message-author");
            repliedAuthorSpan.textContent = originalAuthorName;

            repliedMessageDiv.appendChild(repliedAuthorSpan);
        }

        const repliedContentSpan = document.createElement("span");
        repliedContentSpan.classList.add("replied-message-content-snippet");

        let contentSnippet = "";
        if (!originalMessage) {
            contentSnippet = "Message not loaded";
        } else if (originalMessage.content.type === "image") {
            contentSnippet = "Image"; // Placeholder for image replies
        } else if (originalMessage.content.type === "text") {
            contentSnippet = originalMessage.content.text || "";
        }

        repliedContentSpan.textContent = contentSnippet.substring(0, 50) + (contentSnippet.length > 50 ? "..." : "");
        repliedMessageDiv.appendChild(repliedContentSpan);

        // Add click listener to scroll to the original message
        if (originalMessage) {
            repliedMessageDiv.addEventListener("click", () => {
                if (!originalMessage.element) return;
                originalMessage.scrollIntoView(true);
            });
        }

        const replyLine = document.createElement("div");
        replyLine.classList.add("reply-line");
        repliedMessageDiv.prepend(replyLine);

        return repliedMessageDiv;
    }

    renderMessageButtons() {
        const buttonsDiv = document.createElement("div");
        buttonsDiv.classList.add("message-buttons");

        // Add reply button
        const replyButton = document.createElement("button");
        replyButton.classList.add("reply-button");
        replyButton.innerHTML = "&#x21A9;"; // Reply arrow symbol
        replyButton.setAttribute("aria-label", "Reply to this message");
        replyButton.title = "Reply";

        replyButton.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const event = new CustomEvent("message-reply-request", {
                detail: { messageId: this.id },
                bubbles: true,
                composed: true,
            });
            replyButton.dispatchEvent(event);
        });

        buttonsDiv.appendChild(replyButton);

        // Add delete button
        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.innerHTML = "&#x1F5D1;"; // Trash can icon
        deleteButton.setAttribute("aria-label", "Delete this message");
        deleteButton.title = "Delete";

        deleteButton.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const event = new CustomEvent("message-delete-request", {
                detail: { messageId: this.id },
                bubbles: true,
                composed: true,
            });
            deleteButton.dispatchEvent(event);
        });

        buttonsDiv.appendChild(deleteButton);

        return buttonsDiv;
    }
}

export class MessageManager {
    /** @readonly @type {Map<string, Message>} */
    messages = new Map();

    /** @private @readonly @type {UserManager} */
    userManager;

    /** @readonly @type {HTMLDivElement} */
    element = document.createElement("div");

    /** @param {UserManager} userManager */
    constructor(userManager) {
        this.userManager = userManager;
        this.element.classList.add("message-list");
    }

    shouldMessageHaveDetails(message, lastMessage) {
        if (!lastMessage) {
            // There is no last message, i.e this is the first message of the channel or the others got deleted
            return true;
        }

        if (lastMessage.time.getDate() !== message.time.getDate()) {
            // The last message was sent on a different day than this one
            return true;
        }

        if (
            lastMessage.content.type === "system_event" ||
            message.content.type === "system_event" ||
            message.repliedMessageId
        ) {
            // The last message (or this one) is a system event, or this message is a reply
            return true;
        }

        if (lastMessage.author.id !== message.author.id) {
            // The last message was written by a different person than the one who wrote this one
            return true;
        }

        // Same author, no reply, so we don't show the details again
        return false;
    }

    shouldInsertDateLine(message, lastMessage) {
        // There are no messages preceeding this one
        if (!lastMessage) return true;

        // The last message was sent on a different day than this one
        if (lastMessage.time.getDate() !== message.time.getDate()) {
            return true;
        }

        return false;
    }

    /**
     * @param {string | undefined} channelId
     * @returns {HTMLDivElement}
     */
    renderMessageList(channelId) {
        this.element.innerHTML = "";
        const messages = this.getMessages({ inChannel: channelId });

        for (const [index, message] of messages.entries()) {
            const lastMessage = messages[index - 1];

            if (this.shouldInsertDateLine(message, lastMessage)) {
                const dateLine = this.getDateLine(message.time);
                this.element.appendChild(dateLine);
            }

            message.hasDetails = this.shouldMessageHaveDetails(message, lastMessage);
            message.render();

            this.element.appendChild(message.element);
        }

        this.element.scrollTop = this.element.scrollHeight;

        return this.element;
    }

    showLoadingState() {
        this.element.innerHTML = `
            <div class="message-list-info">
                <span class="loading-dots-container">
                    <span class="loading-dot dot1"></span>
                    <span class="loading-dot dot2"></span>
                    <span class="loading-dot dot3"></span>
                </span>
            </div>`;
    }

    showErrorState(message) {
        this.element.innerHTML = `<div class="message-list-info">${message}</div>`;
    }

    /** @param {Date} date */
    getDateLine(date) {
        const dateLineContainer = document.createElement("div");
        dateLineContainer.classList.add("date-line");

        const dateLine = document.createElement("p");
        const day = date.getDate();
        const month = date.toLocaleString("en-US", { month: "short" });
        const year = date.getFullYear();
        dateLine.textContent = `${day} ${month} ${year}`;

        dateLineContainer.appendChild(dateLine);

        return dateLineContainer;
    }

    setMessages(msgs) {
        for (const msg of msgs) this.messages.set(msg.id, new Message(msg, this.userManager));

        // Second pass to link replies. getMessages() returns a chronologically sorted list
        for (const message of this.getMessages()) {
            if (!message.repliedMessageId) continue;

            const repliedToMessage = this.messages.get(message.repliedMessageId);
            if (repliedToMessage) message.replyTo = repliedToMessage;
        }
    }

    setAndRenderMessage(msg, { ghost = false } = {}) {
        if (this.messages.has(msg.id)) {
            // TODO: what to do if there's a conflict
            const message = this.messages.get(msg.id);
            message.updateData(msg, this.userManager);
            if (message.isGhostMessage !== ghost) {
                message.isGhostMessage = ghost;
                message.render();
            }
            return;
        }

        const message = new Message(msg, this.userManager);
        message.isGhostMessage = ghost;

        if (message.repliedMessageId) {
            message.replyTo = this.messages.get(message.repliedMessageId) || null;
        }

        const lastMessage = this.getMessages({ inChannel: message.channelId }).at(-1);

        if (this.shouldInsertDateLine(message, lastMessage)) {
            const dateLine = this.getDateLine(message.time);
            this.element.appendChild(dateLine);
        }

        message.hasDetails = this.shouldMessageHaveDetails(message, lastMessage);
        message.render();

        this.messages.set(msg.id, message);
        this.element.appendChild(message.element);
    }

    removeMessage(id) {
        const message = this.messages.get(id);
        if (!message) {
            console.warn(`Tried to remove message '${id}' but doesn't exist?`);
            return;
        }

        if (message.element && this.element.contains(message.element)) {
            this.element.removeChild(message.element);
        }

        this.messages.delete(id);
    }

    getMessage(id) {
        return this.messages.get(id);
    }

    scrollToMessage(id, highlight = false) {
        const message = this.messages.get(id);
        if (!message || !message.element) return false;

        message.scrollIntoView(highlight);
        return true;
    }

    /**
     * @param {{ byUser?: string | null; inChannel?: string | null }} param0
     * @returns
     */
    getMessages({ byUser = null, inChannel = null } = {}) {
        const sortedMessages = [...this.messages.values()].sort((a, b) => a.time - b.time);

        return sortedMessages
            .filter((m) => (byUser === null ? true : m.author?.id === byUser))
            .filter((m) => (inChannel === null ? true : m.channelId === inChannel));
    }

    onEvent(eventName, listener, once = false) {
        this.element.addEventListener(eventName, listener, { once });
    }

    offEvent(eventName, listener) {
        this.element.removeEventListener(eventName, listener);
    }
}

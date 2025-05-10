// Renderer process for chat window (windows/chat/index.mjs)
console.log("Chat window renderer script (index.mjs) loaded.");

const userAvatarSidebar = document.getElementById("user-avatar-sidebar");
const usernameSidebar = document.getElementById("username-sidebar");
const defaultAvatar = "../../assets/person.svg"; // Path to your default avatar
const channelListElement = document.querySelector(".channel-list");
let hiddenChannelsListElement = null; // To store the UL for hidden channels
let hiddenChannelsToggleElement = null; // To store the toggle element
const messageListElement = document.querySelector(".message-list"); // Get message list element
let profilesMap = new Map(); // To store user profiles
let currentChannelId = null; // Added to keep track of the current channel

async function loadAllProfiles() {
    try {
        console.log("Renderer: Attempting to fetch all profiles...");
        const { data: profiles, error } = await window.electronAPI.getAllProfiles();
        if (error) {
            console.error("Renderer: Error fetching all profiles:", error);
            return;
        }

        if (!profiles || profiles.length === 0) {
            console.log("Renderer: No profiles returned or profiles list is empty.");
            return;
        }

        profilesMap = new Map(profiles.map((p) => [p.id, p]));
        console.log("Renderer: All profiles loaded and cached:", profilesMap);
    } catch (err) {
        console.error("Renderer: Exception while fetching all profiles:", err);
    }
}

function updateUserProfileDisplay(profile) {
    if (profile) {
        console.log("Updating profile display:", profile);
        if (usernameSidebar) {
            usernameSidebar.textContent = profile.username || "User";
        }
        if (userAvatarSidebar) {
            userAvatarSidebar.src = profile.avatar_url || defaultAvatar;
            userAvatarSidebar.alt = profile.username ? `${profile.username}'s Avatar` : "User Avatar";
        }
    } else {
        console.log("No profile to display, using defaults.");
        if (usernameSidebar) {
            usernameSidebar.textContent = "User";
        }
        if (userAvatarSidebar) {
            userAvatarSidebar.src = defaultAvatar;
            userAvatarSidebar.alt = "User Avatar";
        }
    }
}

function formatTimestamp(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderSystemEventItem(message) {
    if (!messageListElement) return;
    const eventDiv = document.createElement("div");
    eventDiv.classList.add("system-event");

    const contentParagraph = document.createElement("p");
    contentParagraph.textContent = message.content || "";
    eventDiv.appendChild(contentParagraph);

    messageListElement.appendChild(eventDiv);
}

function renderMessageItem(message) {
    if (!messageListElement) return;

    const authorId = message.author_id || (message.author && message.author.id) || null;
    if (authorId === null) {
        renderSystemEventItem(message);
        return;
    }

    const profile = authorId ? profilesMap.get(authorId) : null;

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    const avatarImg = document.createElement("img");
    avatarImg.classList.add("avatar");
    avatarImg.src = (profile && profile.avatar_url) || defaultAvatar;
    avatarImg.alt = profile ? `${profile.username}'s Avatar` : "Avatar";
    messageDiv.appendChild(avatarImg);

    const messageBodyDiv = document.createElement("div");
    messageBodyDiv.classList.add("message-body");

    const messageHeaderDiv = document.createElement("div");
    messageHeaderDiv.classList.add("message-header");

    const authorSpan = document.createElement("span");
    authorSpan.classList.add("message-author");
    authorSpan.textContent = (profile && profile.username) || "Unknown User";
    messageHeaderDiv.appendChild(authorSpan);

    const timestampSpan = document.createElement("span");
    timestampSpan.classList.add("message-timestamp");
    timestampSpan.textContent = formatTimestamp(message.created_at);
    messageHeaderDiv.appendChild(timestampSpan);

    messageBodyDiv.appendChild(messageHeaderDiv);

    const messageContentDiv = document.createElement("div");
    messageContentDiv.classList.add("message-content");

    if (message.is_image_content) {
        const imageElement = document.createElement("img");
        imageElement.src = message.content;
        imageElement.alt = "User uploaded image"; // Or a more descriptive alt text if available
        imageElement.classList.add("message-image"); // Add a class for styling
        imageElement.addEventListener("click", () => openImageModal(message.content));
        messageContentDiv.appendChild(imageElement);
    } else {
        const contentParagraph = document.createElement("p");
        contentParagraph.textContent = message.content || "";
        messageContentDiv.appendChild(contentParagraph);
    }

    messageBodyDiv.appendChild(messageContentDiv);

    messageDiv.appendChild(messageBodyDiv);
    messageListElement.appendChild(messageDiv);
}

// Function to open the image modal
function openImageModal(imageUrl) {
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("expanded-image");
    modalImage.src = imageUrl;
    modal.style.display = "flex"; // Use flex to utilize centering styles
}

// Function to close the image modal
function closeImageModal() {
    const modal = document.getElementById("image-modal");
    modal.style.display = "none";
}

async function loadAndDisplayMessages(channelId) {
    if (!messageListElement) {
        console.error("Message list element not found.");
        return;
    }

    if (currentChannelId && currentChannelId !== channelId) {
        console.log(`Renderer: Leaving room ${currentChannelId}`);
        await window.electronAPI.leaveChatRoom(currentChannelId);
    }

    currentChannelId = channelId; // Update current channel ID
    console.log(`Renderer: Joining room ${currentChannelId}`);
    await window.electronAPI.joinChatRoom(currentChannelId);

    // Ensure profiles are loaded before trying to display messages
    if (profilesMap.size === 0) {
        await loadAllProfiles(); // Make sure profiles are loaded
    }

    messageListElement.innerHTML = '<div class="message-list-info">Loading messages...</div>'; // Clear and show loading

    try {
        console.log(`Fetching messages for channel ID: ${channelId}`);
        const { data: messages, error } = await window.electronAPI.getMessagesForChannel(channelId);

        messageListElement.innerHTML = ""; // Clear loading message

        if (error) {
            console.error(`Error fetching messages for channel ${channelId}:`, error);
            messageListElement.innerHTML = '<div class="message-list-error">Failed to load messages.</div>';
            return;
        }

        if (messages && messages.length > 0) {
            console.log("Messages received:", messages);
            messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            messages.forEach((message) => renderMessageItem(message));
            messageListElement.scrollTop = messageListElement.scrollHeight; // Scroll to bottom
        } else {
            console.log("No messages in this channel or returned empty.");
            messageListElement.innerHTML = '<div class="message-list-info">No messages in this channel.</div>';
        }
    } catch (err) {
        console.error(`Exception while fetching messages for channel ${channelId}:`, err);
        messageListElement.innerHTML = '<div class="message-list-error">Error loading messages.</div>';
    }
}

function renderChannelItem(channel, listElement) {
    const listItem = document.createElement("li");
    listItem.classList.add("channel-item");
    listItem.textContent = `#${channel.name}`;
    listItem.dataset.channelId = channel.id;
    if (channel.hidden) {
        listItem.classList.add("hidden-channel-item");
    }

    listItem.addEventListener("click", async () => { // Made async
        const previouslyActiveChannelElement = document.querySelector(".sidebar .channel-item.active-channel");
        if (previouslyActiveChannelElement && previouslyActiveChannelElement.dataset.channelId !== channel.id) {
            const oldChannelId = previouslyActiveChannelElement.dataset.channelId;
            console.log(`Renderer: Leaving room ${oldChannelId} due to channel switch`);
            await window.electronAPI.leaveChatRoom(oldChannelId);
        }

        currentChannelId = channel.id;

        document.querySelectorAll(".sidebar .channel-item").forEach((i) => i.classList.remove("active-channel"));
        listItem.classList.add("active-channel");
        const chatHeader = document.querySelector(".chat-header h3");
        if (chatHeader) {
            chatHeader.textContent = listItem.textContent;
        }
        console.log(`Switched to channel: ${listItem.textContent}, ID: ${channel.id}`);
        // loadAndDisplayMessages will handle joining the new room
        loadAndDisplayMessages(channel.id);
    });
    listElement.appendChild(listItem);
    return listItem;
}

async function loadChannels() {
    if (!channelListElement) {
        console.error("Channel list element not found.");
        return;
    }
    const sidebarElement = channelListElement.parentElement;

    try {
        console.log("Attempting to fetch channels...");
        const { data: channels, error } = await window.electronAPI.getChannels();

        if (error) {
            console.error("Error fetching channels:", error);
            channelListElement.innerHTML = '<li class="channel-item-error">Failed to load channels.</li>';
            return;
        }

        channelListElement.innerHTML = "";
        if (hiddenChannelsListElement) {
            hiddenChannelsListElement.remove();
            hiddenChannelsListElement = null;
        }
        if (hiddenChannelsToggleElement) {
            hiddenChannelsToggleElement.remove();
            hiddenChannelsToggleElement = null;
        }

        if (channels && channels.length > 0) {
            console.log("Channels received:", channels);

            const visibleChannels = channels
                .filter((ch) => !ch.hidden)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
            const hiddenChannels = channels
                .filter((ch) => ch.hidden)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            visibleChannels.forEach((channel, index) => {
                const item = renderChannelItem(channel, channelListElement);
                if (index === 0 && hiddenChannels.length === 0) {
                    item.classList.add("active-channel");
                    const chatHeader = document.querySelector(".chat-header h3");
                    if (chatHeader) chatHeader.textContent = item.textContent;
                }
            });

            if (hiddenChannels.length > 0) {
                hiddenChannelsToggleElement = document.createElement("div");
                hiddenChannelsToggleElement.classList.add("hidden-channels-toggle");
                hiddenChannelsToggleElement.textContent = "Show hidden channels";
                sidebarElement.insertBefore(hiddenChannelsToggleElement, channelListElement.nextSibling);

                hiddenChannelsListElement = document.createElement("ul");
                hiddenChannelsListElement.classList.add("channel-list", "hidden-channels-list");
                hiddenChannelsListElement.style.display = "none";
                sidebarElement.insertBefore(hiddenChannelsListElement, hiddenChannelsToggleElement.nextSibling);

                hiddenChannels.forEach((channel) => {
                    renderChannelItem(channel, hiddenChannelsListElement);
                });

                hiddenChannelsToggleElement.addEventListener("click", () => {
                    const isHidden = hiddenChannelsListElement.style.display === "none";
                    hiddenChannelsListElement.style.display = isHidden ? "block" : "none";
                    hiddenChannelsToggleElement.textContent = isHidden
                        ? "Hide hidden channels"
                        : "Show hidden channels";
                });
            }

            if (!document.querySelector(".channel-item.active-channel")) {
                const firstChannelElement =
                    channelListElement.querySelector(".channel-item") ||
                    (hiddenChannelsListElement && hiddenChannelsListElement.querySelector(".channel-item"));
                if (firstChannelElement) {
                    firstChannelElement.classList.add("active-channel");
                    const chatHeader = document.querySelector(".chat-header h3");
                    if (chatHeader) chatHeader.textContent = firstChannelElement.textContent;
                    const initialChannelId = firstChannelElement.dataset.channelId;
                    if (initialChannelId) {
                        loadAndDisplayMessages(initialChannelId);
                    }
                }
            }
        } else {
            console.log("No channels available or returned empty.");
            channelListElement.innerHTML = '<li class="channel-item-info">No channels available.</li>';
        }
    } catch (err) {
        console.error("Exception while fetching channels:", err);
        channelListElement.innerHTML = '<li class="channel-item-error">Error loading channels.</li>';
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Chat DOM fully loaded and parsed");

    await loadAllProfiles(); // Load profiles as soon as DOM is ready

    try {
        const profile = await window.electronAPI.getStoreValue("currentUserProfile");
        updateUserProfileDisplay(profile);
    } catch (error) {
        console.error("Error fetching initial user profile:", error);
        updateUserProfileDisplay(null);
    }

    await loadChannels();

    // Listen for new messages from the main process
    window.electronAPI.onNewMessage((message) => {
        console.log("Renderer: Received new message object:", message);
        if (message && message.payload && message.payload.payload && message.payload.payload.message) {
            const actualMessage = message.payload.payload.message;
            console.log("Renderer: Actual message content:", actualMessage);

            // Check if the message belongs to the currently active channel
            if (actualMessage.room_id === currentChannelId) {
                // Ensure profiles are loaded if not already
                if (profilesMap.size === 0) {
                    loadAllProfiles().then(() => {
                        renderMessageItem(actualMessage);
                        messageListElement.scrollTop = messageListElement.scrollHeight; // Scroll to bottom
                    });
                } else {
                    renderMessageItem(actualMessage);
                    messageListElement.scrollTop = messageListElement.scrollHeight; // Scroll to bottom
                }
            } else {
                console.log(
                    `Renderer: New message for room ${actualMessage.room_id}, but current room is ${currentChannelId}. Not rendering.`
                );
                // Optionally, add a notification for messages in other channels
            }
        } else {
            console.warn("Renderer: Received message in unexpected format:", message);
        }
    });

    const sendButton = document.querySelector(".send-button");
    const messageInput = document.querySelector(".message-input");
    if (sendButton && messageInput) {
        const sendMessage = async () => {
            const messageText = messageInput.value.trim();
            if (messageText) {
                const activeChannelElement = document.querySelector(".channel-item.active-channel");
                if (!activeChannelElement || !activeChannelElement.dataset.channelId) {
                    console.error("No active channel selected or channel ID missing.");
                    // Optionally, inform the user (e.g., alert("Please select a channel first."))
                    return;
                }
                const channelId = activeChannelElement.dataset.channelId;

                console.log(`Sending message: "${messageText}" to channel ID: ${channelId}`);
                try {
                    const result = await window.electronAPI.sendChatMessage(channelId, messageText);
                    if (result && result.error) {
                        console.error("Failed to send message:", result.error);
                        // Optionally, inform the user about the failure
                    } else {
                        console.log("Message sent successfully:", result.data);
                        messageInput.value = ""; // Clear input field on success
                        // Optionally, refresh messages for the current channel
                        // loadAndDisplayMessages(channelId);
                    }
                } catch (error) {
                    console.error("Error sending IPC message to main process:", error);
                }
            }
        };

        sendButton.addEventListener("click", sendMessage);

        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    const modal = document.getElementById("image-modal");
    const closeModalButton = document.querySelector(".close-modal-button");

    if (modal) {
        modal.addEventListener("click", (event) => {
            // If the click is on the overlay itself (not the image), close the modal
            if (event.target === modal) {
                closeImageModal();
            }
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeImageModal);
    }
});

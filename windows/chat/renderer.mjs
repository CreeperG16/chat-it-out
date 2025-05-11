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
let uploadedImageUrl = null; // To store the URL of the image to be sent

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

async function uploadImageFile(file) {
    if (!file) {
        console.error("No file provided for upload.");
        return { data: null, error: "No file provided." };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        // We'll need to define 'uploadImage' in preload.mjs and handle it in main.mjs
        const result = await window.electronAPI.uploadImage({
            buffer: arrayBuffer, // ArrayBuffer is serializable by Electron's IPC
            type: file.type,
            name: file.name,
        });

        if (result && result.error) {
            console.error("Error uploading image:", result.error);
            return { data: null, error: result.error };
        }

        console.log("Image uploaded successfully:", result.data);
        return { data: result.data, error: null };
    } catch (error) {
        console.error("Exception during image upload:", error);
        return { data: null, error: error.message || "Exception during upload." };
    }
}

function showImagePreview(imageUrl) {
    const previewArea = document.getElementById("image-preview-area");
    const previewImg = document.getElementById("image-preview-img");
    const messageInput = document.querySelector(".message-input"); // Get the main message input

    uploadedImageUrl = imageUrl; // Store the URL for sending later
    previewImg.src = imageUrl;
    previewArea.style.display = "flex";

    // Add click listener to open preview in modal
    previewImg.onclick = () => openImageModal(uploadedImageUrl);

    if (messageInput) {
        messageInput.placeholder = "Add an optional caption..."; // Change placeholder
        messageInput.focus(); // Focus the main input for caption
    }
}

function hideImagePreview() {
    const previewArea = document.getElementById("image-preview-area");
    const imageUploadInput = document.getElementById("image-upload-input");
    const messageInput = document.querySelector(".message-input"); // Get the main message input
    const previewImg = document.getElementById("image-preview-img"); // Get the preview image

    uploadedImageUrl = null;
    previewArea.style.display = "none";
    if (previewImg) {
        previewImg.onclick = null; // Remove click listener when hiding
    }
    if (imageUploadInput) imageUploadInput.value = ""; // Reset file input
    if (messageInput) {
        messageInput.placeholder = "Type a message in #general..."; // Reset placeholder
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
            if (messageText || uploadedImageUrl) {
                const activeChannelElement = document.querySelector(".channel-item.active-channel");
                if (!activeChannelElement || !activeChannelElement.dataset.channelId) {
                    console.error("No active channel selected or channel ID missing.");
                    // Optionally, inform the user (e.g., alert("Please select a channel first."))
                    return;
                }
                const channelId = activeChannelElement.dataset.channelId;

                // Check if there's an image to send
                if (uploadedImageUrl) {
                    console.log(`Sending image message: "${uploadedImageUrl}" to channel ID: ${channelId}`);
                    try {
                        const imageMessageResult = await window.electronAPI.sendChatMessage(
                            channelId,
                            uploadedImageUrl,
                            true // is_image_content = true
                        );
                        if (imageMessageResult && imageMessageResult.error) {
                            console.error("Failed to send image message:", imageMessageResult.error);
                            alert(`Failed to send image message: ${JSON.stringify(imageMessageResult.error)}`);
                        }
                        // Send caption if provided (from the main message input)
                        const captionText = messageInput.value.trim(); // Use main message input for caption
                        if (captionText) {
                            console.log(`Sending caption: "${captionText}" to channel ID: ${channelId}`);
                            const captionMessageResult = await window.electronAPI.sendChatMessage(
                                channelId,
                                captionText,
                                false // is_image_content = false
                            );
                            if (captionMessageResult && captionMessageResult.error) {
                                console.error("Failed to send caption message:", captionMessageResult.error);
                                alert(`Failed to send caption: ${JSON.stringify(captionMessageResult.error)}`);
                            }
                        }
                    } catch (error) {
                        console.error("Error sending image/caption IPC to main process:", error);
                        alert(`Error sending image/caption: ${error.message}`);
                    }
                    hideImagePreview(); // Hide preview after sending
                    messageInput.value = ""; // Clear main text input as well
                    return; // Don't send the text input content as a separate message if an image was sent
                }

                // Regular text message sending
                if (messageText) {
                    console.log(`Sending message: "${messageText}" to channel ID: ${channelId}`);
                    try {
                        const result = await window.electronAPI.sendChatMessage(channelId, messageText, false);
                        if (result && result.error) {
                            console.error("Failed to send message:", result.error);
                            // Optionally, inform the user about the failure
                        } else {
                            console.log("Message sent successfully:", result.data);
                            messageInput.value = ""; // Clear input field on success
                        }
                    } catch (error) {
                        console.error("Error sending IPC message to main process:", error);
                    }
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

    // Temporary: Event listener for image upload input
    const imageUploadInput = document.getElementById("image-upload-input");
    if (imageUploadInput) {
        imageUploadInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log(`Selected file: ${file.name}, type: ${file.type}, size: ${file.size}`);
                const uploadButton = document.querySelector(".upload-button");
                if (uploadButton) uploadButton.classList.add("uploading");

                const result = await uploadImageFile(file);

                if (uploadButton) uploadButton.classList.remove("uploading");

                if (result.error) {
                    console.error("Upload failed:", result.error);
                    alert(`Image upload failed: ${JSON.stringify(result.error)}`);
                    imageUploadInput.value = ""; // Reset file input on failure
                } else {
                    console.log("Upload successful, showing preview:", result.data);
                    if (result.data?.url) {
                        showImagePreview(result.data.url);
                    } else {
                        console.error("Upload result did not contain a valid image URL.", result.data);
                        alert("Upload succeeded, but no image URL was returned.");
                        imageUploadInput.value = ""; // Reset file input
                    }
                    // Message is not sent here anymore, only preview is shown
                }
                // imageUploadInput.value = ""; // Resetting is now handled in showImagePreview or on failure
            }
        });
    }

    const cancelImageUploadButton = document.getElementById("cancel-image-upload-button");
    if (cancelImageUploadButton) {
        cancelImageUploadButton.addEventListener("click", hideImagePreview);
    }

    // Listen for paste events for image uploading
    document.addEventListener("paste", async (event) => {
        if (uploadedImageUrl) {
            // If an image is already in preview, don't try to paste another one on top.
            // The paste event might be on the messageInput, which is fine for text.
            if (event.target === messageInput) return;
        }

        const items = (event.clipboardData || event.originalEvent.clipboardData)?.items;
        if (!items) return;

        let imageFile = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (imageFile) {
            event.preventDefault(); // Prevent default paste action if we're handling an image
            console.log(`Pasted image: ${imageFile.name}, type: ${imageFile.type}, size: ${imageFile.size}`);
            
            // Show visual feedback (optional, similar to file input)
            const uploadButton = document.querySelector(".upload-button");
            if (uploadButton) uploadButton.classList.add("uploading");

            const result = await uploadImageFile(imageFile);

            if (uploadButton) uploadButton.classList.remove("uploading");

            if (result.error) {
                console.error("Pasted image upload failed:", result.error);
                alert(`Pasted image upload failed: ${JSON.stringify(result.error)}`);
            } else {
                console.log("Pasted image upload successful, showing preview:", result.data);
                if (result.data?.url) {
                    showImagePreview(result.data.url);
                } else {
                    console.error("Pasted image upload result did not contain a valid image URL.", result.data);
                    alert("Pasted image upload succeeded, but no image URL was returned.");
                }
            }
        }
    });
});

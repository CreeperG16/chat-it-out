const notification_css = /* css */ `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.toast-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #333;
  color: white;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  opacity: 0; /* Start hidden */
  transform: translateX(100%); /* Start off-screen */
  display: flex; /* Align items for close button and content */
  align-items: flex-start; /* Align items to the top */
  max-width: 350px; /* Maximum width for the notification */
  overflow-wrap: break-word; /* Ensure long words break and wrap */
  /* cursor: pointer; Will be set by JS if onClick is provided */
}

.toast-thumbnail {
  width: 50px; /* Adjust as needed */
  height: 50px; /* Adjust as needed */
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
}

.toast-notification-content {
  flex-grow: 1; /* Allow text container to take available space */
  display: flex;
  flex-direction: column; /* Stack title and body vertically */
}

.toast-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.toast-body {
  font-size: 0.9em;
}

.toast-close-button {
  background: none;
  border: none;
  color: white;
  font-size: 24px; /* Increased font size */
  font-weight: bold;
  cursor: pointer;
  padding: 5px 8px 5px 15px; /* Increased padding: Top, Right, Bottom, Left */
  line-height: 1; /* Ensure it aligns well */
  margin: -5px -8px -5px 0; /* Negative margin to counteract padding for layout, if needed, or adjust padding carefully */
  align-self: flex-start; /* Align to the top of the flex container */
}

.toast-notification.show {
  animation: slideInRight 0.5s forwards;
}

.toast-notification.hide {
  animation: slideOutRight 0.5s forwards;
}
`;

export class ToastNotification {
    constructor({ title, body, thumbnailPath, onClick, duration = 3000 }) {
        if (!body) {
            throw new Error("ToastNotification: 'body' is required.");
        }
        this.content = { title, body, thumbnailPath };
        this.onClick = onClick;
        this.duration = duration;
        this.notificationElement = null;
        this.closeButtonElement = null;
        this.durationTimeoutId = null;

        // Ensure CSS is injected only once
        if (!document.getElementById("toast-notification-styles")) {
            const styleElement = document.createElement("style");
            styleElement.id = "toast-notification-styles";
            styleElement.textContent = notification_css;
            document.head.appendChild(styleElement);
        }
    }

    async show(onElementReadyForPositioning) {
        return new Promise((resolve) => {
            this.notificationElement = document.createElement("div");
            this.notificationElement.className = "toast-notification";

            // Add thumbnail if path is provided
            if (this.content.thumbnailPath) {
                const thumbnailElement = document.createElement("img");
                thumbnailElement.className = "toast-thumbnail";
                thumbnailElement.src = this.content.thumbnailPath;
                thumbnailElement.alt = this.content.title || "Notification thumbnail";
                this.notificationElement.appendChild(thumbnailElement);
            }
            
            const mainContentContainer = document.createElement("div");
            mainContentContainer.className = "toast-notification-content";

            // Add title if provided
            if (this.content.title) {
                const titleElement = document.createElement("div"); // Or <strong>, <h4> etc.
                titleElement.className = "toast-title";
                titleElement.textContent = this.content.title;
                mainContentContainer.appendChild(titleElement);
            }

            // Add body (required)
            const bodyElement = document.createElement("div"); // Or <p>
            bodyElement.className = "toast-body";
            bodyElement.textContent = this.content.body;
            mainContentContainer.appendChild(bodyElement);
            
            this.notificationElement.appendChild(mainContentContainer);

            // Create and append close button
            this.closeButtonElement = document.createElement("button");
            this.closeButtonElement.className = "toast-close-button";
            this.closeButtonElement.innerHTML = "&times;"; // Use HTML entity for '×'
            this.notificationElement.appendChild(this.closeButtonElement);

            document.body.appendChild(this.notificationElement);
            const startHideSequence = (reason) => { // reason: 'closed_by_button', 'expired', 'clicked_body'
                if (!this.notificationElement) return; // Already cleaned up

                if (this.durationTimeoutId) {
                    clearTimeout(this.durationTimeoutId);
                    this.durationTimeoutId = null;
                }

                // Prevent further clicks if animation started
                if (this.closeButtonElement) {
                    this.closeButtonElement.disabled = true;
                }
                // Also make the main body unclickable if it was clickable
                this.notificationElement.style.cursor = 'default';

                this.notificationElement.classList.remove("show");
                this.notificationElement.classList.add("hide");

                this.notificationElement.addEventListener(
                    "animationend",
                    () => {
                        if (this.notificationElement && this.notificationElement.classList.contains("hide")) {
                            if (this.notificationElement.parentNode === document.body) {
                                document.body.removeChild(this.notificationElement);
                            }
                            this.notificationElement = null; // Clear reference
                            resolve({ reason }); // Resolve with the specific reason
                        }
                    },
                    { once: true }
                );
            };

            // Add click listener for the notification body if onClick is provided
            if (this.onClick && typeof this.onClick === 'function') {
                this.notificationElement.style.cursor = 'pointer';
                this.notificationElement.addEventListener('click', (event) => {
                    // Ensure the click is not on the close button itself or its children
                    if (event.target !== this.closeButtonElement && !this.closeButtonElement.contains(event.target)) {
                        this.onClick(); // Execute the user's callback first
                        startHideSequence('clicked_body'); // Then hide the notification
                    }
                });
            }

            this.closeButtonElement.addEventListener("click", () => {
                startHideSequence('closed_by_button');
            }, { once: true });

            if (onElementReadyForPositioning) {
                onElementReadyForPositioning();
            }

            requestAnimationFrame(() => {
                if (this.notificationElement) {
                    this.notificationElement.classList.add("show");
                }
            });

            this.durationTimeoutId = setTimeout(() => {
                startHideSequence('expired');
            }, this.duration);
        });
    }
}

export class NotificationManager {
    constructor() {
        this.activeNotifications = [];
        this.baseTopOffset = 20; // px
        this.gapBetweenNotifications = 10; // px
    }

    /**
     * @param {{ title?: string; body: string; thumbnailPath?: string; onClick?: function() }} content
     * @param {number} duration
     * @returns {Promise<{ reason: 'closed_by_button' | 'expired' | 'clicked_body' }>} 
     */
    async showNotification(content, duration = 3000) {
        // Ensure 'content' is an object, and pass it along with duration
        const toast = new ToastNotification({ ...content, duration }); 
        this.activeNotifications.push(toast);

        // Call _positionNotifications once before toast.show to set initial position.
        // The callback in toast.show will also call it, which is fine and ensures correct positioning
        // if the notification's size changes after being added to the DOM but before animating.
        this._positionNotifications();

        let result;
        try {
            // The show method will call the provided callback after the element is created
            // and in the DOM, but before the show animation.
            result = await toast.show(() => {
                this._positionNotifications(); // Re-position in case of dynamic content changes
            });
            // console.log("Notification dismissed with reason:", result); // No longer logging here
        } catch (error) {
            console.error("Error during notification lifecycle:", error);
            // Ensure removal from active list even if an error occurs during show()
            this.activeNotifications = this.activeNotifications.filter(n => n !== toast);
            this._positionNotifications(); // Re-position remaining notifications
            // Optionally, re-throw the error if the caller needs to handle it
            throw error; // Re-throwing the error so the caller is aware
        } finally {
            // This block executes after the try block (and catch, if an error occurred),
            // ensuring cleanup happens after the notification has completed its show lifecycle.
            // If an error didn't occur in show(), this is the normal cleanup path.
            // If an error did occur and was caught, we might have already cleaned up in the catch block.
            // To avoid double-filtering if an error occurred, we check if it's still in the list.
            if (this.activeNotifications.includes(toast)) {
                this.activeNotifications = this.activeNotifications.filter(n => n !== toast);
                this._positionNotifications(); // Re-position remaining notifications
            }
        }
        // An async function implicitly returns a Promise that resolves with the value returned by the function.
        return result; // Return the dismissal reason
    }

    _positionNotifications() {
        let currentTop = this.baseTopOffset;
        for (const notification of this.activeNotifications) {
            if (notification.notificationElement) {
                notification.notificationElement.style.top = currentTop + 'px';
                // Ensure the element is rendered to get its actual height
                const height = notification.notificationElement.offsetHeight;
                currentTop += height + this.gapBetweenNotifications;
            }
        }
    }
}

const EXAMPLE_PROFILE = {
    id: "72dad910-07b9-44d9-9bcc-c78b74b0a03f",
    username: "myusername",
    admin: false,
    display_colour: "#ffffff",
    bio: null,
    avatar_url: null,
    allow_password_reset: false,
    wallet_id: "f13bbb5c-5fc2-4e3f-9dcc-1ed47f043546",
    status: "room:04601fb9-f866-4499-8871-4811d6878559",
    status_last_updated: "2025-05-14T20:16:32.894268+00:00",
    notification_type: "mentions",
    flags: 0,
    identity: null,
    version: 2,
    chultra_tier: 0,
    border_colour: "#1d2258",
    theme_colours: [],
};

export class User {
    constructor(profile) {
        this.updateData(profile);
        this.isChatItOut = false;
    }

    updateData(profile) {
        /** @type {string} */ this.id = profile.id;
        /** @type {string} */ this.name = profile.username;
        /** @type {boolean} */ this.isAdmin = profile.admin;
        /** @type {string} */ this.displayColour = profile.display_colour;
        /** @type {string} */ this.avatar = profile.avatar_url;
        /** @type {string} */ this.avatarBorderColour = profile.border_colour;
        /** @type {string} */ this.bio = profile.bio;

        this.status = {
            online: false,
            /** @type {string} */ value: profile.status,
            lastUpdated: new Date(profile.status_last_updated),
        };

        this.flags = profile.flags; // TODO

        // TODO: chultra things like profile customisation
    }

    renderUsername() {
        // Create a span element with the user's name and display colour using document.createElement
        const span = document.createElement("span");
        span.style.color = this.displayColour;
        span.textContent = this.name;

        // If the user is on ChatItOut, prepend an icon
        if (this.isChatItOut) {
            const icon = document.createElement("img");
            icon.src = "../../assets/chat-it-out.svg";
            icon.alt = "ChatItOut icon";
            icon.style.width = "1em"; // Match the size of the text
            icon.style.height = "1em";
            icon.style.verticalAlign = "middle"; // Align with text
            icon.style.marginRight = "0.3em"; // Add some spacing
            span.prepend(icon);
        }

        return span;
    }

    renderAvatar() {
        // Create a container div to hold the avatar and the online indicator
        const container = document.createElement("div");
        container.style.position = "relative";
        container.style.display = "inline-block";
        // container.style.width = "40px";
        // container.style.height = "40px";
        container.style.marginRight = "10px"; // Add margin to the right of the avatar container

        // Create an img element for the user's avatar using document.createElement
        const img = document.createElement("img");
        img.src = this.avatar || "../../assets/person.svg"; // Fallback to a default avatar if none is provided
        img.alt = `${this.name}'s avatar`;
        img.style.width = "40px"; // Example size, adjust as needed
        img.style.height = "40px";
        img.style.borderRadius = "10px"; // Rounded square
        img.style.border = `2px solid ${this.avatarBorderColour}`; // Add border with defined border colour

        container.appendChild(img);

        // If the user is online, add a green circle indicator
        if (this.status.online) {
            const indicator = document.createElement("div");
            indicator.style.position = "absolute";
            indicator.style.width = "12px";
            indicator.style.height = "12px";
            indicator.style.backgroundColor = "#00cc60";
            indicator.style.borderRadius = "50%"; // Make it circular
            indicator.style.bottom = "5px";
            indicator.style.right = "-2px";
            // indicator.style.border = "1px solid #0000"; // Add a border to separate it from the avatar
            container.appendChild(indicator);
        }

        return container;
    }
}

export class UserManager {
    /** @readonly */ users = new Map();

    setUsers(profiles) {
        for (const profile of profiles) this.users.set(profile.id, new User(profile));
    }

    /**
     * @param {string} id
     * @returns {User | undefined}
     */
    getUser(id) {
        return this.users.get(id);
    }

    /**
     * @returns {User[]}
     */
    getUsers() {
        return [...this.users.values()];
    }

    /**
     * @returns {number}
     */
    userCount() {
        return this.users.size();
    }
}

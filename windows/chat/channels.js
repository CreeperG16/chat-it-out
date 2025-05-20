const EXAMPLE_CHANNEL = {
    id: "080f3272-4e79-4e68-af5c-123e868b3db0",
    name: "GENERAL",
    description: 'Room for "general" ""discussion"".',
    admin_only: false,
    position: 1,
    type: "TEXT",
    icon: null,
    hidden: false,
};

export class Channel {
    /** @readonly @type {string} */ id;
    /** @readonly @type {string} */ name;
    /** @readonly @type {string} */ description;

    /** @readonly @type {string | null} */ iconId;
    /** @readonly @type {number} */ listPosition;

    /** @readonly @type {boolean} */ adminOnly;
    /** @readonly @type {boolean} */ isHidden;

    /** @readonly @type {string} */ type; // TODO

    constructor(room) {
        this.updateData(room);
    }

    updateData(room) {
        this.id = room.id;
        this.name = room.name;
        this.description = room.description;

        this.iconId = room.icon;
        this.listPosition = room.position;

        this.adminOnly = room.adminOnly;
        this.isHidden = room.hidden;

        this.type = room.type;
    }

    lowerName() {
        return this.name.toLowerCase().replace(/\s+/g, "-");
    }
}

export class ChannelManager {
    /** @readonly @type {Map<string, Channel>} */
    channels = new Map();

    /** @readonly @type {HTMLUListElement} */
    channelListElement = document.createElement("ul");

    /** @type {string | null} */
    selectedChannel = null;

    constructor() {
        this.channelListElement.classList.add("channel-list");
    }

    setChannels(rooms) {
        for (const room of rooms) {
            this.channels.set(room.id, new Channel(room));
        }
    }

    getChannels() {
        return [...this.channels.values()].sort((a, b) => a.listPosition - b.listPosition);
    }

    getChannel(id) {
        return this.channels.get(id);
    }

    switchChannels(channelId) {
        this.selectedChannel = channelId;
        this.renderChannelList();
    }

    renderChannelList() {
        this.channelListElement.innerHTML = "";

        for (const channel of this.getChannels()) {
            if (channel.type !== "TEXT") continue;
            if (channel.isHidden) continue;

            const channelButton = document.createElement("li");
            channelButton.classList.add("channel-item");
            channelButton.textContent = channel.lowerName();
            channelButton.dataset.channelId = channel.id;

            if (this.selectedChannel === channel.id) channelButton.classList.add("active-channel");

            channelButton.addEventListener("click", () => {
                const event = new CustomEvent("channel-selected", {
                    detail: {
                        previousChannelId: this.selectedChannel,
                        channelId: channel.id,
                    },
                    composed: true,
                });

                this.switchChannels(channel.id);
                this.channelListElement.dispatchEvent(event);
            });

            this.channelListElement.appendChild(channelButton);
        }

        return this.channelListElement;
    }
}

const example_screenshot = [
    {
        // message in realtime:main (WSS)
        ref: null,
        event: "broadcast",
        payload: {
            event: "screenshot",
            payload: { target_user: "c59218d0-c7f8-4921-a914-cca3af98800c" },
            type: "broadcast",
        },
        topic: "realtime:main",
    },
    // upload the screenshot to storage
    // POST https://wkuimailekpioxrlteqk.supabase.co/storage/v1/object/screenshots/c59218-95fec9.png
    // ----
    // screenshot file name = (6 chars of userID)-(6 chars of random UUID).png
    {
        // POST https://wkuimailekpioxrlteqk.supabase.co/realtime/v1/api/broadcast
        messages: [
            {
                topic: "main",
                event: "screenshot-response",
                payload: { image_url: "c59218-95fec9.png", target_user: "c59218d0-c7f8-4921-a914-cca3af98800c" },
            },
        ],
    },
    // screenshot response in WSS (unimportant at the moment)
    {
        ref: null,
        event: "broadcast",
        payload: {
            event: "screenshot-response",
            payload: { image_url: "c59218-95fec9.png", target_user: "c59218d0-c7f8-4921-a914-cca3af98800c" },
            type: "broadcast",
        },
        topic: "realtime:main",
    },
];

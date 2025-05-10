const APIKEY = "eyJ...";
const TOKEN = "eyJ...";

/**
 * endpoints:
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/config
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/rooms
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/profiles
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/calls
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/punishments
 *
 * typing indicator:
 * https://wkuimailekpioxrlteqk.supabase.co/realtime/v1/api/broadcast -> POST
 *  - {"messages":[{"topic":"room:080f3272-4e79-4e68-af5c-123e868b3db0","event":"typing","payload":{"username":"Tom","timestamp":1746650531187}}]}
 *
 * message sending:
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages -> POST
 *  - {"room_id":"080f3272-4e79-4e68-af5c-123e868b3db0","author_id":"c59218d0-c7f8-4921-a914-cca3af98800c","content":"that would be cool too"}
 *
 * room status (?):
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/rpc/status -> POST
 *  - {"user_id":"c59218d0-c7f8-4921-a914-cca3af98800c","status_text":"room:080f3272-4e79-4e68-af5c-123e868b3db0"}
 *  response: [{"id":"c59218d0-c7f8-4921-a914-cca3af98800c","username":"Tom","display_colour":"#ffffff","avatar_url":"https://wkuimailekpioxrlteqk.supabase.co/storage/v1/object/public/avatars/c59218d0-c7f8-4921-a914-cca3af98800c-0.22196935208320712.png","bio":"No add yet, bio one here!","status":"room:080f3272-4e79-4e68-af5c-123e868b3db0","status_last_updated":"2025-05-08T06:36:38.612371+00:00","flags":16}]
 *
 * tax details:
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/rpc/get_tax_details -> POST
 *  response: {"total_earnt":1,"total_spent":0,"taxable_income":0,"tax_groups":{},"taxes":{"ADMIN": 0, "OTHER": 0, "SUGAR": 0, "TITHE": 10, "INCOME": 0, "SERVICE": 15, "SNOOKER": 0, "CHATTING": 46, "DELIVERY": 1, "LOITERING": 0, "!ADMIN_BRACKET": 0, "!INCOME_BRACKET": 0, "!LOITERING_BRACKET": 0.5},"total_taxes":72,"who_id":"c59218d0-c7f8-4921-a914-cca3af98800c"}
 *
 * calls (?):
 * https://wkuimailekpioxrlteqk.supabase.co/rest/v1/calls?select=*,caller:caller_id(*),callee:callee_id(*)&order=created_at.asc
 *
 * WSS: wss://wkuimailekpioxrlteqk.supabase.co/realtime/v1/websocket? apikey=eyJ...&vsn=1.0.0
 */

const URL = "https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages";

async function main() {
    const res = await fetch(URL + "?select=*", {
        headers: {
            apiKey: APIKEY,
            Authorization: "Bearer " + TOKEN,
        },
    });
    if (!res.ok) {
        console.error("not ok");
        console.log(res.status, res.statusText);
        return;
    }

    const data = await res.json();

    console.log(data);

    // console.log("\ntest");
    // const r = await fetch("https://wkuimailekpioxrlteqk.supabase.co/rest/v1/messages", {
    //     method: "POST",
    //     headers: {
    //         apiKey: APIKEY,
    //         Authorization: "Bearer " + TOKEN,
    //         "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    //         "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //         room_id: "080f3272-4e79-4e68-af5c-123e868b3db0",
    //         author_id: "c59218d0-c7f8-4921-a914-cca3af98800c",
    //         content: "ok i can do something with this",
    //     }),
    // });

    // if (!r.ok) {
    //     console.error("not ok");
    //     console.log(r.status, r.statusText);
    //     return;
    // }

    // console.log("Sent?", r.status, r.statusText);
}

main();

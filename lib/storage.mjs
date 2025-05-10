import { config } from "dotenv";
config();

import FormData from "form-data";
import { createHash } from "node:crypto";

const BASE_URL = "https://wkuimailekpioxrlteqk.supabase.co";
const API_KEY = process.env.API_KEY;

function hashFile({ data }) {
    const hash = createHash("sha256").update(data).digest();
    return hash.toString("hex");
}

/**
 * @param {{
 *   data: Blob;
 *   bucket: string;
 *   storagePath: string;
 *   accessToken: string;
 *   upsert: boolean;
 * }} param0
 * @returns
 */
async function uploadFile({ data, bucket, storagePath, accessToken, upsert = false }) {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", data, { filename: storagePath, contentType: data.type });

    const uploadUrl = `${BASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            ...form.getHeaders(),
            apiKey: API_KEY,
            Authorization: "Bearer " + accessToken,
            "x-upsert": upsert.toString(),
        },
        body: form,
    });

    if (!res.ok) {
        return {
            data: null,
            error: {
                message: "Failed to upload file to storage",
                details: { status: res.status, statusText: res.statusText },
            },
        };
    }

    const resData = await res.json();
    return { data: resData, error: null };
}

/**
 * @param {{ data: Blob; accessToken: string; upsert: boolean }} param0
 * @returns
 */
async function uploadHashedImage({ data, accessToken, upsert = false }) {
    const imageHash = hashFile(data);
    const extension = data.type.split("/")[1];

    const result = await uploadFile({
        data,
        bucket: "images",
        storagePath: "hashed/" + imageHash + "." + extension,
        accessToken,
        upsert,
    });

    return result;
}

export { hashFile, uploadFile, uploadHashedImage };

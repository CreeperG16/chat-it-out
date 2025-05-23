import { SUPABASE_ANON_KEY as API_KEY } from "./constants.js";
import FormData from "form-data";
import { createHash } from "node:crypto";

const BASE_URL = "https://wkuimailekpioxrlteqk.supabase.co";

function hashFile(buffer) {
    const hash = createHash("sha256").update(buffer).digest();
    return hash.toString("hex");
}

async function checkIfUploaded({ bucket, storagePath, accessToken }) {
    const fileUrl = `${BASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    const res = await fetch(fileUrl, {
        method: "HEAD",
        apikey: API_KEY,
        Authorization: "Bearer " + accessToken,
    });

    return res.ok;
}

/**
 * @param {{
 *   data: Buffer;
 *   bucket: string;
 *   storagePath: string;
 *   accessToken: string;
 *   upsert: boolean;
 *   contentType: string;
 * }} param0
 * @returns
 */
async function uploadFile({ data, bucket, storagePath, accessToken, upsert = false, contentType }) {
    const uploadUrl = `${BASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    const isFileUploaded = await checkIfUploaded({ bucket, storagePath, accessToken });
    if (isFileUploaded && !upsert) {
        console.log("File already found in the cloud, no need to upload it again");
        return { data: { url: uploadUrl }, error: null };
    }

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", data, { filename: storagePath, contentType: contentType });

    const params = {
        method: "POST",
        headers: {
            ...form.getHeaders(),
            apiKey: API_KEY,
            Authorization: "Bearer " + accessToken,
            "x-upsert": upsert.toString(),
        },
        body: form.getBuffer(),
    };

    const res = await fetch(uploadUrl, params);

    if (!res.ok) {
        return {
            data: null,
            error: {
                message: "Failed to upload file to storage",
                details: { status: res.status, statusText: res.statusText },
            },
        };
    }

    // const resData = await res.json();
    return { data: { url: uploadUrl }, error: null };
}

/**
 * @param {{ fileBuffer: Buffer; mimeType: string; accessToken: string; upsert?: boolean }} param0
 * @returns
 */
async function uploadHashedImage({ fileBuffer, mimeType, accessToken, upsert = false }) {
    const imageHash = hashFile(fileBuffer);
    const extensionParts = mimeType.split("/");
    const extension = extensionParts.length > 1 ? extensionParts[1] : "bin";

    const { data, error } = await uploadFile({
        data: fileBuffer,
        bucket: "images",
        storagePath: "hashed/" + imageHash + "." + extension,
        accessToken,
        upsert,
        contentType: mimeType,
    });

    if (error) return { data: null, error };
    return { data: { ...data, hash: imageHash }, error: null };
}

export { hashFile, uploadFile, uploadHashedImage };

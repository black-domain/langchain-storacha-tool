import { CID } from 'multiformats/cid';
import { CarReader } from '@ipld/car';
import { importDAG } from '@ucanto/core/delegation';

export const defaultGatewayUrl = import.meta.VITE_GATEWAY_URL;

export const getCIDsFromMessage = (message: string) => {
    if (!message) {
        return [];
    }

    // Patterns for potential CIDs:
    // - v0 CIDs start with Qm and are 46 characters in base58
    // - v1 CIDs commonly start with b for various base encodings (often bafy, bafk, etc.)
    const cidPattern = /(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{1,})/g;
    const matches = message.match(cidPattern);
    const cids: string[] = [];

    if (matches) {
        for (const match of matches) {
            try {
                const cid = CID.parse(match);
                // Accept both v0 and v1 CIDs
                if (cid.version === 0 || cid.version === 1) {
                    cids.push(cid.toString());
                }
            } catch (error) {
                // We can ignore this error as it's not a valid CID
            }
        }
    }
    return cids;
}

export const fetchIPFSData = async (url: string) => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("Content-Type");
        let data;

        if (contentType?.includes("application/json")) {
            data = await response.json();
        } else if (contentType?.includes("text/plain")) {
            data = await response.text();
        } else {
            data = await response.blob();
        }
        return data;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

/**
 * Parses a delegation from a base64 encoded CAR file
 * @param data - The base64 encoded CAR file
 * @returns The parsed delegation
 */
export const parseDelegation = async () => {
    const response  = await fetch('proof.car');
    const buff = await response.arrayBuffer();
    const bytes = new Uint8Array(buff);
    const blocks = []
    const reader = await CarReader.fromBytes(bytes);
    for await (const block of reader.blocks()) {
        blocks.push(block)
    }
    // @ts-ignore
    return importDAG(blocks);
}

export const extractThought = (agentOutput: string) => {
    const thoughtMatch = agentOutput.match(/Thought: .+/);
    if (thoughtMatch) return thoughtMatch[0];

    return agentOutput.split('\n')
        .find(line => line.startsWith('Thought:')) || "";
}
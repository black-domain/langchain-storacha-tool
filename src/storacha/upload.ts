import { z } from "zod";
import { validateStorageClientConfig } from "./environments";
import { defaultGatewayUrl } from "./utils";
import { createStorageClient } from "./storage";
import { StorachaBaseTool, StorachaBaseToolParams } from "./base.ts";

export class StorachaUpload extends StorachaBaseTool {
    name = "storacha_upload";
    description = "Use this action when the user wants to upload a file to Storacha distributed storage network.";

    schema = z.object({
        attachment: z.object({
            url: z.string(),
            title: z.string(),
            contentType: z.string(),
        }),
    });

    constructor(fields?: StorachaBaseToolParams) {
        super(fields);
    }

    private async prepareFiles(attachment: z.infer<typeof this.schema>["attachment"]) {
        const response = await fetch(attachment.url);
        const fileContent = await response.arrayBuffer();
        const blob = new Blob([new Uint8Array(fileContent)], { type: attachment.contentType });
        return new File([blob], attachment.title, { type: attachment.contentType });
    }

    async _call(params: z.output<typeof this.schema>): Promise<string> {
        const { attachment } = params;
        const baseResponse = {
            url: "",
            cid: "",
        };

        if (!attachment?.url) {
            return JSON.stringify({
                ...baseResponse,
                status: "error",
                message: "No file provided for upload",
            });
        }

        try {
            const config = await validateStorageClientConfig();
            const storageClient = await createStorageClient(config);

            if (!storageClient) {
                return JSON.stringify({
                    ...baseResponse,
                    status: "error",
                    message: "Failed to initialize storage client",
                });
            }

            const file = await this.prepareFiles(attachment);

            const directoryLink = await storageClient.uploadFile(file, {
                retries: 3,
                concurrentRequests: 3,
                pieceHasher: undefined,
            });

            const gatewayUrl = config.GATEWAY_URL || defaultGatewayUrl;
            const cid = directoryLink.link().toString();
            const ipfsUrl = `${gatewayUrl}/ipfs/${cid}`;

            return JSON.stringify({
                status: "success",
                message: "Files uploaded successfully to IPFS",
                url: ipfsUrl,
                cid: cid,
            });

        } catch (error) {
            return JSON.stringify({
                ...baseResponse,
                status: "error",
                message: error instanceof Error ? error.message : "Failed to upload files",
            });
        }
    }
}

export type UploadSchema = {
    url: string;
    title: string;
    contentType: string;
};
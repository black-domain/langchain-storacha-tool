import { z } from "zod";
import { validateStorageClientConfig } from "./environments";
import { defaultGatewayUrl } from "./utils";
import { StorachaBaseTool, StorachaBaseToolParams } from "./base.ts";

export class StorachaRetrieve extends StorachaBaseTool {
    name = "storacha_retrieve";
    description = "Use this action when the user wants to retrieve a file from Storacha distributed storage network based on a CID.";

    schema = z.object({
        cid: z.string().min(1, "CID cannot be empty")
    });

    constructor(fields?: StorachaBaseToolParams) {
        super(fields);
    }

    async _call(params: z.output<typeof this.schema>): Promise<string> {
        const { cid } = params;
        if (cid.length === 0) {
            return "You didn't provide any CID to retrieve the content.";
        }

        try {
            const config = await validateStorageClientConfig();
            const gatewayUrl = config.GATEWAY_URL || defaultGatewayUrl;
            const ipfsUrl = `${gatewayUrl}/ipfs/${cid}`

            return JSON.stringify({
                status: "success",
                message: "The file has been successfully retrieved from IPFS",
                url: ipfsUrl,
            });

        } catch (error) {
            console.error("Error during retrieve file(s) from storage:", error);
            throw new Error(`Failed to retrieve files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export type RetrieveSchema = {
    cid: string;
};

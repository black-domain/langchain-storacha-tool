import { StructuredTool } from "@langchain/core/tools";

export interface StorachaBaseToolParams {
  credentials?: {
    storachaPrivateKey?: string;
  };
}

export abstract class StorachaBaseTool extends StructuredTool {
  name = "Storacha";

  description = "Super h🔥t decentralized data at scale.";

  protected params: StorachaBaseToolParams;

  constructor(
      {credentials}: StorachaBaseToolParams = {
        credentials: {
          storachaPrivateKey: import.meta.env.VITE_STORACHA_AGENT_PRIVATE_KEY,
        },
      }
  ) {
    super(...arguments);
    if (!credentials?.storachaPrivateKey) {
      throw new Error("Agent private key is missing from the storage client configuration");
    }
    this.params = {credentials};
  }
}

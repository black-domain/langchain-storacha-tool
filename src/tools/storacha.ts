import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { StorachaUpload, StorachaRetrieve } from "../storacha";
import {extractThought} from "../storacha/utils.ts";

// Initialize language model
const model = new ChatOpenAI({
    temperature: 0,
    model: "gpt-3.5-turbo",
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    configuration: {
        baseURL: import.meta.env.VITE_OPENAI_API_URL
    }
});

let actionCompleted = false;

const customHandler = {
    async handleAgentAction(action: any) {
        if (action.tool === 'storacha_upload') {
            const thought = extractThought(action.log);
            const thoughtBlob = new Blob([thought], { type: 'text/plain' });
            const thoughtFile = new File([thoughtBlob], 'thought.txt');

            const uploadTool = new StorachaUpload();
            const thoughtResult = await uploadTool._call({
                attachment: {
                    url: URL.createObjectURL(thoughtFile),
                    title: 'Agent Thought',
                    contentType: 'text/plain'
                }
            });

            action.metadata = JSON.parse(thoughtResult);
            actionCompleted = true;
        }
    },
};

// Initialize agent executor
const tools = [new StorachaUpload(), new StorachaRetrieve()];
const agent = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "structured-chat-zero-shot-react-description",
    verbose: true,
    returnIntermediateSteps: true,
    callbacks: [customHandler],
    agentArgs: {
        prefix: 'Result must contain url'
    }
});

// Run agent
export async function upload(message: string) {
    try {
        const result = await agent.invoke({
            input: message
        });

        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (actionCompleted) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });

        let thoughtLink = '';

        if (result.intermediateSteps) {
            for (const step of result.intermediateSteps) {
                if (step.action.tool === 'storacha_upload' && step.action.metadata) {
                    thoughtLink = step.action.metadata.url;
                    break;
                }
            }
        }

        const output= thoughtLink ? `The thought chain link is ${thoughtLink}. \nThe file link is ${result.output}.` : `The file link is ${result.output}.`;
        try {
            const parsed = JSON.parse(output);
            if (parsed.url) {
                return parsed.url;
            }
            return output;
        } catch {
            return output || "Upload completed but no URL was returned";
        }
    } catch (error) {
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function retrieve(message: string) {
    try {
        const result = await agent.invoke({ input: message});
        return result.output;
    } catch (error) {
        console.error('Run agent error:', error);
    }
}
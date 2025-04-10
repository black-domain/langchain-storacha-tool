import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { StorachaUpload, StorachaRetrieve } from "../storacha";
import { extractThought } from "../storacha/utils.ts";

// Initialize language model
const model = new ChatOpenAI({
    temperature: 0,
    model: "gpt-3.5-turbo",
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    configuration: {
        baseURL: import.meta.env.VITE_OPENAI_API_URL
    },
    callbacks: [{
        async handleLLMEnd(output: any) {
            const thought = extractThought(output.generations[0][0].text);
            const thoughtBlob = new Blob([thought], { type: 'text/plain' });
            const thoughtFile = new File([thoughtBlob], 'thought.txt');
            const uploadTool = new StorachaUpload();
            const thoughtResult = await uploadTool._call({
                attachment: {
                    blobURL: URL.createObjectURL(thoughtFile),
                    title: 'Agent Thought',
                    contentType: 'text/plain'
                }
            });
            thoughtLink = JSON.parse(thoughtResult).url;
            actionCompleted = true;
        },
    }],
});

// Initialize agent executor
const tools = [new StorachaUpload(), new StorachaRetrieve()];
let agent : any;
let actionCompleted = false;
let thoughtLink = "";
const thoughtOutputStr = "The thought chain link for this session:";

async function initializeAgent() {
    // Initialize agent executor with fresh context for each upload
    agent = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "structured-chat-zero-shot-react-description",
        verbose: true,
        returnIntermediateSteps: true,
        agentArgs: {
            prefix: 'Result must contain url'
        }
    });
}

export async function upload(message: string) {
    try {
        // Reset flags and thoughtLink before each upload
        actionCompleted = false;
        thoughtLink = "";

        // Ensure agent is initialized for the new upload
        if (!agent) {
            await initializeAgent();
        }

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

        const output = `${thoughtOutputStr} ${thoughtLink}. \nThe file link is ${result.output}`;
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
        // Ensure agent is initialized for the new upload
        if (!agent) {
            await initializeAgent();
        }
        const result = await agent.invoke({ input: message });
        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (actionCompleted) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
        return `${thoughtOutputStr} ${thoughtLink}. \n${result.output}`;
    } catch (error) {
        console.error('Run agent error:', error);
        return 'Run agent error';
    }
}

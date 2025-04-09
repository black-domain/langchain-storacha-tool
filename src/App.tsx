import React, {useState, useRef, useEffect} from "react";
import {upload, retrieve} from "./tools/storacha.ts";
import {fetchIPFSData, getCIDsFromMessage} from "./storacha/utils.ts";
import './App.css';

type Message = {
    id: string;
    sender: 'user' | 'ai';
    content: string | React.ReactNode;
    isFile?: boolean;
    fileName?: string;
    fileUrl?: string;
    loading?: boolean;
};

const App = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            content: 'Hello! Upload files or ask questions about your stored content.'
        }
    ]);

    const [inputValue, setInputValue] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() && !file) return;
        const userMessageId = Date.now().toString();
        setMessages(prev => [
            ...prev,
            {
                id: userMessageId,
                sender: 'user',
                content: inputValue,
                ...(file && {
                    isFile: true,
                    fileUrl: URL.createObjectURL(file),
                    fileName: file.name
                })
            }
        ]);

        setInputValue("");
        const currentFile = file;
        setFile(null);

        const loadingMessageId = (Date.now() + 1).toString();
        setMessages(prev => [
            ...prev,
            {
                id: loadingMessageId,
                sender: 'ai',
                content: "Processing...",
                loading: true
            }
        ]);

        try {
            let response;
            if (currentFile) {
                const fileUrl = URL.createObjectURL(currentFile);
                response = await upload(`upload this file: ${fileUrl}`);
            } else {
                response = await retrieve(inputValue);
                const cids = getCIDsFromMessage(response);
                if (cids.length > 0) {
                    const url = `${import.meta.env.VITE_GATEWAY_URL}/ipfs/${cids[0]}`;
                    const data = await fetchIPFSData(url);

                    let content: React.ReactNode;
                    if (typeof data === 'object' && !(data instanceof Blob)) {
                        content = (
                            <div className="overflow-hidden">
                                <pre className="bg-gray-700 p-3 rounded-lg overflow-x-auto text-sm">
                                  {JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        );
                    } else if (typeof data === 'string') {
                        content = <div className="whitespace-pre-wrap text-sm break-words">{data}</div>;
                    } else if (data instanceof Blob) {
                        if (data.type.startsWith('image/')) {
                            const objectUrl = URL.createObjectURL(data);
                            content = <img src={objectUrl} alt="IPFS Image"
                                           className="max-w-full h-auto rounded-lg max-h-80"/>;
                        } else {
                            const objectUrl = URL.createObjectURL(data);
                            content = (
                                <a
                                    href={objectUrl}
                                    download="file"
                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                    Download File
                                </a>
                            );
                        }
                    }

                    setMessages(prev => prev.map(msg =>
                        msg.id === loadingMessageId
                            ? {...msg, content, loading: false}
                            : msg
                    ));
                    return;
                }
            }

            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessageId
                    ? {...msg, content: response, loading: false}
                    : msg
            ));
        } catch (error) {
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessageId
                    ? {
                        ...msg,
                        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
                        loading: false
                    }
                    : msg
            ));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-950 overflow-hidden">
            <div className="flex justify-center items-center min-h-screen p-4">
                <div className="flex flex-col h-[90vh] w-full max-w-4xl mx-auto bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                    {/* Header */}
                    <div className="bg-gray-800 p-4 border-b border-gray-700">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                Storacha AI
                            </span>
                        </h1>
                    </div>

                    {/* Chat container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[90%] rounded-lg p-4 ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'}`}
                                >
                                    {message.loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce delay-75"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce delay-150"></div>
                                        </div>
                                    ) : (
                                        <>
                                            {message.isFile && (
                                                message.fileName && message.fileName.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                    <img
                                                        src={message.fileUrl}
                                                        alt="Uploaded preview"
                                                        className="max-w-full rounded-lg border border-gray-600 max-h-64 object-contain mb-2"
                                                    />
                                                ) : <div className="mb-2">
                                                    <div className="flex items-center bg-gray-700/50 p-2 rounded-lg">
                                                        <svg className="w-5 h-5 mr-2 flex-shrink-0 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-sm text-blue-100 font-medium">{message.fileName}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {message.content && (
                                                <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="p-4 bg-gray-800 border-t border-gray-700">
                        {file && (
                            <div className="mb-3 flex items-center justify-between bg-gray-700 p-3 rounded-lg border border-gray-600">
                                <div className="flex items-center truncate">
                                    <svg className="flex-shrink-0 w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm text-gray-300 truncate max-w-xs">{file.name}</span>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-gray-400 hover:text-gray-200 p-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div className="relative">
                              <textarea
                                  value={inputValue}
                                  onChange={(e) => {
                                      setInputValue(e.target.value);
                                      // Auto-resize textarea
                                      e.target.style.height = 'auto';
                                      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                  }}
                                  onKeyDown={handleKeyDown}
                                  placeholder="Type a message..."
                                  className="w-full bg-gray-700 rounded-lg p-3 pr-24 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 text-sm min-h-[48px] max-h-[200px]"
                                  style={{
                                      resize: 'none',
                                      overflowY: 'hidden'
                                  }}
                              />
                            <div className="absolute right-3 bottom-3 flex gap-1">
                                <label className="cursor-pointer p-2 rounded-lg hover:bg-gray-600 transition-colors text-gray-400 hover:text-gray-200">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </label>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() && !file}
                                    className={`p-2 rounded-lg ${(!inputValue.trim() && !file) ? 'text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'} transition-colors`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
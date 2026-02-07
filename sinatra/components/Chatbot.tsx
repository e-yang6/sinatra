import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  width?: number;
  onWidthChange?: (width: number) => void;
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-pro'; // Default to Gemini via OpenRouter

// Lazy load OpenRouter SDK to prevent app crash if SDK is not available
let OpenRouterSDK: any = null;
let openRouterClient: any = null;

const getOpenRouterClient = async () => {
  if (!OPENROUTER_API_KEY) {
    return null;
  }
  
  if (openRouterClient) {
    return openRouterClient;
  }

  try {
    // Dynamically import OpenRouter SDK
    if (!OpenRouterSDK) {
      OpenRouterSDK = (await import('@openrouter/sdk')).default;
    }
    
    openRouterClient = new OpenRouterSDK({
      apiKey: OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'Sinatra Music App',
      },
    });
    
    return openRouterClient;
  } catch (error) {
    console.error('Failed to initialize OpenRouter SDK:', error);
    return null;
  }
};

export const Chatbot: React.FC<ChatbotProps> = ({ width = 400, onWidthChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for Sinatra. I can help you with music production, answer questions about the app, or assist with your creative process. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (resizeRef.current && e.target === resizeRef.current) {
      isResizingRef.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = 800;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    onWidthChange?.(clampedWidth);
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check if OpenRouter API key is configured
    if (!OPENROUTER_API_KEY) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in your .env file.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to state and get updated messages
    let updatedMessages: Message[] = [];
    setMessages(prev => {
      updatedMessages = [...prev, userMessage];
      return updatedMessages;
    });

    try {
      // Get OpenRouter client (lazy loaded)
      const openRouter = await getOpenRouterClient();
      
      if (!openRouter) {
        throw new Error('Failed to initialize OpenRouter client. Please check your API key and ensure @openrouter/sdk is installed.');
      }

      // Convert messages to OpenRouter format (exclude initial greeting)
      const conversationMessages = updatedMessages
        .filter(m => m.id !== '1') // Exclude initial greeting
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

      // Call OpenRouter API using SDK
      const completion = await openRouter.chat.send({
        model: OPENROUTER_MODEL,
        messages: conversationMessages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const text = completion.choices[0]?.message?.content || 'No response generated.';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error calling OpenRouter API:', error);
      const errorDetails = error?.message || error?.toString() || 'Unknown error';
      console.error('Error details:', errorDetails);
      console.error('Full error object:', error);
      
      // Check for common API errors
      let userFriendlyMessage = 'Sorry, I encountered an error processing your request.';
      if (errorDetails.includes('API') || errorDetails.includes('key') || errorDetails.includes('401')) {
        userFriendlyMessage = 'API key error. Please check your OpenRouter API key configuration.';
      } else if (errorDetails.includes('quota') || errorDetails.includes('limit') || errorDetails.includes('429')) {
        userFriendlyMessage = 'API quota exceeded. Please check your OpenRouter usage limits.';
      } else if (errorDetails.includes('permission') || errorDetails.includes('access') || errorDetails.includes('403')) {
        userFriendlyMessage = 'Permission denied. Please check your API key permissions.';
      } else if (errorDetails.includes('model')) {
        userFriendlyMessage = 'Model error. Please check your OpenRouter model configuration.';
      } else if (errorDetails.includes('Failed to initialize') || errorDetails.includes('import')) {
        userFriendlyMessage = 'OpenRouter SDK not available. Please run: npm install @openrouter/sdk';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: userFriendlyMessage + ' Please check the browser console for more details.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shadow-lg z-50"
        title="Open AI Chat"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed right-0 top-0 bottom-0 bg-zinc-950 border-l border-zinc-800 flex flex-col z-40"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-zinc-700 transition-colors z-10"
          title="Drag to resize"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[#c9a961]" />
            <span className="text-sm font-medium text-zinc-300">AI Assistant</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={12} className="text-[#c9a961]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-[#c9a961]/20 text-zinc-200'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                  <User size={12} className="text-zinc-400" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                <Bot size={12} className="text-[#c9a961]" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none overflow-y-auto"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-[#c9a961]/20 hover:bg-[#c9a961]/30 text-[#c9a961] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  );
};

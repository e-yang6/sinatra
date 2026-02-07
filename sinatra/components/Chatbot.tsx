import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

const GEMINI_API_KEY = 'AIzaSyBnXRD-k7bFaZbpzPeShRSMKnmwMWqmUxw';

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
  const genAI = useRef<GoogleGenerativeAI | null>(null);
  const chatRef = useRef<any>(null);

  // Initialize Gemini AI
  useEffect(() => {
    genAI.current = new GoogleGenerativeAI(GEMINI_API_KEY);
  }, []);

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
    if (!input.trim() || isLoading || !genAI.current) return;

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
      // Initialize chat if needed
      if (!chatRef.current) {
        // Use gemini-pro (most widely available and stable)
        const model = genAI.current.getGenerativeModel({ model: 'gemini-pro' });
        
        // Get history excluding initial greeting and the user message we just added
        const historyMessages = updatedMessages
          .filter(m => (m.role !== 'assistant' || m.id !== '1') && m.id !== userMessage.id)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          }));
        
        chatRef.current = model.startChat({
          history: historyMessages.length > 0 ? historyMessages : undefined,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        });
      }

      // Send message and get response
      const result = await chatRef.current.sendMessage(userInput);
      const response = await result.response;
      const text = response.text();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error calling Gemini API:', error);
      const errorDetails = error?.message || error?.toString() || 'Unknown error';
      console.error('Error details:', errorDetails);
      console.error('Full error object:', error);
      
      // Check for common API errors
      let userFriendlyMessage = 'Sorry, I encountered an error processing your request.';
      if (errorDetails.includes('API_KEY') || errorDetails.includes('API key')) {
        userFriendlyMessage = 'API key error. Please check your Gemini API key configuration.';
      } else if (errorDetails.includes('quota') || errorDetails.includes('limit')) {
        userFriendlyMessage = 'API quota exceeded. Please check your Gemini API usage limits.';
      } else if (errorDetails.includes('permission') || errorDetails.includes('access')) {
        userFriendlyMessage = 'Permission denied. Please check your API key permissions.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
<<<<<<< Updated upstream
        content: userFriendlyMessage + ' Please check the browser console for more details.',
=======
        content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}. Make sure the backend is running and OPENROUTER_API_KEY is set.`,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            <span className="text-sm font-medium text-zinc-300">AI Assistant</span>
=======
            <span className="text-sm font-medium text-zinc-300">Frank</span>
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">OpenRouter</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Close chat"
            >
              <X size={16} />
            </button>
>>>>>>> Stashed changes
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

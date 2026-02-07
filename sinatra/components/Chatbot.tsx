import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Bot, User, Mic, MicOff, Trash2 } from 'lucide-react';
import { sendChatMessage, clearChatHistory, ChatAction, ProjectContext } from '../api';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  width?: number;
  onWidthChange?: (width: number) => void;
  projectContext?: ProjectContext;
  onAction?: (action: ChatAction) => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ width = 400, onWidthChange, projectContext, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Frank, your AI music assistant for Sinatra. I can help with music production, suggest instruments, explain music theory, or control the DAW with voice commands. Try saying "add a piano track" or "set BPM to 140"!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopRef = useRef(false);

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

  // ---- Resize handling ----
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

  // ---- Process actions from AI response ----
  const processActions = useCallback((actions: ChatAction[]) => {
    if (!onAction || !actions.length) return;
    for (const action of actions) {
      onAction(action);
    }
  }, [onAction]);

  // ---- Send text message ----
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await sendChatMessage(userMessage.content, projectContext);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      processActions(result.actions);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}. Make sure the backend is running and OPENROUTER_API_KEY is set.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Speech-to-Text (Web Speech API) ----
  const sendTranscript = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `🎤 ${text.trim()}`,
      timestamp: new Date(),
    };

    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await sendChatMessage(text.trim(), projectContext);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      processActions(result.actions);
    } catch (error: any) {
      console.error('Voice chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, projectContext, processActions]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Speech recognition is not supported in your browser. Please use Chrome or Edge.',
        timestamp: new Date(),
      }]);
      return;
    }

    // Clear any existing timer
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    finalTranscriptRef.current = '';
    manualStopRef.current = false;
    setInterimTranscript('');
    setInput('');

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final;
      setInterimTranscript(interim);
      setInput(final + interim);

      // Reset auto-send timer — send 1.5s after user stops speaking
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      autoSendTimerRef.current = setTimeout(() => {
        // User stopped speaking — stop recognition and auto-send
        manualStopRef.current = true;
        recognition.stop();
      }, 1500);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Speech recognition error: ${event.error}. Please try again.`,
          timestamp: new Date(),
        }]);
      }
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');

      const fullText = finalTranscriptRef.current.trim();
      if (fullText) {
        setInput('');
        sendTranscript(fullText);
      }

      finalTranscriptRef.current = '';
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      manualStopRef.current = true;
      recognitionRef.current.stop();
    }
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
    };
  }, []);

  // ---- Clear chat ----
  const handleClearChat = async () => {
    try {
      await clearChatHistory();
    } catch (e) {
      // Ignore backend errors for clear
    }
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Chat cleared! How can I help you with your music?',
      timestamp: new Date(),
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---- Collapsed state (floating button) ----
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shadow-lg z-50"
        title="Open Frank"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  // ---- Expanded chat panel ----
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
          </div>
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
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none break-words
                    [&_p]:my-1 [&_p]:leading-relaxed
                    [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc
                    [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal
                    [&_li]:my-0.5
                    [&_h1]:text-base [&_h1]:font-semibold [&_h1]:my-2
                    [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:my-1.5
                    [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:my-1
                    [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_code]:text-zinc-300
                    [&_pre]:bg-zinc-800 [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:my-1.5 [&_pre]:overflow-x-auto
                    [&_pre_code]:bg-transparent [&_pre_code]:p-0
                    [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:my-1.5 [&_blockquote]:text-zinc-400 [&_blockquote]:italic
                    [&_strong]:text-zinc-200 [&_strong]:font-semibold
                    [&_em]:text-zinc-300
                    [&_a]:text-[#c9a961] [&_a]:underline
                    [&_hr]:border-zinc-700 [&_hr]:my-2
                    [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_th]:border [&_th]:border-zinc-700 [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_td]:border-zinc-700
                  ">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                )}
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

        {/* Voice listening indicator */}
        {isListening && (
          <div className="px-4 py-2 bg-emerald-950/30 border-t border-emerald-900/30 flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400">
              Listening{interimTranscript ? '...' : ' — speak now'}
            </span>
            {interimTranscript && (
              <span className="text-xs text-zinc-400 italic truncate flex-1">
                {interimTranscript}
              </span>
            )}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-zinc-800 p-4 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${
                isListening
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? 'Stop listening' : 'Start voice input (hands-free)'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? 'Speak now...' : 'Ask me anything...'}
              className={`flex-1 bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none resize-none overflow-y-auto ${
                isListening ? 'border-emerald-800 focus:border-emerald-700' : 'border-zinc-800 focus:border-zinc-700'
              }`}
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              readOnly={isListening}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isListening}
              className="px-4 py-2 bg-[#c9a961]/20 hover:bg-[#c9a961]/30 text-[#c9a961] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line • Click 🎤 for hands-free voice
          </div>
        </div>
      </div>
    </>
  );
};

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, RefreshCw, Trash2, Sparkles, X } from 'lucide-react';
import { chatbotAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

export default function ChatInterface({ isWidget = false, onClose }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi ${user?.name?.split(' ')[0]}! I'm your FinSync AI assistant. How can I help you manage your finances today?`,
        timestamp: new Date().toISOString(),
      },
    ]);
    fetchSuggestions();
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await chatbotAPI.getSuggestions();
      if (data.success) setSuggestions(data.data.suggestions || []);
    } catch { /* ignore */ }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await chatbotAPI.sendMessage({
        message: text,
        session_id: sessionId,
      });

      if (data.success) {
        setSessionId(data.data.session_id);
        const aiMsg = {
          role: 'assistant',
          content: data.data.message,
          timestamp: data.data.timestamp,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: "Started a new conversation. What's on your mind?",
        timestamp: new Date().toISOString(),
      },
    ]);
    fetchSuggestions();
  };

  return (
    <div className="flex flex-col h-full bg-card relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse-glow">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">FinSync AI</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewSession}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="New Chat"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {isWidget && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex gap-3 max-w-[85%]',
                isUser ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                'p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm',
                isUser
                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                  : 'bg-muted/50 border border-border text-foreground rounded-tl-none',
                msg.isError && 'bg-destructive/10 text-destructive border-destructive/20'
              )}>
                {msg.content}
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-[85%]"
          >
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border border-border p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (only if empty or new session) */}
      {messages.length < 3 && suggestions.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Suggested Questions</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {suggestions.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 text-xs text-muted-foreground hover:text-primary transition-all flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your finances..."
            className="flex-1 h-11 rounded-xl border border-border bg-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className={cn('h-11 w-11 rounded-xl', input.trim() && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25')}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="text-current" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
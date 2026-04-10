import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chatbot/ChatInterface';
import { chatbotAPI } from '@/lib/api';
import { 
  MessageSquare, History, Plus, Trash2, 
  ChevronLeft, ChevronRight, Menu, Bot 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeInView from '@/components/animations/FadeInView';
import useAuthStore from '@/stores/authStore';

export default function ChatbotPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchSessions = async () => {
    try {
      const { data } = await chatbotAPI.getSessions();
      if (data.success) {
        setSessions(data.data.sessions);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleNewChat = () => {
    setActiveSession(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const selectSession = (session) => {
    setActiveSession(session);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      await chatbotAPI.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSession?.id === id) setActiveSession(null);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-[calc(100vh-64px-2.5rem)] lg:h-[calc(100vh-64px-3.5rem)] overflow-hidden bg-background rounded-2xl border border-border shadow-sm relative">
      {/* Sidebar - Chat History */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transition-all duration-300 transform lg:relative lg:translate-x-0 shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:border-none lg:opacity-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button 
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-sm"
            >
              <Plus className="h-4 w-4" /> New Chat
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-2 p-2 rounded-lg hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
            <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Recent Conversations
            </h3>
            {loading ? (
              <div className="flex justify-center p-8"><Bot className="animate-bounce" /></div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground italic">No past conversations</div>
            ) : sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => selectSession(session)}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                  activeSession?.id === session.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{session.preview || 'Untitled Chat'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString()} · {session.messageCount} msgs
                  </p>
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate uppercase font-semibold">Premium Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Mobile & Toggle Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border/50"
              title={sidebarOpen ? "Hide History" : "Show History"}
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> AI Assistant
              </span>
              <p className="text-[10px] text-muted-foreground">Powered by FinSync Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={handleNewChat}
               className="lg:hidden p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
             >
               <Plus className="h-5 w-5" />
             </button>
          </div>
        </div>

        <FadeInView className="flex-1 overflow-hidden">
          <ChatInterface 
            key={activeSession?.id || 'new'} 
            initialSessionId={activeSession?.id}
            onSessionStart={fetchSessions}
          />
        </FadeInView>
      </div>
    </div>
  );
}
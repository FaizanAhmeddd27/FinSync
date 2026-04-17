import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { 
  Phone, PhoneOff, Mic, MicOff, 
  User, Bot, Loader2, Sparkles,
  Activity, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { env } from '@/config/env';
import useAuthStore from '@/stores/authStore';



export default function CallAssistant() {
  const { user } = useAuthStore();
  const [vapi, setVapi] = useState(null);
  
  useEffect(() => {
    if (env.VAPI_PUBLIC_KEY) {
      console.log('Initializing Vapi with Public Key:', env.VAPI_PUBLIC_KEY);
      setVapi(new Vapi(env.VAPI_PUBLIC_KEY));
    } else {
      console.error('VAPI_PUBLIC_KEY is missing from environment.');
    }
  }, []);

  const [callStatus, setCallStatus] = useState('inactive'); // inactive, loading, active
  const [messages, setMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!vapi) return;

    const onCallStart = () => setCallStatus('active');
    const onCallEnd = () => setCallStatus('inactive');
    
    const onMessage = (message) => {
      // Handle Transcripts
      if (message.type === 'transcript') {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          const isUser = message.role === 'user';
          
          // If it's a final transcript, add/update it
          if (message.transcriptType === 'final') {
             // If the last message was a partial from the same role, replace it
             if (lastMsg && lastMsg.role === message.role && lastMsg.isPartial) {
                return [...prev.slice(0, -1), { role: message.role, text: message.transcript, id: `${Date.now()}-${Math.random()}` }];
             }
             return [...prev, { role: message.role, text: message.transcript, id: `${Date.now()}-${Math.random()}` }];
          }
          
          // If it's a partial transcript, update the UI live
          if (message.transcriptType === 'partial') {
            if (lastMsg && lastMsg.role === message.role && lastMsg.isPartial) {
               return [...prev.slice(0, -1), { role: message.role, text: message.transcript, id: lastMsg.id, isPartial: true }];
            }
            return [...prev, { role: message.role, text: message.transcript, id: `${Date.now()}-${Math.random()}`, isPartial: true }];
          }
          return prev;
        });
      }
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('error', (e) => {
      console.error('Vapi Error:', e);
      setCallStatus('inactive');
    });

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('message', onMessage);
    };
  }, [vapi]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startCall = async () => {
    console.log('Starting call with Assistant ID:', env.VAPI_ASSISTANT_ID);
    
    if (!env.VAPI_ASSISTANT_ID) {
      console.error('Error: VAPI_ASSISTANT_ID is missing.');
      return;
    }

    try {
      // 1. Explicitly request microphone permission first to avoid timeouts/ejections
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setCallStatus('loading');

      // 2. Start using the recommended vapi.start(id, options) format
      vapi.start(env.VAPI_ASSISTANT_ID, {
        variableValues: {
          userId: user?.id || 'guest',
          userName: user?.name || 'Guest User'
        }
      });
    } catch (err) {
      console.error('Vapi Start Failure:', err);
      setCallStatus('inactive');
      alert("Please allow microphone access to start the voice assistant.");
    }
  };

  const stopCall = () => {
    if (vapi) vapi.stop();
  };

  const toggleMute = () => {
    if (vapi) {
      vapi.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !vapi) return;

    // Send the text message to Vapi assistant
    vapi.send({
      type: 'add-message',
      message: {
        role: 'user',
        content: inputText.trim(),
      },
    });

    // Optimistically add to messages transcript
    setMessages((prev) => [
      ...prev,
      { 
        role: 'user', 
        text: inputText.trim(), 
        id: `${Date.now()}-${Math.random()}` 
      }
    ]);

    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-card/10 backdrop-blur-xl overflow-hidden relative">
      {/* Visual Feedback Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden min-h-[200px]">
        {/* Animated Background Orbs */}
        <div className={cn(
            "absolute w-48 h-48 md:w-64 md:h-64 bg-primary/20 rounded-full blur-[80px] md:blur-[100px] transition-all duration-1000",
            callStatus === 'active' ? "scale-150 animate-pulse" : "scale-50 opacity-0"
        )} />
        
        {/* AI Avatar / Status */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500",
              callStatus === 'active' 
                ? "bg-primary/10 border-primary scale-110 shadow-[0_0_50px_rgba(28,156,240,0.3)]" 
                : "bg-muted border-border"
          )}>
            {callStatus === 'loading' ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : callStatus === 'active' ? (
              <Sparkles className="h-12 w-12 text-primary animate-bounce" />
            ) : (
                <Bot className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {callStatus === 'active' ? 'Fin is listening...' : callStatus === 'loading' ? 'Connecting to Fin...' : 'Fin Assistant'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {callStatus === 'active' ? 'Feel free to ask questions or perform actions' : 'Tap below to start a voice session'}
            </p>
          </div>
          
          {/* Waveform Animation (Simulated) */}
          {callStatus === 'active' && (
            <div className="flex items-center gap-1 h-8 mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-full animate-pulse" 
                  style={{ 
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s` 
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transcript Feed (Scrolling) */}
      <div 
        ref={scrollRef}
        className="flex-1 max-h-[40vh] md:max-h-[50vh] border-y border-border/50 bg-background/20 backdrop-blur-sm overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            Voice transcripts will appear here...
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  msg.role === 'user' ? "bg-primary/10" : "bg-muted"
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl p-3 text-sm shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-card border border-border rounded-tl-none",
                msg.isPartial && "opacity-70 animate-pulse"
              )}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hybrid Text Input (Visible when active) */}
      {callStatus === 'active' && (
        <form 
          onSubmit={handleSendMessage}
          className="p-3 md:p-4 bg-background/40 backdrop-blur-xl border-t border-border flex items-center gap-2"
        >
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to Fin..."
            className="flex-1 bg-muted border border-border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      )}

      {/* Bottom Controls */}
      <div className="p-6 bg-card/50 border-t border-border flex items-center justify-center gap-4">
        {callStatus === 'inactive' ? (
          <button 
            onClick={startCall}
            className="group flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Phone className="h-5 w-5 fill-current" />
            Start Voice Assistant
          </button>
        ) : (
          <>
            <button 
              onClick={toggleMute}
              className={cn(
                "p-4 rounded-full border transition-all hover:scale-110",
                isMuted ? "bg-destructive/10 border-destructive text-destructive" : "bg-muted border-border hover:bg-accent"
              )}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <button 
              onClick={stopCall}
              className="px-8 py-3 rounded-full bg-destructive text-destructive-foreground font-bold shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all hover:scale-105 flex items-center gap-2"
            >
              <PhoneOff className="h-5 w-5 fill-current" />
              End Call
            </button>
          </>
        )}
      </div>
      
    </div>
  );
}

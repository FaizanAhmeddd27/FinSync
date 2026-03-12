import ChatInterface from '@/components/chatbot/ChatInterface';
import FadeInView from '@/components/animations/FadeInView';

export default function ChatbotPage() {
  return (
    <div className="h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      <FadeInView className="h-full">
        <div className="h-full rounded-2xl border border-border shadow-sm overflow-hidden">
          <ChatInterface />
        </div>
      </FadeInView>
    </div>
  );
}
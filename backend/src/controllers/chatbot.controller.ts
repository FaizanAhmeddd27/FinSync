import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';

// SEND MESSAGE 
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const { message, session_id } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new BadRequestError('Message is required');
  }

  if (message.length > 1000) {
    throw new BadRequestError('Message too long (max 1000 characters)');
  }

  let sessionId = session_id;
  let conversationHistory: Array<{ role: string; content: string }> = [];

  // Get or create chat session
  if (sessionId) {
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', req.user.id)
      .single();

    if (session) {
      conversationHistory = (session.messages as any[]) || [];
    } else {
      sessionId = null;
    }
  }

  if (!sessionId) {
    const { data: newSession, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id: req.user.id,
        messages: [],
      })
      .select()
      .single();

    if (error || !newSession) {
      throw new BadRequestError('Failed to create chat session');
    }

    sessionId = newSession.id;
  }

  // Generate AI response
  const aiResponse = await AIService.chat(
    req.user.id,
    message.trim(),
    conversationHistory
  );

  // Update conversation history
  const newMessages = [
    ...conversationHistory,
    {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    },
  ];

  // Keep only last 50 messages per session
  const trimmedMessages = newMessages.slice(-50);

  await supabaseAdmin
    .from('chat_sessions')
    .update({
      messages: trimmedMessages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  res.status(200).json({
    success: true,
    data: {
      session_id: sessionId,
      message: aiResponse,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET CHAT HISTORY 
export const getChatHistory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { sessionId } = req.params;

    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', req.user.id)
      .single();

    if (!session) throw new NotFoundError('Chat session not found');

    res.status(200).json({
      success: true,
      data: {
        session_id: session.id,
        messages: session.messages || [],
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
    });
  }
);

// GET ALL CHAT SESSIONS 
export const getChatSessions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data: sessions } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, created_at, updated_at, messages')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    // Return sessions with preview (first message)
    const sessionPreviews = (sessions || []).map((s) => {
      const msgs = (s.messages as any[]) || [];
      const firstUserMsg = msgs.find((m) => m.role === 'user');
      return {
        id: s.id,
        preview: firstUserMsg?.content?.substring(0, 50) || 'New conversation',
        messageCount: msgs.length,
        created_at: s.created_at,
        updated_at: s.updated_at,
      };
    });

    res.status(200).json({
      success: true,
      data: { sessions: sessionPreviews },
    });
  }
);

// DELETE CHAT SESSION 
export const deleteChatSession = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { sessionId } = req.params;

    await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Chat session deleted',
    });
  }
);

// GET QUICK SUGGESTIONS
export const getQuickSuggestions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const suggestions = [
      'What is my current balance?',
      'How much did I spend this month?',
      'Show me my top spending categories',
      'Am I over budget on anything?',
      'Give me financial tips',
      'What is my savings rate?',
      'How can I reduce my expenses?',
      'Summarize my recent transactions',
    ];

    res.status(200).json({
      success: true,
      data: { suggestions },
    });
  }
);
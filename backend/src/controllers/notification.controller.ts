import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { UnauthorizedError, NotFoundError } from '../utils/errors';

export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || 20,
      50
    );
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const type = req.query.type as string;

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data: notifications, error, count } = await query;

    if (error) throw error;

    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('status', 'unread');

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });
  }
);

export const getNotificationStats = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('status')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const stats = {
      total: data.length,
      unread: data.filter(n => n.status === 'unread').length,
      read: data.filter(n => n.status === 'read').length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

export const markAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { notificationId } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', notificationId)
      .eq('user_id', req.user.id);

    if (error) throw new NotFoundError('Notification not found');

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  }
);

export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    await supabaseAdmin
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', req.user.id)
      .eq('status', 'unread');

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  }
);

export const deleteNotification = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { notificationId } = req.params;

    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  }
);

export const clearReadNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', req.user.id)
      .eq('status', 'read');

    res.status(200).json({
      success: true,
      message: 'Read notifications cleared',
    });
  }
);

export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('status', 'unread');

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: { unreadCount: count || 0 },
    });
  }
);
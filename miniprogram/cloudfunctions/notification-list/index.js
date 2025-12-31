/**
 * Notification List Cloud Function
 * 查询用户通知消息云函数
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 通用响应函数
 */
function successResponse(data) {
  return {
    errcode: 0,
    errmsg: 'success',
    data
  };
}

function errorResponse(errcode, errmsg) {
  return {
    errcode,
    errmsg
  };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[NotificationList] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[NotificationList] openid:', openid.substring(0, 8) + '...');

  // 获取筛选参数
  const { is_read, limit = 50 } = event;

  try {
    // 构建查询条件
    let conditions = [{ recipient_user_id: openid }];

    if (is_read !== undefined) {
      conditions.push({ is_read: is_read === true ? true : false });
    }

    // 查询通知列表
    const result = await db.collection('notifications')
      .where(db.command.and(conditions))
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const notifications = result.data.map(notif => {
      return {
        notification_id: notif.notification_id,
        type: notif.type,
        title: notif.title,
        content: notif.content,
        related_slot_id: notif.related_slot_id,
        related_boxer_id: notif.related_boxer_id,
        is_read: notif.is_read,
        created_at: notif.created_at
      };
    });

    // 统计未读数
    const unreadCount = await db.collection('notifications')
      .where(db.command.and([
        { recipient_user_id: openid },
        { is_read: false }
      ]))
      .count();

    console.log('[NotificationList] 查询成功, count:', notifications.length, ', unread:', unreadCount.total);

    return successResponse({
      notifications,
      total: notifications.length,
      unread_count: unreadCount.total || 0
    });

  } catch (e) {
    console.error('[NotificationList] 查询失败:', e);
    return errorResponse(6090, '查询通知消息失败');
  }
};

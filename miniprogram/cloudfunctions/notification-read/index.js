/**
 * Notification Read Cloud Function
 * 标记通知已读云函数
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
    console.error('[NotificationRead] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[NotificationRead] openid:', openid.substring(0, 8) + '...');

  const { notification_id, mark_all_as_read } = event;

  try {
    const now = new Date();

    // 标记所有通知为已读
    if (mark_all_as_read) {
      const result = await db.collection('notifications')
        .where(db.command.and([
          { recipient_user_id: openid },
          { is_read: false }
        ]))
        .update({
          data: {
            is_read: true,
            updated_at: now
          }
        });

      console.log('[NotificationRead] 标记所有已读成功');

      return successResponse({
        updated: result.stats.updated
      });
    }

    // 标记单个通知为已读
    if (notification_id) {
      // 先验证通知所有权
      const notifResult = await db.collection('notifications')
        .where({ notification_id })
        .get();

      if (notifResult.data.length === 0) {
        return errorResponse(6101, '通知不存在');
      }

      const notif = notifResult.data[0];

      if (notif.recipient_user_id !== openid) {
        return errorResponse(6102, '无权操作此通知');
      }

      await db.collection('notifications').doc(notif._id).update({
        data: {
          is_read: true,
          updated_at: now
        }
      });

      console.log('[NotificationRead] 标记已读成功, notification_id:', notification_id);

      return successResponse({
        notification_id,
        is_read: true
      });
    }

    return errorResponse(6100, '请提供notification_id或mark_all_as_read参数');

  } catch (e) {
    console.error('[NotificationRead] 操作失败:', e);
    return errorResponse(6103, '标记已读失败');
  }
};

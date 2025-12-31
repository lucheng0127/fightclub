/**
 * Notification Send Cloud Function
 * 发送通知消息云函数（内部调用）
 * 用于在预约、取消预约时发送通知
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成 notification_id
 */
function generateNotificationId() {
  const hash = crypto.createHash('sha256')
    .update('notification' + Date.now() + Math.random())
    .digest('hex')
    .substring(0, 12);
  return 'notif_' + hash;
}

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

/**
 * 发送应用内通知
 */
async function sendInternalNotification(recipientUserId, type, title, content, relatedData) {
  const now = new Date();
  const notification_id = generateNotificationId();

  const notificationData = {
    notification_id,
    recipient_user_id: recipientUserId,
    type,
    title,
    content,
    related_slot_id: relatedData.slot_id || null,
    related_boxer_id: relatedData.boxer_id || null,
    is_read: false,
    created_at: now,
    updated_at: now
  };

  await db.collection('notifications').add({
    data: notificationData
  });

  return notification_id;
}

/**
 * 发送微信订阅消息
 */
async function sendWeChatSubscriptionMessage(openid, templateId, data, page = '') {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      template_id: templateId,
      page: page,
      data: data
    });
    console.log('[NotificationSend] 微信订阅消息发送成功:', result);
    return result;
  } catch (e) {
    console.error('[NotificationSend] 微信订阅消息发送失败:', e);
    // 订阅消息发送失败不影响主流程，可能是用户没有订阅
    return null;
  }
}

/**
 * 发送新预约微信订阅消息给拳馆
 */
async function sendWeChatNewBookingNotification(gymOpenid, boxerName, slotInfo) {
  // TODO: 在微信公众平台配置订阅消息模板后，替换这里的 template_id
  // 模板变量需要根据实际模板配置
  const templateId = 'YOUR_TEMPLATE_ID_HERE'; // 需要替换为实际的模板ID

  const data = {
    thing1: { value: boxerName }, // 拳手昵称
    date2: { value: slotInfo.date }, // 日期
    time3: { value: `${slotInfo.start_time}-${slotInfo.end_time}` }, // 时间
    thing4: { value: '场地预约' } // 事项
  };

  return await sendWeChatSubscriptionMessage(
    gymOpenid,
    templateId,
    data,
    'pages/gym/slot-manage/slot-manage'
  );
}

/**
 * 发送取消预约微信订阅消息
 */
async function sendWeChatCancelNotification(openid, boxerName, slotInfo) {
  // TODO: 在微信公众平台配置订阅消息模板后，替换这里的 template_id
  const templateId = 'YOUR_TEMPLATE_ID_HERE'; // 需要替换为实际的模板ID

  const data = {
    thing1: { value: boxerName }, // 拳手昵称
    date2: { value: slotInfo.date }, // 日期
    time3: { value: `${slotInfo.start_time}-${slotInfo.end_time}` }, // 时间
    thing4: { value: '已取消预约' } // 状态
  };

  return await sendWeChatSubscriptionMessage(
    openid,
    templateId,
    data,
    'pages/gym/slot-manage/slot-manage'
  );
}

/**
 * 发送新预约通知给拳馆和其他拳手
 */
async function notifyNewBooking(gymUserId, otherBoxerUserIds, boxerName, slotInfo) {
  // 发送给拳馆
  const gymTitle = '新预约通知';
  const gymContent = `拳手 ${boxerName} 预约了您在 ${slotInfo.date} ${slotInfo.start_time}-${slotInfo.end_time} 的场地`;

  await sendInternalNotification(
    gymUserId,
    'new_booking',
    gymTitle,
    gymContent,
    { slot_id: slotInfo.slot_id }
  );

  // 尝试发送微信订阅消息给拳馆
  await sendWeChatNewBookingNotification(gymUserId, boxerName, slotInfo);

  // 发送给其他已预约的拳手
  if (otherBoxerUserIds && otherBoxerUserIds.length > 0) {
    const boxerTitle = '新拳手加入预约';
    const boxerContent = `拳手 ${boxerName} 也预约了 ${slotInfo.date} ${slotInfo.start_time}-${slotInfo.end_time} 的场地，剩余 ${slotInfo.remaining_spots} 个名额`;

    const promises = otherBoxerUserIds.map(userId => {
      return sendInternalNotification(
        userId,
        'new_booking',
        boxerTitle,
        boxerContent,
        { slot_id: slotInfo.slot_id }
      );
    });

    await Promise.all(promises);
  }
}

/**
 * 发送取消预约通知给拳馆
 */
async function notifyCancelledBookingToGym(gymUserId, boxerName, slotInfo) {
  const title = '预约取消通知';
  const content = `拳手 ${boxerName} 取消了在 ${slotInfo.date} ${slotInfo.start_time}-${slotInfo.end_time} 的场地预约`;

  await sendInternalNotification(
    gymUserId,
    'cancelled_booking',
    title,
    content,
    { slot_id: slotInfo.slot_id }
  );

  // 尝试发送微信订阅消息给拳馆
  await sendWeChatCancelNotification(gymUserId, boxerName, slotInfo);
}

/**
 * 发送取消预约通知给其他拳手
 */
async function notifyCancelledBookingToBoxers(boxerUserIds, boxerName, slotInfo) {
  const title = '预约取消通知';
  const content = `拳手 ${boxerName} 取消了预约，现在有 ${slotInfo.available_spots} 个剩余名额`;

  const promises = boxerUserIds.map(userId => {
    return sendInternalNotification(
      userId,
      'cancelled_booking',
      title,
      content,
      { slot_id: slotInfo.slot_id }
    );
  });

  await Promise.all(promises);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  // 这个云函数只能由其他云函数调用，需要验证调用者
  // 暂时通过检查是否为云函数调用来验证
  if (!openid && context.source !== 'function') {
    console.error('[NotificationSend] 非法调用');
    return errorResponse(6099, '非法调用');
  }

  console.log('[NotificationSend] event:', JSON.stringify(event));

  const { action, data } = event;

  try {
    if (action === 'new_booking') {
      // data: { gym_user_id, other_boxer_user_ids, boxer_name, slot: { slot_id, date, start_time, end_time, remaining_spots } }
      await notifyNewBooking(
        data.gym_user_id,
        data.other_boxer_user_ids || [],
        data.boxer_name,
        data.slot
      );

      return successResponse({
        action: 'new_booking'
      });

    } else if (action === 'cancelled_booking') {
      // data: { gym_user_id, other_boxer_user_ids, boxer_name, slot: { slot_id, date, start_time, end_time, available_spots } }

      // 发送给拳馆
      await notifyCancelledBookingToGym(
        data.gym_user_id,
        data.boxer_name,
        data.slot
      );

      // 发送给其他拳手
      if (data.other_boxer_user_ids && data.other_boxer_user_ids.length > 0) {
        await notifyCancelledBookingToBoxers(
          data.other_boxer_user_ids,
          data.boxer_name,
          data.slot
        );
      }

      return successResponse({
        action: 'cancelled_booking'
      });

    } else if (action === 'send_notification') {
      // 通用发送通知
      // data: { recipient_user_id, type, title, content, related_slot_id, related_boxer_id }
      const notificationId = await sendInternalNotification(
        data.recipient_user_id,
        data.type,
        data.title,
        data.content,
        {
          slot_id: data.related_slot_id,
          boxer_id: data.related_boxer_id
        }
      );

      return successResponse({
        notification_id: notificationId
      });

    }

    return errorResponse(6098, '不支持的操作');

  } catch (e) {
    console.error('[NotificationSend] 发送失败:', e);
    return errorResponse(6097, '发送通知失败');
  }
};

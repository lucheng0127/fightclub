/**
 * Slot Book Cloud Function
 * 拳手预约时间段云函数
 * 使用数据库事务确保数据一致性
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成 booking_id
 */
function generateBookingId(openid) {
  const hash = crypto.createHash('sha256')
    .update(openid + 'booking' + Date.now())
    .digest('hex')
    .substring(0, 12);
  return 'booking_' + hash;
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[SlotBook] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[SlotBook] openid:', openid.substring(0, 8) + '...');

  if (!event.slot_id) {
    return errorResponse(6060, 'slot_id不能为空');
  }

  try {
    // 查询用户的拳手档案
    const boxerResult = await db.collection('boxers').where({ user_id: openid }).get();
    if (boxerResult.data.length === 0) {
      return errorResponse(6061, '拳手档案不存在，请先创建拳手档案');
    }

    const boxer = boxerResult.data[0];

    // 查询时间段
    const slotResult = await db.collection('gym_slots').where({ slot_id: event.slot_id }).get();
    if (slotResult.data.length === 0) {
      return errorResponse(6062, '时间段不存在');
    }

    const slot = slotResult.data[0];

    // 检查时间段状态
    if (slot.status !== 'active') {
      return errorResponse(6063, '时间段不可预约');
    }

    // 检查是否重复预约
    const existingBooking = await db.collection('slot_bookings')
      .where({
        slot_id: event.slot_id,
        boxer_id: boxer.boxer_id,
        status: 'active'
      })
      .get();

    if (existingBooking.data.length > 0) {
      return errorResponse(6064, '您已预约该时间段');
    }

    // 使用事务创建预约记录
    const transaction = await db.startTransaction();

    try {
      // 在事务中重新查询时间段并加锁
      const currentSlotResult = await transaction.collection('gym_slots')
        .where({ slot_id: event.slot_id })
        .get();

      if (currentSlotResult.data.length === 0) {
        await transaction.rollback();
        return errorResponse(6062, '时间段不存在');
      }

      const currentSlot = currentSlotResult.data[0];

      // 检查人数上限
      if (currentSlot.current_bookings >= currentSlot.max_boxers) {
        await transaction.rollback();
        return errorResponse(6065, '该时间段名额已满');
      }

      const now = new Date();
      const booking_id = generateBookingId(openid);

      // 创建预约记录
      const bookingData = {
        booking_id,
        slot_id: event.slot_id,
        gym_id: slot.gym_id,
        boxer_id: boxer.boxer_id,
        boxer_user_id: openid,
        booking_time: now,
        status: 'active',
        created_at: now,
        updated_at: now
      };

      await transaction.collection('slot_bookings').add({
        data: bookingData
      });

      // 更新时间段的预约数
      await transaction.collection('gym_slots').doc(currentSlot._id).update({
        data: {
          current_bookings: currentSlot.current_bookings + 1,
          updated_at: now
        }
      });

      // 提交事务
      await transaction.commit();

      console.log('[SlotBook] 预约成功, booking_id:', booking_id);

      // 发送消息通知给拳馆
      try {
        await cloud.callFunction({
          name: 'notification-send',
          data: {
            action: 'new_booking',
            data: {
              gym_user_id: slot.user_id,
              boxer_name: boxer.nickname,
              slot: {
                slot_id: slot.slot_id,
                date: slot.date,
                start_time: slot.start_time,
                end_time: slot.end_time
              }
            }
          }
        });
      } catch (notifError) {
        console.error('[SlotBook] 发送通知失败:', notifError);
        // 通知失败不影响预约成功
      }

      return successResponse({
        booking_id,
        slot_id: event.slot_id,
        booking_time: now
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[SlotBook] 预约失败:', e);
    return errorResponse(6066, '预约失败');
  }
};

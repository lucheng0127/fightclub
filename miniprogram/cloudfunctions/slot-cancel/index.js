/**
 * Slot Cancel Cloud Function
 * 拳手取消预约云函数
 * 使用数据库事务确保数据一致性
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
    console.error('[SlotCancel] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[SlotCancel] openid:', openid.substring(0, 8) + '...');

  // 支持 booking_id 或 slot_id 作为参数
  const { booking_id, slot_id } = event;

  if (!booking_id && !slot_id) {
    return errorResponse(6070, '请提供booking_id或slot_id');
  }

  try {
    let booking = null;
    let slot = null;

    // 如果提供了 booking_id，直接查询预约记录
    if (booking_id) {
      const bookingResult = await db.collection('slot_bookings')
        .where({ booking_id })
        .get();

      if (bookingResult.data.length === 0) {
        return errorResponse(6071, '预约记录不存在');
      }

      booking = bookingResult.data[0];
    } else {
      // 如果只提供了 slot_id，查询该用户在该时间段的预约
      const boxerResult = await db.collection('boxers').where({ user_id: openid }).get();
      if (boxerResult.data.length === 0) {
        return errorResponse(6072, '拳手档案不存在');
      }

      const boxer_id = boxerResult.data[0].boxer_id;

      const bookingResult = await db.collection('slot_bookings')
        .where({
          slot_id,
          boxer_id,
          status: 'active'
        })
        .get();

      if (bookingResult.data.length === 0) {
        return errorResponse(6071, '预约记录不存在');
      }

      booking = bookingResult.data[0];
    }

    // 验证所有权
    if (booking.boxer_user_id !== openid) {
      return errorResponse(6073, '无权操作此预约');
    }

    // 检查预约状态
    if (booking.status !== 'active') {
      return errorResponse(6074, '该预约已取消');
    }

    // 查询时间段信息
    const slotResult = await db.collection('gym_slots')
      .where({ slot_id: booking.slot_id })
      .get();

    if (slotResult.data.length === 0) {
      return errorResponse(6075, '时间段不存在');
    }

    slot = slotResult.data[0];

    // 检查取消截止时间（时间段结束前半小时）
    const slotEndDateTime = new Date(`${slot.date}T${slot.end_time}:00`);
    const cancelDeadline = new Date(slotEndDateTime.getTime() - 30 * 60 * 1000);
    const now = new Date();

    if (now >= cancelDeadline) {
      return errorResponse(6076, '已超过取消截止时间（时间段结束前半小时）');
    }

    // 使用事务取消预约
    const transaction = await db.startTransaction();

    try {
      // 在事务中重新查询预约记录
      const currentBookingResult = await transaction.collection('slot_bookings')
        .where({ booking_id: booking.booking_id })
        .get();

      if (currentBookingResult.data.length === 0) {
        await transaction.rollback();
        return errorResponse(6071, '预约记录不存在');
      }

      const currentBooking = currentBookingResult.data[0];

      // 更新预约状态
      const now = new Date();
      await transaction.collection('slot_bookings').doc(currentBooking._id).update({
        data: {
          status: 'cancelled',
          cancelled_at: now,
          updated_at: now
        }
      });

      // 重新查询时间段
      const currentSlotResult = await transaction.collection('gym_slots')
        .where({ slot_id: booking.slot_id })
        .get();

      if (currentSlotResult.data.length > 0) {
        const currentSlot = currentSlotResult.data[0];

        // 减少时间段的预约数
        const newBookings = Math.max(0, currentSlot.current_bookings - 1);
        await transaction.collection('gym_slots').doc(currentSlot._id).update({
          data: {
            current_bookings: newBookings,
            updated_at: now
          }
        });
      }

      // 提交事务
      await transaction.commit();

      console.log('[SlotCancel] 取消成功, booking_id:', booking.booking_id);

      // 获取取消预约的拳手信息
      const boxerResult = await db.collection('boxers')
        .where({ boxer_id: booking.boxer_id })
        .get();

      const boxerName = boxerResult.data.length > 0
        ? boxerResult.data[0].nickname
        : '拳手';

      // 获取同时间段的其他预约拳手
      const otherBookingsResult = await db.collection('slot_bookings')
        .where(db.command.and([
          { slot_id: booking.slot_id },
          { status: 'active' },
          { boxer_id: db.command.neq(booking.boxer_id) }
        ]))
        .get();

      const otherBoxerUserIds = otherBookingsResult.data.map(b => b.boxer_user_id);

      // 发送消息通知给拳馆和其他拳手
      try {
        await cloud.callFunction({
          name: 'notification-send',
          data: {
            action: 'cancelled_booking',
            data: {
              gym_user_id: slot.user_id,
              other_boxer_user_ids: otherBoxerUserIds,
              boxer_name: boxerName,
              slot: {
                slot_id: slot.slot_id,
                date: slot.date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                available_spots: Math.max(0, slot.current_bookings - 1)
              }
            }
          }
        });
      } catch (notifError) {
        console.error('[SlotCancel] 发送通知失败:', notifError);
        // 通知失败不影响取消成功
      }

      return successResponse({
        booking_id: booking.booking_id,
        slot_id: booking.slot_id,
        cancelled_at: now
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[SlotCancel] 取消失败:', e);
    return errorResponse(6077, '取消预约失败');
  }
};

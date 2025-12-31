/**
 * My Bookings Cloud Function
 * 查询我的预约记录云函数
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

/**
 * 计算年龄
 */
function calculateAge(birthdate) {
  const birthDate = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * 判断是否可以取消预约（时间段结束前半小时）
 */
function canCancelBooking(slot, now) {
  const slotEndDateTime = new Date(`${slot.date}T${slot.end_time}:00`);
  const cancelDeadline = new Date(slotEndDateTime.getTime() - 30 * 60 * 1000);
  return now < cancelDeadline;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[MyBookings] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[MyBookings] openid:', openid.substring(0, 8) + '...');

  try {
    // 查询用户的拳手档案
    const boxerResult = await db.collection('boxers').where({ user_id: openid }).get();
    if (boxerResult.data.length === 0) {
      return errorResponse(6110, '拳手档案不存在');
    }

    const boxer = boxerResult.data[0];
    const boxer_id = boxer.boxer_id;

    // 查询预约记录
    const { status = 'all' } = event; // all | active | cancelled

    let conditions = [
      { boxer_id }
    ];

    if (status === 'active') {
      conditions.push({ status: 'active' });
    } else if (status === 'cancelled') {
      conditions.push({ status: 'cancelled' });
    }

    const bookingsResult = await db.collection('slot_bookings')
      .where(db.command.and(conditions))
      .orderBy('created_at', 'desc')
      .get();

    // 获取所有相关的时间段和拳馆信息
    const bookings = await Promise.all(bookingsResult.data.map(async (booking) => {
      // 查询时间段
      const slotResult = await db.collection('gym_slots')
        .where({ slot_id: booking.slot_id })
        .get();

      if (slotResult.data.length === 0) {
        return null;
      }

      const slot = slotResult.data[0];

      // 查询拳馆信息
      const gymResult = await db.collection('gyms')
        .where({ gym_id: slot.gym_id, status: 'approved' })
        .get();

      if (gymResult.data.length === 0) {
        return null;
      }

      const gym = gymResult.data[0];

      // 判断是否可以取消
      const now = new Date();
      const canCancel = booking.status === 'active' && canCancelBooking(slot, now);

      // 计算距离截止时间的剩余分钟数
      let minutesUntilDeadline = null;
      if (booking.status === 'active') {
        const slotEndDateTime = new Date(`${slot.date}T${slot.end_time}:00`);
        const cancelDeadline = new Date(slotEndDateTime.getTime() - 30 * 60 * 1000);
        minutesUntilDeadline = Math.floor((cancelDeadline - now) / 60000);
      }

      return {
        booking_id: booking.booking_id,
        slot_id: slot.slot_id,
        gym: {
          gym_id: gym.gym_id,
          name: gym.name,
          address: gym.address,
          city: gym.city,
          phone: gym.phone,
          icon_url: gym.icon_url
        },
        slot: {
          slot_id: slot.slot_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          max_boxers: slot.max_boxers,
          current_bookings: slot.current_bookings,
          status: slot.status
        },
        booking_time: booking.booking_time,
        status: booking.status,
        cancelled_at: booking.cancelled_at,
        can_cancel: canCancel,
        minutes_until_deadline: minutesUntilDeadline,
        created_at: booking.created_at
      };
    }));

    // 过滤掉 null 值
    const validBookings = bookings.filter(b => b !== null);

    console.log('[MyBookings] 查询成功, bookings count:', validBookings.length);

    return successResponse({
      bookings: validBookings,
      total: validBookings.length,
      boxer: {
        boxer_id: boxer.boxer_id,
        nickname: boxer.nickname
      }
    });

  } catch (e) {
    console.error('[MyBookings] 查询失败:', e);
    return errorResponse(6111, '查询预约记录失败');
  }
};

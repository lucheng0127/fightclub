/**
 * Slot Bookings Cloud Function
 * 查看时间段预约拳手列表云函数
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
    console.error('[SlotBookings] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[SlotBookings] openid:', openid.substring(0, 8) + '...');

  if (!event.slot_id) {
    return errorResponse(6080, 'slot_id不能为空');
  }

  try {
    // 查询时间段
    const slotResult = await db.collection('gym_slots')
      .where({ slot_id: event.slot_id })
      .get();

    if (slotResult.data.length === 0) {
      return errorResponse(6081, '时间段不存在');
    }

    const slot = slotResult.data[0];

    // 查询拳馆信息
    const gymResult = await db.collection('gyms')
      .where({ gym_id: slot.gym_id })
      .get();

    if (gymResult.data.length === 0) {
      return errorResponse(6082, '拳馆信息不存在');
    }

    const gym = gymResult.data[0];

    // 查询预约拳手列表
    const bookingsResult = await db.collection('slot_bookings')
      .where({
        slot_id: event.slot_id,
        status: 'active'
      })
      .orderBy('booking_time', 'asc')
      .get();

    // 获取拳手信息
    const boxers = await Promise.all(bookingsResult.data.map(async (booking) => {
      const boxerResult = await db.collection('boxers')
        .where({ boxer_id: booking.boxer_id })
        .get();

      if (boxerResult.data.length === 0) {
        return null;
      }

      const boxer = boxerResult.data[0];

      // 计算年龄
      const birthDate = new Date(boxer.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return {
        boxer_id: boxer.boxer_id,
        nickname: boxer.nickname,
        gender: boxer.gender,
        age: age,
        height: boxer.height,
        weight: boxer.weight,
        city: boxer.city,
        booking_time: booking.booking_time
      };
    }));

    // 过滤掉 null 值
    const validBoxers = boxers.filter(b => b !== null);

    // 检查当前用户是否已预约该时间段
    let isBooked = false;
    const boxerResult = await db.collection('boxers').where({ user_id: openid }).get();
    if (boxerResult.data.length > 0) {
      const boxer_id = boxerResult.data[0].boxer_id;
      const myBooking = bookingsResult.data.find(b => b.boxer_id === boxer_id && b.status === 'active');
      isBooked = !!myBooking;
    }

    console.log('[SlotBookings] 查询成功, boxers count:', validBoxers.length, ', is_booked:', isBooked);

    return successResponse({
      slot: {
        slot_id: slot.slot_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_boxers: slot.max_boxers,
        current_bookings: slot.current_bookings,
        available_spots: slot.max_boxers - slot.current_bookings,
        status: slot.status,
        is_booked: isBooked
      },
      gym: {
        gym_id: gym.gym_id,
        name: gym.name,
        address: gym.address,
        city: gym.city,
        phone: gym.phone
      },
      boxers: validBoxers,
      total: validBoxers.length
    });

  } catch (e) {
    console.error('[SlotBookings] 查询失败:', e);
    return errorResponse(6083, '查询预约列表失败');
  }
};

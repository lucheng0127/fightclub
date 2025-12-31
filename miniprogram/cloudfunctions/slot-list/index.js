/**
 * Slot List Cloud Function
 * 拳手浏览可用时间段云函数
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
    console.error('[SlotList] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[SlotList] openid:', openid.substring(0, 8) + '...');

  // 获取筛选参数
  const { date_from, date_to, gym_id, city } = event;

  try {
    // 构建查询条件
    let conditions = [{ status: 'active' }];

    // 日期范围筛选
    if (date_from) {
      conditions.push({
        date: db.command.gte(date_from)
      });
    }
    if (date_to) {
      conditions.push({
        date: db.command.lte(date_to)
      });
    }

    // 默认只显示未来一周的
    if (!date_from && !date_to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStr = today.toISOString().split('T')[0];
      conditions.push({
        date: db.command.gte(dateStr)
      });
    }

    // 拳馆筛选
    if (gym_id) {
      conditions.push({ gym_id });
    }

    // 查询时间段列表
    const slotsResult = await db.collection('gym_slots')
      .where(db.command.and(conditions))
      .orderBy('date', 'asc')
      .orderBy('start_time', 'asc')
      .limit(100)
      .get();

    // 获取所有相关的 gym_id
    const gymIds = [...new Set(slotsResult.data.map(slot => slot.gym_id))];

    // 查询拳馆信息
    let gymsMap = {};
    if (gymIds.length > 0) {
      // 构建批量查询条件
      const gymPromises = gymIds.map(gid =>
        db.collection('gyms').where({ gym_id: gid, status: 'approved' }).get()
      );
      const gymResults = await Promise.all(gymPromises);

      gymResults.forEach(result => {
        result.data.forEach(gym => {
          // 城市筛选
          if (!city || gym.city === city) {
            gymsMap[gym.gym_id] = {
              gym_id: gym.gym_id,
              name: gym.name,
              address: gym.address,
              city: gym.city,
              icon_url: gym.icon_url
            };
          }
        });
      });
    }

    // 获取当前用户的拳手档案（用于检查是否已预约）
    const boxerResult = await db.collection('boxers').where({ user_id: openid }).get();
    const currentBoxerId = boxerResult.data.length > 0 ? boxerResult.data[0].boxer_id : null;

    // 获取每个时间段的预约数和检查用户是否已预约
    const slots = await Promise.all(slotsResult.data.map(async (slot) => {
      // 检查拳馆是否存在（考虑城市筛选）
      const gymInfo = gymsMap[slot.gym_id];
      if (!gymInfo) {
        return null; // 跳过不符合条件的拳馆
      }

      // 查询当前预约数
      const bookingsCount = await db.collection('slot_bookings')
        .where({
          slot_id: slot.slot_id,
          status: 'active'
        })
        .count();

      const currentBookings = bookingsCount.total || 0;

      // 检查当前用户是否已预约
      let isBooked = false;
      if (currentBoxerId) {
        const myBooking = await db.collection('slot_bookings')
          .where({
            slot_id: slot.slot_id,
            boxer_id: currentBoxerId,
            status: 'active'
          })
          .get();
        isBooked = myBooking.data.length > 0;
      }

      return {
        slot_id: slot.slot_id,
        gym: gymInfo,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_boxers: slot.max_boxers,
        current_bookings: currentBookings,
        available_spots: slot.max_boxers - currentBookings,
        status: slot.status,
        is_booked: isBooked
      };
    }));

    // 过滤掉 null 值（不符合城市筛选的）
    const validSlots = slots.filter(slot => slot !== null);

    console.log('[SlotList] 查询成功, slots count:', validSlots.length);

    return successResponse({
      slots: validSlots,
      total: validSlots.length
    });

  } catch (e) {
    console.error('[SlotList] 查询失败:', e);
    return errorResponse(6050, '查询可用时间段失败');
  }
};

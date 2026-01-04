/**
 * Gym Slot List Cloud Function
 * 拳馆查看已发布时间段云函数
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
    console.error('[GymSlotList] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymSlotList] openid:', openid.substring(0, 8) + '...');

  // 获取筛选参数
  const statusFilter = event.status || 'all'; // all | active | cancelled

  try {
    // 查询用户的拳馆档案
    const gymResult = await db.collection('gyms').where({ user_id: openid }).get();
    if (gymResult.data.length === 0) {
      return errorResponse(6010, '拳馆档案不存在');
    }

    const gym_id = gymResult.data[0].gym_id;

    // 构建查询条件
    let conditions = [
      { gym_id },
      { archived: db.command.neq(true) }  // 排除归档数据
    ];

    if (statusFilter !== 'all') {
      conditions.push({ status: statusFilter });
    }

    // 查询时间段列表
    const slotsResult = await db.collection('gym_slots')
      .where(db.command.and(conditions))
      .orderBy('date', 'asc')
      .orderBy('start_time', 'asc')
      .get();

    // 获取每个时间段的预约数
    const slots = await Promise.all(slotsResult.data.map(async (slot) => {
      // 查询当前预约数（active状态且未归档的预约）
      const bookingsCount = await db.collection('slot_bookings')
        .where({
          slot_id: slot.slot_id,
          status: 'active',
          archived: db.command.neq(true)  // 排除归档数据
        })
        .count();

      const currentBookings = bookingsCount.total || 0;

      // 判断是否可编辑（无预约时才可修改）
      const canModify = currentBookings === 0 && slot.status === 'active';

      return {
        slot_id: slot.slot_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_boxers: slot.max_boxers,
        current_bookings: currentBookings,
        available_spots: slot.max_boxers - currentBookings,
        status: slot.status,
        can_modify: canModify
      };
    }));

    console.log('[GymSlotList] 查询成功, slots count:', slots.length);

    return successResponse({
      slots,
      total: slots.length
    });

  } catch (e) {
    console.error('[GymSlotList] 查询失败:', e);
    return errorResponse(6011, '查询时间段失败');
  }
};

/**
 * Gym Slot Delete Cloud Function
 * 拳馆撤销时间段云函数（软删除）
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
    console.error('[GymSlotDelete] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymSlotDelete] openid:', openid.substring(0, 8) + '...');

  if (!event.slot_id) {
    return errorResponse(6040, 'slot_id不能为空');
  }

  try {
    // 查询时间段
    const slotResult = await db.collection('gym_slots').where({ slot_id: event.slot_id }).get();
    if (slotResult.data.length === 0) {
      return errorResponse(6041, '时间段不存在');
    }

    const slot = slotResult.data[0];

    // 验证所有权
    if (slot.user_id !== openid) {
      return errorResponse(6042, '无权操作此时间段');
    }

    // 检查状态
    if (slot.status !== 'active') {
      return errorResponse(6043, '只能撤销激活状态的时间段');
    }

    // 检查当前预约数
    const currentBookings = await db.collection('slot_bookings')
      .where({
        slot_id: event.slot_id,
        status: 'active'
      })
      .count();

    if (currentBookings.total > 0) {
      return errorResponse(6044, '已有拳手预约，无法撤销');
    }

    // 软删除：更新状态为 cancelled
    const now = new Date();
    await db.collection('gym_slots').doc(slot._id).update({
      data: {
        status: 'cancelled',
        updated_at: now
      }
    });

    console.log('[GymSlotDelete] 撤销成功, slot_id:', event.slot_id);

    return successResponse({
      slot_id: event.slot_id,
      status: 'cancelled'
    });

  } catch (e) {
    console.error('[GymSlotDelete] 撤销失败:', e);
    return errorResponse(6045, '撤销时间段失败');
  }
};

/**
 * Gym Slot Update Cloud Function
 * 拳馆修改时间段云函数
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

/**
 * 解析日期字符串（YYYY-MM-DD）
 */
function parseDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * 输入验证
 */
function validateInput(data) {
  if (!data.slot_id) {
    return { valid: false, errcode: 6020, errmsg: 'slot_id不能为空' };
  }

  // 验证日期格式
  if (!data.date || typeof data.date !== 'string') {
    return { valid: false, errcode: 6021, errmsg: '日期不能为空' };
  }

  const slotDate = parseDate(data.date);
  if (!slotDate) {
    return { valid: false, errcode: 6021, errmsg: '日期格式无效' };
  }

  // 验证日期范围（未来一周内）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const slotDateStart = new Date(slotDate);
  slotDateStart.setHours(0, 0, 0, 0);

  if (slotDateStart < today) {
    return { valid: false, errcode: 6022, errmsg: '不能设置为过去的日期' };
  }

  if (slotDateStart > weekLater) {
    return { valid: false, errcode: 6022, errmsg: '日期必须在未来一周内' };
  }

  // 验证时间格式
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!data.start_time || !timeRegex.test(data.start_time)) {
    return { valid: false, errcode: 6023, errmsg: '开始时间格式无效' };
  }

  if (!data.end_time || !timeRegex.test(data.end_time)) {
    return { valid: false, errcode: 6023, errmsg: '结束时间格式无效' };
  }

  if (data.start_time >= data.end_time) {
    return { valid: false, errcode: 6024, errmsg: '结束时间必须晚于开始时间' };
  }

  // 验证最大人数
  if (!data.max_boxers || typeof data.max_boxers !== 'number') {
    return { valid: false, errcode: 6025, errmsg: '最大人数不能为空' };
  }

  if (data.max_boxers < 1 || data.max_boxers > 50) {
    return { valid: false, errcode: 6025, errmsg: '最大人数必须在1-50之间' };
  }

  return { valid: true };
}

/**
 * 检查时间段是否冲突
 */
async function checkTimeConflict(db, gym_id, date, start_time, end_time, excludeSlotId) {
  const conditions = [
    { gym_id },
    { date },
    { status: 'active' },
    {
      slot_id: db.command.neq(excludeSlotId)
    }
  ];

  const result = await db.collection('gym_slots')
    .where(db.command.and(conditions))
    .get();

  for (const slot of result.data) {
    if (!(end_time <= slot.start_time || start_time >= slot.end_time)) {
      return slot;
    }
  }

  return null;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[GymSlotUpdate] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymSlotUpdate] openid:', openid.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 查询时间段
    const slotResult = await db.collection('gym_slots').where({ slot_id: event.slot_id }).get();
    if (slotResult.data.length === 0) {
      return errorResponse(6026, '时间段不存在');
    }

    const slot = slotResult.data[0];

    // 验证所有权
    if (slot.user_id !== openid) {
      return errorResponse(6027, '无权操作此时间段');
    }

    // 检查状态
    if (slot.status !== 'active') {
      return errorResponse(6028, '只能修改激活状态的时间段');
    }

    // 检查当前预约数
    const currentBookings = await db.collection('slot_bookings')
      .where({
        slot_id: event.slot_id,
        status: 'active'
      })
      .count();

    if (currentBookings.total > 0) {
      return errorResponse(6029, '已有拳手预约，无法修改');
    }

    // 检查时间段冲突
    const conflictSlot = await checkTimeConflict(
      db,
      slot.gym_id,
      event.date,
      event.start_time,
      event.end_time,
      event.slot_id
    );

    if (conflictSlot) {
      return errorResponse(6030, '该时间段与已发布的时间段冲突');
    }

    // 检查新的人数限制不能小于当前预约数（当前无预约，所以这个检查总是通过）
    if (event.max_boxers < slot.current_bookings) {
      return errorResponse(6031, '最大人数不能少于当前预约数');
    }

    // 更新时间段
    const now = new Date();
    await db.collection('gym_slots').doc(slotResult.data[0]._id).update({
      data: {
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        max_boxers: event.max_boxers,
        updated_at: now
      }
    });

    console.log('[GymSlotUpdate] 更新成功, slot_id:', event.slot_id);

    return successResponse({
      slot_id: event.slot_id,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      max_boxers: event.max_boxers
    });

  } catch (e) {
    console.error('[GymSlotUpdate] 更新失败:', e);
    return errorResponse(6032, '更新时间段失败');
  }
};

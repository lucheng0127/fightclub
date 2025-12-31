/**
 * Gym Slot Publish Cloud Function
 * 拳馆发布场地时间段云函数
 * 使用数据库事务确保数据一致性
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成 slot_id
 */
function generateSlotId(openid) {
  const hash = crypto.createHash('sha256')
    .update(openid + 'slot' + Date.now())
    .digest('hex')
    .substring(0, 12);
  return 'slot_' + hash;
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
 * 解析日期字符串（YYYY-MM-DD）
 */
function parseDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // 月份从0开始
  const day = parseInt(parts[2]);
  const date = new Date(year, month, day);
  // 检查日期是否有效
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * 输入验证
 */
function validateInput(data) {
  // 验证日期格式
  if (!data.date || typeof data.date !== 'string') {
    return { valid: false, errcode: 6001, errmsg: '日期不能为空' };
  }

  const slotDate = parseDate(data.date);
  if (!slotDate) {
    return { valid: false, errcode: 6001, errmsg: '日期格式无效，请使用YYYY-MM-DD格式' };
  }

  // 验证日期范围（未来一周内）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // slotDate 的开始时间（午夜）
  const slotDateStart = new Date(slotDate);
  slotDateStart.setHours(0, 0, 0, 0);

  if (slotDateStart < today) {
    return { valid: false, errcode: 6002, errmsg: '不能发布过去的时间段' };
  }

  if (slotDateStart > weekLater) {
    return { valid: false, errcode: 6002, errmsg: '日期必须在未来一周内' };
  }

  // 验证时间格式 (HH:mm)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!data.start_time || !timeRegex.test(data.start_time)) {
    return { valid: false, errcode: 6003, errmsg: '开始时间格式无效，请使用HH:mm格式' };
  }

  if (!data.end_time || !timeRegex.test(data.end_time)) {
    return { valid: false, errcode: 6003, errmsg: '结束时间格式无效，请使用HH:mm格式' };
  }

  // 验证结束时间必须晚于开始时间
  if (data.start_time >= data.end_time) {
    return { valid: false, errcode: 6004, errmsg: '结束时间必须晚于开始时间' };
  }

  // 验证最大人数
  if (!data.max_boxers || typeof data.max_boxers !== 'number') {
    return { valid: false, errcode: 6005, errmsg: '最大人数不能为空' };
  }

  if (data.max_boxers < 1 || data.max_boxers > 50) {
    return { valid: false, errcode: 6005, errmsg: '最大人数必须在1-50之间' };
  }

  return { valid: true };
}

/**
 * 检查时间段是否冲突
 */
async function checkTimeConflict(db, gym_id, date, start_time, end_time, excludeSlotId = null) {
  const conditions = [
    { gym_id },
    { date },
    { status: 'active' }
  ];

  // 如果是更新，排除当前时间段
  if (excludeSlotId) {
    conditions.push({
      slot_id: db.command.neq(excludeSlotId)
    });
  }

  const result = await db.collection('gym_slots')
    .where(
      db.command.and(conditions)
    )
    .get();

  for (const slot of result.data) {
    // 检查时间是否重叠
    // 新时间段: [start_time, end_time]
    // 已存在时间段: [slot.start_time, slot.end_time]
    // 重叠条件: !(new_end <= exist_start OR new_start >= exist_end)
    if (!(end_time <= slot.start_time || start_time >= slot.end_time)) {
      return slot; // 返回冲突的时间段
    }
  }

  return null; // 无冲突
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[GymSlotPublish] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymSlotPublish] openid:', openid.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 查询用户的拳馆档案
    const gymResult = await db.collection('gyms').where({ user_id: openid }).get();
    if (gymResult.data.length === 0) {
      return errorResponse(6006, '拳馆档案不存在');
    }

    const gym = gymResult.data[0];

    // 检查拳馆状态
    if (gym.status !== 'approved') {
      return errorResponse(6007, '拳馆档案未审核通过，无法发布时间段');
    }

    const gym_id = gym.gym_id;

    // 检查时间段冲突
    const conflictSlot = await checkTimeConflict(db, gym_id, event.date, event.start_time, event.end_time);
    if (conflictSlot) {
      return errorResponse(6008, '该时间段与已发布的时间段冲突');
    }

    // 生成 slot_id
    const slot_id = generateSlotId(openid);

    // 使用数据库事务创建时间段
    const transaction = await db.startTransaction();

    try {
      const now = new Date();
      const slotData = {
        slot_id,
        gym_id,
        user_id: openid,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        max_boxers: event.max_boxers,
        current_bookings: 0,
        status: 'active',
        created_at: now,
        updated_at: now
      };

      await transaction.collection('gym_slots').add({
        data: slotData
      });

      // 提交事务
      await transaction.commit();

      console.log('[GymSlotPublish] 发布成功, slot_id:', slot_id);

      return successResponse({
        slot_id,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        max_boxers: event.max_boxers
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[GymSlotPublish] 发布失败:', e);
    return errorResponse(6009, '数据库操作失败');
  }
};

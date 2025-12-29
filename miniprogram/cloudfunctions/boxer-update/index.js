/**
 * Boxer Update Cloud Function
 * 更新拳手档案云函数
 * 更新现有拳手档案信息
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 通用成功响应
 */
function successResponse(data) {
  return {
    errcode: 0,
    errmsg: 'success',
    data
  };
}

/**
 * 通用错误响应
 */
function errorResponse(errcode, errmsg) {
  return {
    errcode,
    errmsg
  };
}

/**
 * 输入验证
 */
function validateInput(data) {
  // 必填字段
  if (!data.nickname || data.nickname.trim() === '') {
    return { valid: false, errcode: 2001, errmsg: '昵称不能为空' };
  }

  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    return { valid: false, errcode: 2002, errmsg: '性别值无效' };
  }

  if (!data.birthdate) {
    return { valid: false, errcode: 2004, errmsg: '出生日期不能为空' };
  }

  const birthDate = new Date(data.birthdate);
  if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
    return { valid: false, errcode: 2004, errmsg: '出生日期无效' };
  }

  if (!data.height || data.height < 100 || data.height > 250) {
    return { valid: false, errcode: 2003, errmsg: '身高必须在100-250厘米之间' };
  }

  if (!data.weight || data.weight < 30 || data.weight > 200) {
    return { valid: false, errcode: 2003, errmsg: '体重必须在30-200公斤之间' };
  }

  return { valid: true };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[BoxerUpdate] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[BoxerUpdate] openid:', openid.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 检查拳手档案是否存在
    const existingBoxer = await db.collection('boxers').where({ user_id: openid }).get();
    if (existingBoxer.data.length === 0) {
      return errorResponse(2008, '拳手档案不存在');
    }

    const boxer = existingBoxer.data[0];

    // 如果提供了 gym_id，验证拳馆是否存在
    if (event.gym_id && event.gym_id !== boxer.gym_id) {
      const gymCheck = await db.collection('gyms').where({ gym_id: event.gym_id }).get();
      if (gymCheck.data.length === 0) {
        return errorResponse(2006, '关联的拳馆不存在');
      }
    }

    // 更新拳手档案
    const now = new Date();
    const updateData = {
      nickname: event.nickname.trim(),
      gender: event.gender,
      birthdate: event.birthdate,
      height: event.height,
      weight: event.weight,
      city: event.city || null,
      gym_id: event.gym_id || null,
      phone: event.phone || null,
      record_wins: event.record_wins || 0,
      record_losses: event.record_losses || 0,
      record_draws: event.record_draws || 0,
      updated_at: now
    };

    await db.collection('boxers').doc(boxer._id).update({
      data: updateData
    });

    console.log('[BoxerUpdate] 更新成功, boxer_id:', boxer.boxer_id);

    return successResponse({
      boxer_id: boxer.boxer_id,
      profile: { ...boxer, ...updateData }
    });

  } catch (e) {
    console.error('[BoxerUpdate] 更新失败:', e);
    return errorResponse(2010, '更新拳手档案失败');
  }
};

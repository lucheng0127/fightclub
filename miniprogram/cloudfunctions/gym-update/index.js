/**
 * Gym Update Cloud Function
 * 更新拳馆档案云函数
 * 更新现有拳馆档案信息
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
  if (!data.name || data.name.trim() === '') {
    return { valid: false, errcode: 3001, errmsg: '拳馆名称不能为空' };
  }

  if (!data.address || data.address.trim() === '') {
    return { valid: false, errcode: 3002, errmsg: '地址不能为空' };
  }

  // location 必须包含 latitude 和 longitude
  if (!data.location || typeof data.location.latitude !== 'number' || typeof data.location.longitude !== 'number') {
    return { valid: false, errcode: 3003, errmsg: '位置信息无效' };
  }

  // 验证经纬度范围
  if (data.location.latitude < -90 || data.location.latitude > 90) {
    return { valid: false, errcode: 3003, errmsg: '纬度无效' };
  }
  if (data.location.longitude < -180 || data.location.longitude > 180) {
    return { valid: false, errcode: 3003, errmsg: '经度无效' };
  }

  if (!data.phone || data.phone.trim() === '') {
    return { valid: false, errcode: 3004, errmsg: '联系电话不能为空' };
  }

  return { valid: true };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[GymUpdate] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymUpdate] openid:', openid.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 检查拳馆档案是否存在
    const existingGym = await db.collection('gyms').where({ user_id: openid }).get();
    if (existingGym.data.length === 0) {
      return errorResponse(3008, '拳馆档案不存在');
    }

    const gym = existingGym.data[0];

    // 更新拳馆档案
    const now = new Date();
    const updateData = {
      name: event.name.trim(),
      address: event.address.trim(),
      location: {
        latitude: event.location.latitude,
        longitude: event.location.longitude
      },
      city: event.city || null,
      phone: event.phone.trim(),
      icon_url: event.icon_url || null,
      updated_at: now
    };

    await db.collection('gyms').doc(gym._id).update({
      data: updateData
    });

    console.log('[GymUpdate] 更新成功, gym_id:', gym.gym_id);

    return successResponse({
      gym_id: gym.gym_id,
      profile: { ...gym, ...updateData }
    });

  } catch (e) {
    console.error('[GymUpdate] 更新失败:', e);
    return errorResponse(3010, '更新拳馆档案失败');
  }
};

/**
 * Gym Get Cloud Function
 * 获取拳馆档案云函数
 * 根据用户ID获取拳馆档案信息
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[GymGet] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymGet] openid:', openid.substring(0, 8) + '...');

  try {
    // 查询拳馆档案
    const res = await db.collection('gyms').where({ user_id: openid }).get();

    if (res.data.length === 0) {
      console.log('[GymGet] 拳馆档案不存在');
      return errorResponse(3008, '拳馆档案不存在');
    }

    const gym = res.data[0];
    console.log('[GymGet] 获取成功, gym_id:', gym.gym_id);

    return successResponse({
      gym_id: gym.gym_id,
      name: gym.name,
      address: gym.address,
      location: gym.location,
      city: gym.city,
      phone: gym.phone,
      icon_url: gym.icon_url,
      created_at: gym.created_at,
      updated_at: gym.updated_at
    });

  } catch (e) {
    console.error('[GymGet] 查询失败:', e);
    return errorResponse(3009, '查询拳馆档案失败');
  }
};

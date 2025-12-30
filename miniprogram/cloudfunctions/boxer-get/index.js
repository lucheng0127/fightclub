/**
 * Boxer Get Cloud Function
 * 获取拳手档案云函数
 * 根据用户ID获取拳手档案信息
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
  const { boxer_id } = event;

  if (!openid) {
    console.error('[BoxerGet] 无法获取openid');
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[BoxerGet] openid:', openid.substring(0, 8) + '...', 'boxer_id:', boxer_id || '(own profile)');

  try {
    let res;

    // 如果提供了 boxer_id，查询指定拳手档案（用于查看他人档案）
    // 否则查询当前用户的拳手档案
    if (boxer_id) {
      res = await db.collection('boxers').where({ boxer_id }).get();
    } else {
      res = await db.collection('boxers').where({ user_id: openid }).get();
    }

    if (res.data.length === 0) {
      console.log('[BoxerGet] 拳手档案不存在');
      return errorResponse(2008, '拳手档案不存在');
    }

    const boxer = res.data[0];
    console.log('[BoxerGet] 获取成功, boxer_id:', boxer.boxer_id);

    // 判断是否为当前用户自己的档案
    const isOwnProfile = boxer.user_id === openid;

    return successResponse({
      boxer_id: boxer.boxer_id,
      nickname: boxer.nickname,
      gender: boxer.gender,
      birthdate: boxer.birthdate,
      height: boxer.height,
      weight: boxer.weight,
      city: boxer.city,
      gym_id: boxer.gym_id,
      phone: boxer.phone,
      record_wins: boxer.record_wins || 0,
      record_losses: boxer.record_losses || 0,
      record_draws: boxer.record_draws || 0,
      created_at: boxer.created_at,
      updated_at: boxer.updated_at,
      is_own_profile: isOwnProfile
    });

  } catch (e) {
    console.error('[BoxerGet] 查询失败:', e);
    return errorResponse(2009, '查询拳手档案失败');
  }
};

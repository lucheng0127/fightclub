/**
 * Admin Add Cloud Function
 * 添加管理员（仅超级管理员）
 * 通过 user_id（哈希值）查找用户并添加为管理员
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

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
    console.error('[AdminAdd] 无法获取openid');
    return errorResponse(6001, '无法获取用户信息');
  }

  const { user_id, nickname, superadmin = false } = event;

  if (!user_id) {
    return errorResponse(6005, '缺少参数 user_id');
  }

  console.log('[AdminAdd] 添加管理员, openid:', openid.substring(0, 8) + '...', 'user_id:', user_id);

  try {
    // 首先检查当前用户是否是超级管理员
    const currentAdminRes = await db.collection('admins').where({ openid }).get();

    if (currentAdminRes.data.length === 0) {
      return errorResponse(6002, '无权限访问');
    }

    const currentAdmin = currentAdminRes.data[0];
    if (!currentAdmin.superadmin) {
      return errorResponse(6003, '仅超级管理员可添加管理员');
    }

    // 通过 user_id 查找用户的 openid
    // 需要遍历 users 集合，计算每个用户的 hashOpenID 进行匹配
    const usersRes = await db.collection('users').limit(1000).get();
    let targetOpenid = null;

    for (const user of usersRes.data) {
      const hashedId = crypto.createHash('sha256')
        .update(user.openid + 'fightclub-salt-v1')
        .digest('hex')
        .substring(0, 16);

      if (hashedId === user_id) {
        targetOpenid = user.openid;
        break;
      }
    }

    if (!targetOpenid) {
      return errorResponse(6006, '未找到指定用户');
    }

    // 检查该用户是否已经是管理员
    const existingAdminRes = await db.collection('admins').where({ openid: targetOpenid }).get();
    if (existingAdminRes.data.length > 0) {
      return errorResponse(6007, '该用户已是管理员');
    }

    // 添加管理员
    const now = new Date();
    await db.collection('admins').add({
      data: {
        openid: targetOpenid,
        nickname: nickname || null,
        superadmin: superadmin,
        created_at: now,
        created_by: openid
      }
    });

    console.log('[AdminAdd] 添加成功');

    return successResponse({
      success: true,
      user_id: user_id,
      nickname: nickname,
      superadmin: superadmin
    });

  } catch (e) {
    console.error('[AdminAdd] 添加失败:', e);
    return errorResponse(6008, '添加管理员失败');
  }
};

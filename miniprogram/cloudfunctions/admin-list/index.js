/**
 * Admin List Cloud Function
 * 获取管理员列表（仅超级管理员）
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成匿名用户ID（基于OpenID的非可逆哈希）
 */
function hashOpenID(openid) {
  const salt = 'fightclub-salt-v1';
  return crypto.createHash('sha256')
    .update(openid + salt)
    .digest('hex')
    .substring(0, 16);
}

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
    return errorResponse(6001, '无法获取用户信息');
  }

  try {
    // 检查当前用户是否是超级管理员
    const currentAdminRes = await db.collection('admins').where({ openid }).get();

    if (currentAdminRes.data.length === 0) {
      return errorResponse(6002, '无权限访问');
    }

    const currentAdmin = currentAdminRes.data[0];
    if (!currentAdmin.superadmin) {
      return errorResponse(6003, '仅超级管理员可查看管理员列表');
    }

    // 获取所有管理员
    const adminsRes = await db.collection('admins').orderBy('created_at', 'desc').get();

    // 获取所有用户信息，用于获取nickname
    const usersRes = await db.collection('users').limit(1000).get();
    const userMap = new Map();
    for (const user of usersRes.data) {
      userMap.set(user.openid, user);
    }

    const admins = adminsRes.data.map(admin => {
      const userInfo = userMap.get(admin.openid);
      return {
        admin_id: admin._id,
        user_id: hashOpenID(admin.openid),
        nickname: admin.nickname || (userInfo ? userInfo.nickname : null),
        superadmin: admin.superadmin || false,
        created_at: admin.created_at,
        is_current: admin.openid === openid
      };
    });

    return successResponse({
      admins,
      total: admins.length
    });

  } catch (e) {
    return errorResponse(6004, '查询管理员列表失败');
  }
};

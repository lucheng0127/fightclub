/**
 * Admin Check Cloud Function
 * 检查当前用户是否是管理员
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
    console.error('[AdminCheck] 无法获取openid');
    return errorResponse(5001, '无法获取用户信息');
  }

  console.log('[AdminCheck] 检查管理员状态, openid:', openid.substring(0, 8) + '...');

  try {
    // 检查是否是管理员
    const adminRes = await db.collection('admins').where({ openid }).get();

    if (adminRes.data.length === 0) {
      // 不是管理员
      return successResponse({
        is_admin: false,
        is_superadmin: false
      });
    }

    const admin = adminRes.data[0];
    return successResponse({
      is_admin: true,
      is_superadmin: admin.superadmin || false
    });

  } catch (e) {
    console.error('[AdminCheck] 查询失败:', e);
    return errorResponse(5002, '查询管理员状态失败');
  }
};

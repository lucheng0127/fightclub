/**
 * Admin Remove Cloud Function
 * 移除管理员（仅超级管理员）
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
    console.error('[AdminRemove] 无法获取openid');
    return errorResponse(6001, '无法获取用户信息');
  }

  const { admin_id } = event;

  if (!admin_id) {
    return errorResponse(6009, '缺少参数 admin_id');
  }

  console.log('[AdminRemove] 移除管理员, openid:', openid.substring(0, 8) + '...', 'admin_id:', admin_id);

  try {
    // 首先检查当前用户是否是超级管理员
    const currentAdminRes = await db.collection('admins').where({ openid }).get();

    if (currentAdminRes.data.length === 0) {
      return errorResponse(6002, '无权限访问');
    }

    const currentAdmin = currentAdminRes.data[0];
    if (!currentAdmin.superadmin) {
      return errorResponse(6003, '仅超级管理员可移除管理员');
    }

    // 检查要移除的管理员是否存在
    const targetAdminRes = await db.collection('admins').doc(admin_id).get();
    if (!targetAdminRes.data) {
      return errorResponse(6010, '管理员不存在');
    }

    // 不能移除自己
    if (targetAdminRes.data.openid === openid) {
      return errorResponse(6011, '不能移除自己');
    }

    // 移除管理员
    await db.collection('admins').doc(admin_id).remove();

    console.log('[AdminRemove] 移除成功');

    return successResponse({
      success: true,
      admin_id: admin_id
    });

  } catch (e) {
    console.error('[AdminRemove] 移除失败:', e);
    return errorResponse(6012, '移除管理员失败');
  }
};

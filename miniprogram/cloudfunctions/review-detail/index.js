/**
 * Review Detail Cloud Function
 * 获取审核详情（管理员和超级管理员）
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
    console.error('[ReviewDetail] 无法获取openid');
    return errorResponse(7001, '无法获取用户信息');
  }

  const { review_id } = event;

  if (!review_id) {
    return errorResponse(7004, '缺少参数 review_id');
  }

  console.log('[ReviewDetail] 获取审核详情, openid:', openid.substring(0, 8) + '...', 'review_id:', review_id);

  try {
    // 首先检查当前用户是否是管理员
    const adminRes = await db.collection('admins').where({ openid }).get();

    if (adminRes.data.length === 0) {
      return errorResponse(7002, '无权限访问');
    }

    // 获取审核详情
    const reviewRes = await db.collection('gym_reviews').doc(review_id).get();

    if (!reviewRes.data) {
      return errorResponse(7005, '审核记录不存在');
    }

    const review = reviewRes.data;

    return successResponse({
      review_id: review._id,
      gym_id: review.gym_id,
      user_id: review.user_id,
      name: review.name,
      address: review.address,
      location: review.location,
      phone: review.phone,
      icon_url: review.icon_url,
      city: review.city,
      status: review.status,
      submitted_at: review.submitted_at,
      reviewed_at: review.reviewed_at,
      reviewed_by: review.reviewed_by,
      reject_reason: review.reject_reason
    });

  } catch (e) {
    console.error('[ReviewDetail] 查询失败:', e);
    return errorResponse(7006, '查询审核详情失败');
  }
};

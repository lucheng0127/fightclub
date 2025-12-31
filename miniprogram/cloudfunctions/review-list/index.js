/**
 * Review List Cloud Function
 * 获取待审核列表（管理员和超级管理员）
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
    console.error('[ReviewList] 无法获取openid');
    return errorResponse(7001, '无法获取用户信息');
  }

  const { status = 'pending', page = 1, limit = 20 } = event;

  console.log('[ReviewList] 获取审核列表, openid:', openid.substring(0, 8) + '...', 'status:', status);

  try {
    // 首先检查当前用户是否是管理员
    const adminRes = await db.collection('admins').where({ openid }).get();

    if (adminRes.data.length === 0) {
      return errorResponse(7002, '无权限访问');
    }

    // 构建查询条件
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // 获取总数
    const countResult = await db.collection('gym_reviews').where(where).count();
    const total = countResult.total;

    // 获取审核列表
    const skip = (page - 1) * limit;
    const result = await db.collection('gym_reviews')
      .where(where)
      .orderBy('submitted_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    const reviews = result.data.map(review => ({
      review_id: review._id,
      gym_id: review.gym_id,
      user_id: review.user_id,
      name: review.name,
      address: review.address,
      phone: review.phone,
      city: review.city,
      status: review.status,
      submitted_at: review.submitted_at,
      reviewed_at: review.reviewed_at,
      reject_reason: review.reject_reason
    }));

    console.log('[ReviewList] 查询成功, count:', reviews.length, 'total:', total);

    return successResponse({
      list: reviews,
      total: total,
      page: page,
      limit: limit,
      has_more: skip + reviews.length < total
    });

  } catch (e) {
    console.error('[ReviewList] 查询失败:', e);
    return errorResponse(7003, '查询审核列表失败');
  }
};

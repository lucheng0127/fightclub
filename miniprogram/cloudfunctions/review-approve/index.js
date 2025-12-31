/**
 * Review Approve Cloud Function
 * 审核通过（管理员和超级管理员）
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
    console.error('[ReviewApprove] 无法获取openid');
    return errorResponse(7001, '无法获取用户信息');
  }

  const { review_id } = event;

  if (!review_id) {
    return errorResponse(7007, '缺少参数 review_id');
  }

  console.log('[ReviewApprove] 审核通过, openid:', openid.substring(0, 8) + '...', 'review_id:', review_id);

  try {
    // 首先检查当前用户是否是管理员
    const adminRes = await db.collection('admins').where({ openid }).get();

    if (adminRes.data.length === 0) {
      return errorResponse(7002, '无权限访问');
    }

    // 使用事务更新
    const transaction = await db.startTransaction();

    try {
      const now = new Date();

      // 1. 更新 gym_reviews
      const reviewRes = await transaction.collection('gym_reviews').doc(review_id).get();
      if (!reviewRes.data) {
        await transaction.rollback();
        return errorResponse(7005, '审核记录不存在');
      }

      if (reviewRes.data.status !== 'pending') {
        await transaction.rollback();
        return errorResponse(7008, '该申请已处理');
      }

      await transaction.collection('gym_reviews').doc(review_id).update({
        data: {
          status: 'approved',
          reviewed_at: now,
          reviewed_by: openid
        }
      });

      // 2. 更新 gyms
      const gymRes = await transaction.collection('gyms').where({ gym_id: reviewRes.data.gym_id }).get();
      if (gymRes.data.length > 0) {
        await transaction.collection('gyms').doc(gymRes.data[0]._id).update({
          data: {
            status: 'approved',
            reviewed_at: now,
            reviewed_by: openid
          }
        });
      }

      // 提交事务
      await transaction.commit();

      console.log('[ReviewApprove] 审核通过成功');

      return successResponse({
        success: true,
        review_id: review_id,
        gym_id: reviewRes.data.gym_id
      });

    } catch (transError) {
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[ReviewApprove] 审核失败:', e);
    return errorResponse(7009, '审核操作失败');
  }
};

/**
 * Stats Cloud Function
 * 统计云函数
 * 获取平台统计数据（拳手数量、拳馆数量）
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

  console.log('[Stats] openid:', openid.substring(0, 8) + '...');

  try {
    // 从计数器集合中获取统计数据
    const boxerCounterResult = await db.collection('counters').doc('boxer_count').get();
    const gymCounterResult = await db.collection('counters').doc('gym_count').get();

    const boxerCount = boxerCounterResult.data ? boxerCounterResult.data.count || 0 : 0;
    const gymCount = gymCounterResult.data ? gymCounterResult.data.count || 0 : 0;

    console.log('[Stats] 查询成功, boxer_count:', boxerCount, 'gym_count:', gymCount);

    return successResponse({
      boxer_count: boxerCount,
      gym_count: gymCount
    });

  } catch (e) {
    console.error('[Stats] 查询失败:', e);
    return errorResponse(4001, '获取统计数据失败');
  }
};

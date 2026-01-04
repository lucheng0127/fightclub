/**
 * Cloud Function Request Wrapper
 * 封装云函数调用，统一处理错误和加载状态
 */

/**
 * 云函数名称映射
 * 将路径风格名称转换为实际的云函数文件夹名
 * 注意：微信云函数只支持单层文件夹名，不支持路径
 */
const FUNCTION_NAME_MAP = {
  'auth/login': 'login',
  'boxer/create': 'boxer-create',
  'boxer/update': 'boxer-update',
  'boxer/get': 'boxer-get',
  'boxer/list': 'boxer-list',
  'gym/create': 'gym-create',
  'gym/update': 'gym-update',
  'gym/get': 'gym-get',
  'gym/list': 'gym-list',
  'gym/user/list': 'gym-user-list',
  'gym/transfer': 'gym-transfer',
  'gym/slot/list': 'gym-slot-list',
  'gym/slot/publish': 'gym-slot-publish',
  'gym/slot/update': 'gym-slot-update',
  'gym/slot/delete': 'gym-slot-delete',
  'common/stats': 'stats',
  'common/upload': 'common-upload',
  'admin/check': 'admin-check',
  'admin/list': 'admin-list',
  'admin/add': 'admin-add',
  'admin/remove': 'admin-remove',
  'user/list': 'user-list',
  'review/list': 'review-list',
  'review/detail': 'review-detail',
  'review/approve': 'review-approve',
  'review/reject': 'review-reject',
  'slot/book': 'slot-book',
  'slot/cancel': 'slot-cancel',
  'slot/list': 'slot-list',
  'slot/bookings': 'slot-bookings',
  'notification/list': 'notification-list',
  'notification/read': 'notification-read',
  'notification/send': 'notification-send',
  'my/bookings': 'my-bookings'
};

/**
 * 获取实际的云函数名称
 * @param {string} name - 路径风格的云函数名
 * @returns {string} 实际的云函数文件夹名
 */
function getActualFunctionName(name) {
  return FUNCTION_NAME_MAP[name] || name;
}

/**
 * 调用云函数
 * @param {string} name - 云函数名称（支持路径风格）
 * @param {object} data - 传递给云函数的数据
 * @param {object} options - 额外选项 {showLoading: boolean}
 * @returns {Promise} 返回云函数调用结果
 */
function callFunction(name, data = {}, options = {}) {
  const { showLoading = false } = options;
  const actualName = getActualFunctionName(name);

  console.log(`[callFunction] 调用云函数: ${name} -> ${actualName}`, data);

  if (showLoading) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
  }

  return wx.cloud.callFunction({
    name: actualName,
    data
  }).then(res => {
    console.log(`[callFunction] 云函数响应: ${actualName}`, res);

    if (showLoading) {
      wx.hideLoading();
    }

    if (res.result.errcode !== 0) {
      // 业务错误
      const error = new Error(res.result.errmsg || '请求失败');
      error.errcode = res.result.errcode;
      error.errmsg = res.result.errmsg;
      throw error;
    }

    return res.result.data;
  }).catch(err => {
    console.error(`[callFunction] 云函数调用失败 [${name} -> ${actualName}]:`, err);
    console.error(`[callFunction] 错误详情:`, JSON.stringify(err));

    if (showLoading) {
      wx.hideLoading();
    }

    // 显示错误提示
    wx.showToast({
      title: err.errmsg || err.message || '网络请求失败',
      icon: 'none',
      duration: 2000
    });

    throw err;
  });
}

module.exports = {
  callFunction
};

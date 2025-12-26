/**
 * Cloud Function Request Wrapper
 * 封装云函数调用，统一处理错误和加载状态
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递给云函数的数据
 * @param {object} options - 额外选项 {showLoading: boolean}
 * @returns {Promise} 返回云函数调用结果
 */
function callFunction(name, data = {}, options = {}) {
  const { showLoading = false } = options;

  if (showLoading) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
  }

  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
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
    if (showLoading) {
      wx.hideLoading();
    }

    console.error(`云函数调用失败 [${name}]:`, err);

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

/**
 * Authorization Helpers
 * 授权相关工具函数
 */

/**
 * 保存用户登录信息到本地存储
 * @param {object} userData - 用户数据 {user_id, roles, last_role}
 */
function saveAuthData(userData) {
  try {
    wx.setStorageSync('user_id', userData.user_id);
    wx.setStorageSync('roles', userData.roles);
    wx.setStorageSync('last_role', userData.last_role);
    // 同时保存独立的标志位
    wx.setStorageSync('has_boxer_profile', userData.roles.has_boxer_profile || false);
    wx.setStorageSync('has_gym_profile', userData.roles.has_gym_profile || false);
  } catch (e) {
    console.error('保存授权数据失败:', e);
  }
}

/**
 * 从本地存储获取用户ID
 * @returns {string|null} 用户ID
 */
function getUserId() {
  try {
    return wx.getStorageSync('user_id') || null;
  } catch (e) {
    console.error('获取用户ID失败:', e);
    return null;
  }
}

/**
 * 从本地存储获取用户角色信息
 * @returns {object} 角色信息 {has_boxer_profile, has_gym_profile, last_role}
 */
function getRoles() {
  try {
    return {
      has_boxer_profile: wx.getStorageSync('has_boxer_profile') || false,
      has_gym_profile: wx.getStorageSync('has_gym_profile') || false,
      last_role: wx.getStorageSync('last_role') || null
    };
  } catch (e) {
    console.error('获取角色信息失败:', e);
    return {
      has_boxer_profile: false,
      has_gym_profile: false,
      last_role: null
    };
  }
}

/**
 * 获取完整的授权数据
 * @returns {object|null} 授权数据 {user_id, roles, last_role}
 */
function getAuthData() {
  try {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      return null;
    }
    return {
      user_id,
      roles: getRoles(),
      last_role: wx.getStorageSync('last_role') || null
    };
  } catch (e) {
    console.error('获取授权数据失败:', e);
    return null;
  }
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  return !!getUserId();
}

/**
 * 检查位置授权状态
 * @returns {Promise<boolean>} 是否已授权位置
 */
function checkLocationAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        resolve(!!res.authSetting['scope.userLocation']);
      },
      fail: () => resolve(false)
    });
  });
}

/**
 * 清除本地授权数据（退出登录）
 */
function clearAuthData() {
  try {
    wx.removeStorageSync('user_id');
    wx.removeStorageSync('roles');
    wx.removeStorageSync('last_role');
    wx.removeStorageSync('has_boxer_profile');
    wx.removeStorageSync('has_gym_profile');
  } catch (e) {
    console.error('清除授权数据失败:', e);
  }
}

/**
 * 保存位置授权状态
 * @param {boolean} authorized - 是否已授权
 */
function saveLocationAuth(authorized) {
  try {
    wx.setStorageSync('location_authorized', authorized);
  } catch (e) {
    console.error('保存位置授权状态失败:', e);
  }
}

/**
 * 获取位置授权状态
 * @returns {boolean} 是否已授权位置
 */
function getLocationAuth() {
  try {
    return wx.getStorageSync('location_authorized') || false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  saveAuthData,
  getUserId,
  getRoles,
  getAuthData,
  isLoggedIn,
  checkLocationAuth,
  clearAuthData,
  saveLocationAuth,
  getLocationAuth
};

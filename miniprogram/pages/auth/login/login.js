// Login Page
const { callFunction } = require('../../../utils/request');
const { saveAuthData, saveLocationAuth, getLocationAuth } = require('../../../utils/auth');

Page({
  data: {
    loading: false,
    locationAuthorized: false,
    locationDenied: false
  },

  onLoad() {
    // 检查位置授权状态
    this.checkLocationAuth();
  },

  /**
   * 检查位置授权状态
   */
  async checkLocationAuth() {
    const authorized = await getLocationAuth();
    this.setData({ locationAuthorized: authorized });
  },

  /**
   * 获取用户信息授权
   * 注意：getUserProfile 必须直接在用户 tap 事件中调用
   */
  onGetUserInfo() {
    this.setData({ loading: true });

    // 直接调用 getUserProfile，不能放在异步回调中
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const { userInfo } = res;
        // 保存用户昵称和头像
        wx.setStorageSync('user_nickname', userInfo.nickName);
        wx.setStorageSync('user_avatar', userInfo.avatarUrl);

        // 用户信息获取成功后，再请求位置（可选）
        this.requestLocationAuth();

        // 调用登录云函数
        this.callLogin();
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '需要授权才能继续',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 请求位置授权（可选，不阻塞登录流程）
   */
  requestLocationAuth() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        // 保存位置信息
        wx.setStorageSync('user_location', { latitude, longitude });
        saveLocationAuth(true);
        this.setData({ locationAuthorized: true, locationDenied: false });
      },
      fail: (err) => {
        console.error('位置授权失败（不影响登录）:', err);
        saveLocationAuth(false);
        this.setData({ locationAuthorized: false, locationDenied: true });
      }
    });
  },

  /**
   * 调用登录云函数
   */
  async callLogin() {
    try {
      console.log('=== 开始调用登录云函数 ===');

      // 确保云环境已初始化
      if (!wx.cloud) {
        throw new Error('云环境未初始化');
      }

      const result = await callFunction('auth/login', {}, { showLoading: true });
      console.log('登录结果:', result);

      // 保存授权数据
      saveAuthData({
        user_id: result.user_id,
        roles: result.roles,
        last_role: result.last_role
      });

      // 导航到角色选择页面或主页
      this.navigateToNext(result);
    } catch (err) {
      console.error('登录失败:', err);
      this.setData({ loading: false });
    }
  },

  /**
   * 根据用户状态导航到下一页
   */
  navigateToNext(loginResult) {
    const { roles, last_role } = loginResult;
    const { has_boxer_profile, has_gym_profile } = roles;

    // 新用户：进入角色选择页面
    if (loginResult.is_new_user) {
      wx.redirectTo({
        url: '/pages/auth/role-select/role-select'
      });
      return;
    }

    // 已有角色的老用户
    if (has_boxer_profile && !has_gym_profile) {
      // 只有拳手角色，直接进入
      wx.switchTab({
        url: '/pages/common/dashboard/dashboard'
      });
    } else if (!has_boxer_profile && has_gym_profile) {
      // 只有拳馆角色，直接进入
      wx.switchTab({
        url: '/pages/common/dashboard/dashboard'
      });
    } else if (has_boxer_profile && has_gym_profile) {
      // 两个角色都有，进入角色选择页面
      wx.redirectTo({
        url: '/pages/auth/role-select/role-select'
      });
    } else {
      // 没有任何角色（理论上不应该出现），进入角色选择
      wx.redirectTo({
        url: '/pages/auth/role-select/role-select'
      });
    }
  },

  /**
   * 获取位置权限按钮点击
   */
  onGetLocation() {
    // 打开设置页面
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this.setData({ locationDenied: false });
          this.checkLocationAuth();
        }
      }
    });
  }
});

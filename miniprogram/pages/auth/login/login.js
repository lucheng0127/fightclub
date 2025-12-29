// Login Page
const { callFunction } = require('../../../utils/request');
const { saveAuthData, saveLocationAuth, getLocationAuth, getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: false,
    locationAuthorized: false,
    locationDenied: false
  },

  onLoad() {
    // 检查用户是否已经登录
    this.checkLoginStatus();
    // 检查位置授权状态
    this.checkLocationAuth();
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      const authData = getAuthData();
      if (authData && authData.user_id) {
        // 已有登录信息，导航到角色选择页面
        // 角色选择页面会从数据库获取最新状态并处理导航
        this.navigateToNext(authData);
        return;
      }

      // 没有登录信息，显示授权页面让用户授权
      console.log('用户未登录，需要授权');
    } catch (err) {
      // 登录失败，显示授权页面
      console.log('用户未登录，需要授权');
    }
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
      // 确保云环境已初始化
      if (!wx.cloud) {
        throw new Error('云环境未初始化');
      }

      const result = await callFunction('auth/login', {}, { showLoading: true });

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

    // 授权成功后，总是进入角色选择页面
    // 角色选择页面会根据用户档案情况自动导航
    wx.reLaunch({
      url: '/pages/auth/role-select/role-select'
    });
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

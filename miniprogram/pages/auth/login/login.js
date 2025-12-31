// Login Page
const { callFunction } = require('../../../utils/request');
const { saveAuthData, getAuthData } = require('../../../utils/auth');

Page({
  data: {
    loading: false,
    showNicknameInput: false,
    nickname: ''
  },

  onLoad() {
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      const authData = getAuthData();
      if (authData && authData.user_id) {
        try {
          await callFunction('auth/login', { verify: true }, { showLoading: false });
          this.navigateToNext();
        } catch (err) {
          const { removeAuthData } = require('../../../utils/auth');
          removeAuthData();
        }
        return;
      }
    } catch (err) {
      // 静默处理错误
    }
  },

  /**
   * 获取用户信息授权
   */
  onGetUserInfo() {
    this.setData({ loading: true });

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: () => {
        this.setData({
          showNicknameInput: true,
          loading: false
        });
      },
      fail: (err) => {
        this.setData({ loading: false });
        wx.showToast({
          title: '需要授权才能继续',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  /**
   * 提交昵称
   */
  async onSubmitNickname() {
    const nickname = this.data.nickname.trim();

    if (!nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    const forbiddenNicknames = ['微信用户', '游客', 'User', 'user'];
    if (forbiddenNicknames.includes(nickname)) {
      wx.showToast({
        title: '请使用真实昵称，不要使用默认昵称',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      await this.callLogin(nickname);
      wx.setStorageSync('user_nickname', nickname);
    } catch (err) {
      this.setData({ loading: false });

      if (err.errcode === 1003) {
        wx.showToast({
          title: err.errmsg || '请输入有效的昵称',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  /**
   * 调用登录云函数
   */
  async callLogin(nickname) {
    if (!wx.cloud) {
      throw new Error('云环境未初始化');
    }

    const result = await callFunction('auth/login', {
      nickname
    }, { showLoading: true });

    saveAuthData({
      user_id: result.user_id,
      roles: result.roles,
      last_role: result.last_role,
      is_admin: result.is_admin || false,
      is_superadmin: result.is_superadmin || false
    });

    this.navigateToNext();
  },

  /**
   * 导航到角色选择页面
   */
  navigateToNext() {
    wx.reLaunch({
      url: '/pages/auth/role-select/role-select'
    });
  }
});

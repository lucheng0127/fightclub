// Role Select Page
const { getRoles, saveAuthData, getUserId, isLoggedIn, getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    selectedRole: '',
    hasBoxerProfile: false,
    hasGymProfile: false
  },

  async onLoad() {
    // 检查用户是否已授权 (getUserProfile)
    const hasAuthorized = wx.getStorageSync('user_nickname');

    if (!hasAuthorized) {
      // 未授权，跳转到登录页面进行授权
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 检查用户是否已登录
    const authData = getAuthData();

    if (!authData || !authData.user_id) {
      // 未登录，尝试静默登录
      try {
        const result = await callFunction('auth/login', {}, { showLoading: false });
        saveAuthData({
          user_id: result.user_id,
          roles: result.roles,
          last_role: result.last_role
        });

        const { has_boxer_profile, has_gym_profile, last_role } = result.roles;

        this.setData({
          hasBoxerProfile: has_boxer_profile,
          hasGymProfile: has_gym_profile,
          selectedRole: last_role || ''
        });

        // 如果只有一个角色，自动选中
        if (has_boxer_profile && !has_gym_profile) {
          this.setData({ selectedRole: 'boxer' });
        } else if (!has_boxer_profile && has_gym_profile) {
          this.setData({ selectedRole: 'gym' });
        }
      } catch (err) {
        // 登录失败，跳转到登录页面
        wx.redirectTo({
          url: '/pages/auth/login/login'
        });
        return;
      }
    } else {
      // 已登录，获取本地存储的角色信息
      const roles = getRoles();
      const { has_boxer_profile, has_gym_profile, last_role } = roles;

      this.setData({
        hasBoxerProfile: has_boxer_profile,
        hasGymProfile: has_gym_profile,
        selectedRole: last_role || ''
      });

      // 如果只有一个角色，自动选中
      if (has_boxer_profile && !has_gym_profile) {
        this.setData({ selectedRole: 'boxer' });
      } else if (!has_boxer_profile && has_gym_profile) {
        this.setData({ selectedRole: 'gym' });
      }
    }
  },

  onShow() {
    // 页面显示时检查：如果已有档案，自动跳转到首页
    const { hasBoxerProfile, hasGymProfile, selectedRole } = this.data;

    if (selectedRole === 'boxer' && hasBoxerProfile) {
      // 已有拳手档案，直接进入首页
      wx.reLaunch({
        url: '/pages/common/dashboard/dashboard'
      });
      return;
    }

    if (selectedRole === 'gym' && hasGymProfile) {
      // 已有拳馆档案，直接进入首页
      wx.reLaunch({
        url: '/pages/common/dashboard/dashboard'
      });
      return;
    }
  },

  /**
   * 选择角色
   */
  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role });

    // 触觉反馈
    wx.vibrateShort();
  },

  /**
   * 确认并进入
   */
  onConfirm() {
    const { selectedRole, hasBoxerProfile, hasGymProfile } = this.data;

    if (!selectedRole) {
      wx.showToast({
        title: '请选择角色',
        icon: 'none'
      });
      return;
    }

    // 保存选择的角色
    saveAuthData({
      user_id: getUserId(),
      roles: {
        has_boxer_profile: hasBoxerProfile,
        has_gym_profile: hasGymProfile
      },
      last_role: selectedRole
    });

    // 根据角色导航到对应页面
    if (selectedRole === 'boxer') {
      if (hasBoxerProfile) {
        // 已有拳手档案，进入主页
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        // 新建拳手档案
        wx.redirectTo({
          url: '/pages/boxer/profile-create/profile-create'
        });
      }
    } else if (selectedRole === 'gym') {
      if (hasGymProfile) {
        // 已有拳馆档案，进入主页
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        // 新建拳馆档案
        wx.redirectTo({
          url: '/pages/gym/profile-create/profile-create'
        });
      }
    }
  }
});

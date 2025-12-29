// Role Select Page
const { getRoles, saveAuthData, getUserId, isLoggedIn, getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    selectedRole: '',
    hasBoxerProfile: false,
    hasGymProfile: false,
    loading: true
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

    // 设置加载状态
    this.setData({ loading: true });

    // 检查用户是否已登录（从数据库获取最新状态）
    const authData = getAuthData();

    if (!authData || !authData.user_id) {
      // 未登录，尝试静默登录（从数据库获取用户信息）
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
          selectedRole: last_role || '',
          loading: false
        });

        // 如果只有一个角色，自动选中
        if (has_boxer_profile && !has_gym_profile) {
          this.setData({ selectedRole: 'boxer' });
        } else if (!has_boxer_profile && has_gym_profile) {
          this.setData({ selectedRole: 'gym' });
        }
      } catch (err) {
        // 登录失败（可能是网络问题），跳转到登录页面
        this.setData({ loading: false });
        wx.redirectTo({
          url: '/pages/auth/login/login'
        });
        return;
      }
    } else {
      // 已登录，从数据库获取最新状态
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
          selectedRole: last_role || '',
          loading: false
        });

        // 如果只有一个角色，自动选中
        if (has_boxer_profile && !has_gym_profile) {
          this.setData({ selectedRole: 'boxer' });
        } else if (!has_boxer_profile && has_gym_profile) {
          this.setData({ selectedRole: 'gym' });
        }
      } catch (err) {
        // 使用本地缓存数据
        const roles = getRoles();
        const { has_boxer_profile, has_gym_profile, last_role } = roles;

        this.setData({
          hasBoxerProfile: has_boxer_profile,
          hasGymProfile: has_gym_profile,
          selectedRole: last_role || '',
          loading: false
        });

        if (has_boxer_profile && !has_gym_profile) {
          this.setData({ selectedRole: 'boxer' });
        } else if (!has_boxer_profile && has_gym_profile) {
          this.setData({ selectedRole: 'gym' });
        }
      }
    }
  },

  onShow() {
    // 页面显示时，不需要自动导航
    // 让用户看到角色选择界面并主动选择
    // Home 按钮返回时也应该停留在角色选择页面
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

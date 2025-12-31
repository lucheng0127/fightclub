// Role Select Page
const { getRoles, saveAuthData, getUserId, isLoggedIn, getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    selectedRole: '',
    hasBoxerProfile: false,
    hasGymProfile: false,
    isAdmin: false,
    loading: true
  },

  async onLoad() {
    // 检查用户是否已登录
    const authData = getAuthData();

    if (!authData || !authData.user_id) {
      // 未登录，跳转到登录页面
      wx.redirectTo({
        url: '/pages/auth/login/login'
      });
      return;
    }

    // 设置加载状态
    this.setData({ loading: true });

    // 从数据库获取最新用户状态
    try {
      const result = await callFunction('auth/login', {}, { showLoading: false });
      saveAuthData({
        user_id: result.user_id,
        roles: result.roles,
        last_role: result.last_role,
        is_admin: result.is_admin || false,
        is_superadmin: result.is_superadmin || false
      });

      const { has_boxer_profile, has_gym_profile, last_role } = result.roles;

      this.setData({
        hasBoxerProfile: has_boxer_profile,
        hasGymProfile: has_gym_profile,
        isAdmin: result.is_admin || false,
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
      console.error('[RoleSelect] 获取用户状态失败:', err);

      // 如果是昵称验证失败，跳转到登录页面重新输入
      if (err.errcode === 1003) {
        wx.showToast({
          title: '请重新设置昵称',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/auth/login/login'
          });
        }, 1500);
        return;
      }

      // 其他错误，使用本地缓存数据
      const roles = getRoles();
      const { has_boxer_profile, has_gym_profile, last_role } = roles;

      this.setData({
        hasBoxerProfile: has_boxer_profile,
        hasGymProfile: has_gym_profile,
        isAdmin: authData?.is_admin || false,
        selectedRole: last_role || '',
        loading: false
      });

      if (has_boxer_profile && !has_gym_profile) {
        this.setData({ selectedRole: 'boxer' });
      } else if (!has_boxer_profile && has_gym_profile) {
        this.setData({ selectedRole: 'gym' });
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
    const authData = getAuthData();

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
      last_role: selectedRole,
      is_admin: authData?.is_admin || false,
      is_superadmin: authData?.is_superadmin || false
    });

    // 根据角色导航到对应页面
    if (selectedRole === 'admin') {
      // 管理员界面
      wx.reLaunch({
        url: '/pages/admin/dashboard/dashboard'
      });
    } else if (selectedRole === 'boxer') {
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
        // 已有拳馆档案，需要检查审核状态
        // 跳转到详情页，由详情页检查状态
        wx.reLaunch({
          url: '/pages/gym/detail/detail?mode=check_status'
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

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

  async onLoad(options) {
    // 检查是否是手动切换角色（通过 options.manual 参数判断）
    const isManualSwitch = options && options.manual === 'true';

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

      // 只有非手动切换时才自动导航
      if (!isManualSwitch) {
        this.autoNavigate(has_boxer_profile, has_gym_profile, result.is_admin || false);
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

      // 只有非手动切换时才自动导航
      if (!isManualSwitch) {
        this.autoNavigate(has_boxer_profile, has_gym_profile, authData?.is_admin || false);
      }
    }
  },

  /**
   * 自动导航到合适的角色界面
   */
  autoNavigate(hasBoxerProfile, hasGymProfile, isAdmin) {
    // 计算用户拥有的角色数量
    const roleCount = (hasBoxerProfile ? 1 : 0) + (hasGymProfile ? 1 : 0) + (isAdmin ? 1 : 0);

    if (roleCount === 0) {
      // 没有任何角色，停留在角色选择页面
      return;
    }

    if (roleCount === 1) {
      // 只有一个角色，直接进入该角色界面
      let targetRole;
      if (hasBoxerProfile) targetRole = 'boxer';
      else if (hasGymProfile) targetRole = 'gym';
      else if (isAdmin) targetRole = 'admin';
      this.navigateToRole(targetRole, hasBoxerProfile, hasGymProfile);
    } else {
      // 多个角色，按优先级导航：拳手 > 拳馆 > 管理员
      if (hasBoxerProfile) {
        this.navigateToRole('boxer', hasBoxerProfile, hasGymProfile);
      } else if (hasGymProfile) {
        this.navigateToRole('gym', hasBoxerProfile, hasGymProfile);
      } else if (isAdmin) {
        this.navigateToRole('admin', hasBoxerProfile, hasGymProfile);
      }
    }
  },

  /**
   * 导航到指定角色界面
   */
  navigateToRole(role, hasBoxerProfile, hasGymProfile) {
    // 保存选择的角色
    saveAuthData({
      user_id: getUserId(),
      roles: {
        has_boxer_profile: hasBoxerProfile,
        has_gym_profile: hasGymProfile
      },
      last_role: role,
      is_admin: this.data.isAdmin || false,
      is_superadmin: getAuthData()?.is_superadmin || false
    });

    if (role === 'boxer') {
      if (hasBoxerProfile) {
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        wx.redirectTo({
          url: '/pages/boxer/profile-create/profile-create'
        });
      }
    } else if (role === 'gym') {
      if (hasGymProfile) {
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        wx.redirectTo({
          url: '/pages/gym/profile-create/profile-create'
        });
      }
    } else if (role === 'admin') {
      wx.reLaunch({
        url: '/pages/admin/dashboard/dashboard'
      });
    }
  },

  onShow() {
    // 页面显示时不需要自动导航
    // 如果用户点击切换角色按钮返回，停留在角色选择页面
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
        wx.reLaunch({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        wx.redirectTo({
          url: '/pages/gym/profile-create/profile-create'
        });
      }
    }
  }
});

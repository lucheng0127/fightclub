// Role Select Page
const { getRoles, saveAuthData } = require('../../../utils/auth');

Page({
  data: {
    selectedRole: '',
    hasBoxerProfile: false,
    hasGymProfile: false
  },

  onLoad() {
    // 获取用户角色信息
    const roles = getRoles();
    const { has_boxer_profile, has_gym_profile, last_role } = roles;

    this.setData({
      hasBoxerProfile: has_boxer_profile,
      hasGymProfile: has_gym_profile,
      selectedRole: last_role || ''  // 默认选择上次使用的角色
    });

    // 如果只有一个角色，自动选中
    if (has_boxer_profile && !has_gym_profile) {
      this.setData({ selectedRole: 'boxer' });
    } else if (!has_boxer_profile && has_gym_profile) {
      this.setData({ selectedRole: 'gym' });
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
    const { selectedRole } = this.data;

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
        has_boxer_profile: this.data.hasBoxerProfile,
        has_gym_profile: this.data.hasGymProfile
      },
      last_role: selectedRole
    });

    // 根据角色导航到对应页面
    if (selectedRole === 'boxer') {
      if (this.data.hasBoxerProfile) {
        // 已有拳手档案，进入主页
        wx.switchTab({
          url: '/pages/common/dashboard/dashboard'
        });
      } else {
        // 新建拳手档案
        wx.redirectTo({
          url: '/pages/boxer/profile-create/profile-create'
        });
      }
    } else if (selectedRole === 'gym') {
      if (this.data.hasGymProfile) {
        // 已有拳馆档案，进入主页
        wx.switchTab({
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

function getUserId() {
  return wx.getStorageSync('user_id') || '';
}

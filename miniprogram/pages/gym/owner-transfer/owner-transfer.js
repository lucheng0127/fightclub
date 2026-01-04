// 拳馆负责人转移页面
const { callFunction } = require('../../../utils/request');
const { getRoles } = require('../../../utils/auth');

Page({
  data: {
    loading: true,
    gymProfile: null,
    selectedRecipient: null,
    transferring: false,
    statusText: ''
  },

  onLoad() {
    this.loadGymProfile();
  },

  /**
   * 加载拳馆档案
   */
  async loadGymProfile() {
    try {
      const profile = await callFunction('gym/get', {}, { showLoading: true });

      // 验证是否为拳馆负责人
      const roles = getRoles();
      if (!roles.has_gym_profile) {
        wx.showModal({
          title: '提示',
          content: '您不是拳馆负责人',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 设置状态文本
      let statusText = '';
      switch (profile.status) {
        case 'pending':
          statusText = '待审核';
          break;
        case 'approved':
          statusText = '已审核';
          break;
        case 'rejected':
          statusText = '已拒绝';
          break;
        default:
          statusText = profile.status;
      }

      this.setData({
        gymProfile: profile,
        statusText,
        loading: false
      });
    } catch (err) {
      console.error('加载拳馆档案失败:', err);
      wx.showModal({
        title: '加载失败',
        content: err.errmsg || '无法加载拳馆信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 选择接收人
   */
  onSelectRecipient() {
    // 跳转到用户选择页面，传递场景参数
    wx.navigateTo({
      url: '/pages/admin/user-select/user-select?scene=gym_transfer'
    });
  },

  /**
   * 用户选择页面回调
   */
  onUserSelected(user) {
    this.setData({
      selectedRecipient: user
    });
  },

  /**
   * 确认转移
   */
  onConfirmTransfer() {
    const { selectedRecipient, gymProfile } = this.data;

    if (!selectedRecipient) {
      wx.showToast({
        title: '请先选择接收人',
        icon: 'none'
      });
      return;
    }

    // 二次确认对话框
    wx.showModal({
      title: '确认转移',
      content: `确定将拳馆"${gymProfile.name}"转移给"${selectedRecipient.nickname}"吗?\n\n转移后您将失去该拳馆的所有权,此操作不可撤销!`,
      confirmText: '确认转移',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          this.executeTransfer();
        }
      }
    });
  },

  /**
   * 执行转移
   */
  async executeTransfer() {
    const { selectedRecipient } = this.data;

    this.setData({ transferring: true });
    wx.showLoading({ title: '转移中...', mask: true });

    try {
      const result = await callFunction('gym/transfer', {
        target_user_id: selectedRecipient.user_id
      }, { showLoading: false });

      wx.hideLoading();

      wx.showModal({
        title: '转移成功',
        content: `拳馆已成功转移给 ${result.to_nickname}`,
        showCancel: false,
        success: () => {
          // 跳转到角色选择页面
          wx.reLaunch({
            url: '/pages/auth/role-select/role-select'
          });
        }
      });

    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: err.errmsg || '转移失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ transferring: false });
    }
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  }
});

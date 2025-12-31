// Admin Manage Page
const { getAuthData } = require('../../../utils/auth');
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    loading: true,
    admins: [],
    selectedUser: null,
    adding: false
  },

  onLoad() {
    this.checkPermission();
  },

  /**
   * 检查超级管理员权限
   */
  async checkPermission() {
    const authData = getAuthData();
    if (!authData || !authData.is_superadmin) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.loadAdmins();
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 加载管理员列表
   */
  async loadAdmins() {
    this.setData({ loading: true });

    try {
      const result = await callFunction('admin/list', {}, { showLoading: false });

      const admins = (result.admins || []).map(admin => ({
        ...admin,
        created_at_formatted: this.formatDate(admin.created_at)
      }));

      this.setData({
        admins: admins,
        loading: false
      });
    } catch (e) {
      console.error('加载管理员列表失败:', e);
      this.setData({ loading: false });
      wx.showToast({
        title: e.errmsg || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到用户选择页面
   */
  onSelectUser() {
    wx.navigateTo({
      url: '/pages/admin/user-select/user-select'
    });
  },

  /**
   * 用户选择回调（从 user-select 页面返回时调用）
   */
  onUserSelected(user) {
    this.setData({
      selectedUser: user
    });

    // 自动弹出确认对话框
    this.showAddConfirm(user);
  },

  /**
   * 显示添加确认对话框
   */
  showAddConfirm(user) {
    const nickname = user.nickname || '该用户';

    wx.showModal({
      title: '添加管理员',
      content: `确定要将 ${nickname} 添加为管理员吗？`,
      success: (res) => {
        if (res.confirm) {
          this.addAdmin(user);
        } else {
          this.setData({
            selectedUser: null
          });
        }
      }
    });
  },

  /**
   * 添加管理员
   */
  async addAdmin(user) {
    this.setData({ adding: true });

    try {
      await callFunction('admin/add', {
        user_id: user.user_id,
        nickname: user.nickname || null,
        superadmin: false
      }, { showLoading: true });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      this.setData({
        selectedUser: null
      });

      this.loadAdmins();

    } catch (e) {
      console.error('添加管理员失败:', e);
      wx.showToast({
        title: e.errmsg || '添加失败',
        icon: 'none'
      });
    } finally {
      this.setData({ adding: false });
    }
  },

  /**
   * 移除管理员
   */
  onRemoveAdmin(e) {
    const adminId = e.currentTarget.dataset.id;
    const admin = this.data.admins.find(a => a.admin_id === adminId);

    if (admin.is_current) {
      wx.showToast({
        title: '不能移除自己',
        icon: 'none'
      });
      return;
    }

    if (admin.superadmin) {
      wx.showToast({
        title: '不能移除超级管理员',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认移除',
      content: `确定要移除管理员 ${admin.nickname || ''} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await callFunction('admin/remove', { admin_id: adminId }, { showLoading: true });

            wx.showToast({
              title: '移除成功',
              icon: 'success'
            });

            this.loadAdmins();
          } catch (e) {
            console.error('移除管理员失败:', e);
            wx.showToast({
              title: e.errmsg || '移除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadAdmins().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});

// Notifications Page
const { callFunction } = require('../../../utils/request');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    list: [],
    loading: true
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    this.setData({
      statusBarHeight,
      navBarHeight
    });

    this.loadNotifications();
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadNotifications();
  },

  /**
   * 加载通知列表
   */
  async loadNotifications() {
    this.setData({ loading: true });

    try {
      const result = await callFunction('notification-list', {}, { showLoading: false });

      // 格式化时间
      const list = (result.notifications || []).map(notif => {
        if (notif.created_at) {
          const created = new Date(notif.created_at);
          const now = new Date();
          const diff = now - created;

          if (diff < 60000) {
            notif.created_at_text = '刚刚';
          } else if (diff < 3600000) {
            notif.created_at_text = Math.floor(diff / 60000) + '分钟前';
          } else if (diff < 86400000) {
            notif.created_at_text = Math.floor(diff / 3600000) + '小时前';
          } else {
            notif.created_at_text = Math.floor(diff / 86400000) + '天前';
          }
        }
        return notif;
      });

      this.setData({
        list,
        loading: false
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ loading: false });
    }
  },

  /**
   * 全部标记已读
   */
  async onMarkAllRead() {
    try {
      await callFunction('notification-read', {
        mark_all_as_read: true
      });

      wx.showToast({ title: '已全部标记为已读', icon: 'success' });

      // 重新加载列表
      this.loadNotifications();
    } catch (e) {
      console.error('操作失败:', e);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  /**
   * 点击通知卡片
   */
  async onCardTap(e) {
    const { id, read } = e.currentTarget.dataset;

    // 如果未读，标记为已读
    if (!read) {
      try {
        await callFunction('notification-read', {
          notification_id: id
        });

        // 更新本地状态
        const list = this.data.list.map(item => {
          if (item.notification_id === id) {
            return { ...item, is_read: true };
          }
          return item;
        });

        this.setData({ list });
      } catch (e) {
        console.error('标记已读失败:', e);
      }
    }

    // 如果有关联的 slot_id，跳转到时间段详情
    const notification = this.data.list.find(n => n.notification_id === id);
    if (notification && notification.related_slot_id) {
      wx.navigateTo({
        url: `/pages/common/slot-detail/slot-detail?slot_id=${notification.related_slot_id}`
      });
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});

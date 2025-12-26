// Fight Club - Boxing Platform Mini-Program
App({
  onLaunch() {
    // Initialize CloudBase
    if (!wx.cloud) {
      console.error('CloudBase not supported');
      return;
    }
    wx.cloud.init({
      env: 'your-cloud-env-id',  // 替换为你的云开发环境 ID
      traceUser: true
    });
  },

  onShow() {
    // App shown
  },

  onHide() {
    // App hidden
  }
});

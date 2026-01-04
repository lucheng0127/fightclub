// Fight Club - Boxing Platform Mini-Program
App({
  onLaunch() {
    // Initialize CloudBase
    if (!wx.cloud) {
      console.error('CloudBase not supported');
      return;
    }
    wx.cloud.init({
      env: 'cloudbase-5g6s2yh01cb86975',  // 替换为你的云开发环境 ID
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

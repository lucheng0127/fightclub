/**
 * Common Upload Cloud Function
 * 通用上传云函数
 * 处理图片上传到云存储，支持验证和元数据处理
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 通用成功响应
 */
function successResponse(data) {
  return {
    errcode: 0,
    errmsg: 'success',
    data
  };
}

/**
 * 通用错误响应
 */
function errorResponse(errcode, errmsg) {
  return {
    errcode,
    errmsg
  };
}

/**
 * 验证文件类型
 */
function validateFileType(fileType) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(fileType);
}

/**
 * 生成云存储路径
 * @param {string} category - 分类 (gym-icons, boxer-avatars, etc.)
 * @param {string} extension - 文件扩展名
 * @returns {string} 云存储路径
 */
function generateCloudPath(category, extension) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${category}/${timestamp}_${random}.${extension}`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[Upload] 无法获取openid');
    return errorResponse(4001, '无法获取用户信息');
  }

  const { category, fileType } = event;

  // 验证分类
  const allowedCategories = ['gym-icons', 'boxer-avatars', 'other'];
  if (!category || !allowedCategories.includes(category)) {
    return errorResponse(4002, '无效的文件分类');
  }

  // 验证文件类型（可选，前端也可以验证）
  if (fileType && !validateFileType(fileType)) {
    return errorResponse(4003, '不支持的文件类型');
  }

  try {
    // 云函数不直接处理文件上传
    // 前端应该使用 wx.cloud.uploadFile 直接上传
    // 此云函数用于生成上传路径和返回访问信息

    // 根据分类确定扩展名
    let extension = 'jpg';
    if (fileType) {
      const typeMap = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      extension = typeMap[fileType] || 'jpg';
    }

    // 生成云存储路径
    const cloudPath = generateCloudPath(category, extension);

    console.log('[Upload] 生成上传路径, openid:', openid.substring(0, 8) + '...', 'path:', cloudPath);

    return successResponse({
      cloudPath,
      category,
      openid
    });

  } catch (e) {
    console.error('[Upload] 处理失败:', e);
    return errorResponse(4004, '上传处理失败');
  }
};

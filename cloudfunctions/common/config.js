/**
 * Cloud Function Common Configuration
 * 云函数公共配置
 */

const crypto = require('crypto');

/**
 * 生成匿名用户ID（基于OpenID的非可逆哈希）
 * 用于前端标识用户，不暴露原始OpenID
 * @param {string} openid - 微信OpenID
 * @returns {string} 匿名化后的用户ID
 */
function hashOpenID(openid) {
  const salt = 'fightclub-salt-v1';  // 生产环境应使用环境变量
  return crypto.createHash('sha256')
    .update(openid + salt)
    .digest('hex')
    .substring(0, 16);
}

/**
 * 通用成功响应
 * @param {*} data - 返回数据
 * @returns {object} 标准成功响应
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
 * @param {number} errcode - 错误码
 * @param {string} errmsg - 错误信息
 * @returns {object} 标准错误响应
 */
function errorResponse(errcode, errmsg) {
  return {
    errcode,
    errmsg
  };
}

/**
 * 数据库事务辅助函数
 * 执行事务并在失败时自动回滚
 * @param {object} db - 数据库实例
 * @param {function} callback - 事务回调函数，接收transaction参数
 * @returns {Promise} 事务执行结果
 */
async function executeTransaction(db, callback) {
  const transaction = await db.startTransaction();

  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 计算两点之间的距离（Haversine公式）
 * @param {number} lat1 - 点1纬度
 * @param {number} lon1 - 点1经度
 * @param {number} lat2 - 点2纬度
 * @param {number} lon2 - 点2经度
 * @returns {number} 距离（米）
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * 格式化距离显示
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离字符串
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return Math.round(meters) + 'm';
  }
  return (meters / 1000).toFixed(1) + 'km';
}

module.exports = {
  hashOpenID,
  successResponse,
  errorResponse,
  executeTransaction,
  getDistance,
  formatDistance
};

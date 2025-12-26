/**
 * Auth Login Cloud Function
 * 用户登录云函数
 * 获取用户OpenID，检查或创建用户记录，返回角色信息
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成匿名用户ID（基于OpenID的非可逆哈希）
 * 用于前端标识用户，不暴露原始OpenID
 * @param {string} openid - 微信OpenID
 * @returns {string} 匿名化后的用户ID
 */
function hashOpenID(openid) {
  const salt = 'fightclub-salt-v1';
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

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext();

  if (!openid) {
    return errorResponse(1001, '无法获取用户信息');
  }

  try {
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      // 新用户 - 创建用户记录
      const now = new Date();
      await db.collection('users').add({
        data: {
          openid,
          created_at: now,
          updated_at: now,
          last_role: null,
          has_boxer_profile: false,
          has_gym_profile: false
        }
      });

      // 生成匿名化user_id供前端使用
      const user_id = hashOpenID(openid);

      return successResponse({
        user_id,
        roles: {
          has_boxer_profile: false,
          has_gym_profile: false
        },
        last_role: null,
        is_new_user: true
      });
    }

    // 老用户 - 返回现有角色信息
    const user = userRes.data[0];
    const user_id = hashOpenID(openid);

    return successResponse({
      user_id,
      roles: {
        has_boxer_profile: user.has_boxer_profile || false,
        has_gym_profile: user.has_gym_profile || false
      },
      last_role: user.last_role || null,
      is_new_user: false
    });

  } catch (e) {
    console.error('登录失败:', e);
    return errorResponse(1002, '数据库操作失败');
  }
};

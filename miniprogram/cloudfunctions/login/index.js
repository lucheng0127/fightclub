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

/**
 * 验证昵称是否有效
 * @param {string} nickname - 昵称
 * @returns {boolean} 是否有效
 */
function isValidNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return false;
  }
  const trimmed = nickname.trim();
  if (trimmed === '') {
    return false;
  }
  // 禁止使用默认昵称
  const forbiddenNicknames = ['微信用户', '游客', 'User', 'user'];
  if (forbiddenNicknames.includes(trimmed)) {
    return false;
  }
  return true;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  // 兼容大小写形式（不同微信版本可能返回不同格式）
  const openid = wxContext.OPENID || wxContext.openid || '';
  const appid = wxContext.APPID || wxContext.appid || '';

  // 从前端获取参数
  const { nickname, verify = false } = event || {};

  if (!openid) {
    console.error('[Login] OpenID为空, WXContext:', JSON.stringify(wxContext));
    return errorResponse(1001, '无法获取用户信息');
  }

  try {
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({ openid }).get();

    // 验证模式：仅检查用户是否存在且有昵称
    if (verify) {
      if (userRes.data.length === 0) {
        return errorResponse(1004, '用户不存在');
      }
      const user = userRes.data[0];
      if (!isValidNickname(user.nickname)) {
        return errorResponse(1003, '请输入有效的昵称');
      }
      // 用户存在且有昵称，返回成功
      const user_id = hashOpenID(openid);
      return successResponse({
        user_id,
        exists: true,
        has_nickname: true
      });
    }

    if (userRes.data.length === 0) {
      // 新用户 - 必须提供有效的昵称才能创建用户记录
      if (!isValidNickname(nickname)) {
        return errorResponse(1003, '请输入有效的昵称');
      }

      const now = new Date();
      const userData = {
        openid,
        nickname: nickname.trim(),
        created_at: now,
        updated_at: now,
        last_role: null,
        has_boxer_profile: false,
        has_gym_profile: false
      };

      await db.collection('users').add({
        data: userData
      });

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

    // 如果老用户没有有效昵称，且提供了新昵称，则更新
    if (!isValidNickname(user.nickname)) {
      if (nickname && isValidNickname(nickname)) {
        await db.collection('users').doc(user._id).update({
          data: {
            nickname: nickname.trim(),
            updated_at: new Date()
          }
        });
      } else {
        return errorResponse(1003, '请输入有效的昵称');
      }
    } else if (nickname && nickname !== user.nickname) {
      if (!isValidNickname(nickname)) {
        return errorResponse(1003, '请输入有效的昵称');
      }
      await db.collection('users').doc(user._id).update({
        data: {
          nickname: nickname.trim(),
          updated_at: new Date()
        }
      });
    }

    // 检查是否是管理员
    let is_admin = false;
    let is_superadmin = false;
    try {
      const adminRes = await db.collection('admins').where({ openid }).get();
      if (adminRes.data.length > 0) {
        is_admin = true;
        is_superadmin = adminRes.data[0].superadmin || false;
      }
    } catch (e) {
      console.error('[Login] 检查管理员状态失败:', e);
    }

    return successResponse({
      user_id,
      roles: {
        has_boxer_profile: user.has_boxer_profile || false,
        has_gym_profile: user.has_gym_profile || false
      },
      last_role: user.last_role || null,
      is_admin,
      is_superadmin,
      is_new_user: false
    });

  } catch (e) {
    console.error('[Login] 数据库操作失败:', e);
    return errorResponse(1002, '数据库操作失败');
  }
};

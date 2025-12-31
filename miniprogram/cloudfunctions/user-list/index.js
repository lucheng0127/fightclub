/**
 * User List Cloud Function
 * 获取用户列表（仅超级管理员）
 * 支持根据微信号搜索
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成匿名用户ID（基于OpenID的非可逆哈希）
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[UserList] 无法获取openid');
    return errorResponse(7001, '无法获取用户信息');
  }

  const { keyword = '', page = 1, limit = 50 } = event;

  console.log('[UserList] 获取用户列表, openid:', openid.substring(0, 8) + '...', 'keyword:', keyword);

  try {
    // 首先检查当前用户是否是超级管理员
    const adminRes = await db.collection('admins').where({ openid }).get();

    if (adminRes.data.length === 0) {
      return errorResponse(7002, '无权限访问');
    }

    const admin = adminRes.data[0];
    if (!admin.superadmin) {
      return errorResponse(7003, '仅超级管理员可查看用户列表');
    }

    // 构建查询条件
    const where = {};

    // 如果有搜索关键词，根据昵称搜索
    if (keyword && keyword.trim()) {
      const keywordPattern = keyword.trim();
      // 使用正则表达式进行模糊匹配昵称
      where.nickname = new RegExp(keywordPattern, 'i');
    }

    // 获取总数
    const countResult = await db.collection('users').where(where).count();
    const total = countResult.total;

    // 获取用户列表
    const skip = (page - 1) * limit;
    const result = await db.collection('users')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    // 获取所有管理员openid，用于过滤已经是管理员的用户
    const allAdminsRes = await db.collection('admins').get();
    const adminOpenids = new Set(allAdminsRes.data.map(a => a.openid));

    // 过滤掉已经是管理员的用户
    const users = result.data
      .filter(user => !adminOpenids.has(user.openid))
      .map(user => ({
        user_id: hashOpenID(user.openid),
        nickname: user.nickname || '',
        created_at: user.created_at,
        last_role: user.last_role
      }));

    // 重新计算总数（排除管理员后的总数）
    const filteredTotal = total - adminOpenids.size;

    console.log('[UserList] 查询成功, count:', users.length, 'total:', filteredTotal);

    return successResponse({
      list: users,
      total: filteredTotal,
      page: page,
      limit: limit,
      has_more: false // 过滤后不支持下拉加载更多
    });

  } catch (e) {
    console.error('[UserList] 查询失败:', e);
    return errorResponse(7004, '查询用户列表失败');
  }
};

/**
 * User List Cloud Function
 * 获取用户列表
 * 支持两种场景：
 * 1. admin - 超级管理员查看用户（用于添加管理员）
 * 2. gym_transfer - 拳馆负责人查看用户（用于转移拳馆）
 * 支持根据昵称搜索
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

  const { keyword = '', page = 1, limit = 50, scene = 'admin' } = event;

  console.log('[UserList] 获取用户列表, openid:', openid.substring(0, 8) + '...', 'scene:', scene, 'keyword:', keyword);

  try {
    // 根据场景进行不同的权限验证和数据过滤
    if (scene === 'gym_transfer') {
      // ==================== 拳馆转移场景 ====================
      // 1. 验证当前用户是否是拳馆负责人
      const gymRes = await db.collection('gyms').where({ user_id: openid }).get();
      if (gymRes.data.length === 0) {
        return errorResponse(7002, '您不是拳馆负责人');
      }

      const gym = gymRes.data[0];

      // 2. 只有已审核通过的拳馆负责人才能查看用户列表
      if (gym.status !== 'approved') {
        return errorResponse(7003, '拳馆尚未通过审核');
      }

    } else {
      // ==================== 管理员场景（默认） ====================
      // 验证当前用户是否是超级管理员
      const adminRes = await db.collection('admins').where({ openid }).get();

      if (adminRes.data.length === 0) {
        return errorResponse(7002, '无权限访问');
      }

      const admin = adminRes.data[0];
      if (!admin.superadmin) {
        return errorResponse(7003, '无权限访问');
      }
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

    // 根据场景过滤用户
    let filteredUsers = result.data;

    if (scene === 'gym_transfer') {
      // 拳馆转移场景：过滤掉自己和已拥有拳馆的用户
      const allGymsRes = await db.collection('gyms').field({ user_id: true }).get();
      const gymOwnerOpenids = new Set(allGymsRes.data.map(g => g.user_id));

      filteredUsers = result.data
        .filter(user => {
          // 排除当前用户（不能转移给自己）
          if (user.openid === openid) return false;
          // 排除已经拥有拳馆的用户
          if (gymOwnerOpenids.has(user.openid)) return false;
          return true;
        })
        .map(user => ({
          user_id: hashOpenID(user.openid),
          nickname: user.nickname || '未设置昵称',
          avatar_url: user.avatar_url || '',
          created_at: user.created_at,
          last_role: user.last_role
        }));

    } else {
      // 管理员场景：过滤掉已经是管理员的用户
      const allAdminsRes = await db.collection('admins').get();
      const adminOpenids = new Set(allAdminsRes.data.map(a => a.openid));

      filteredUsers = result.data
        .filter(user => !adminOpenids.has(user.openid))
        .map(user => ({
          user_id: hashOpenID(user.openid),
          nickname: user.nickname || '',
          created_at: user.created_at,
          last_role: user.last_role
        }));
    }

    // 重新计算总数
    const filteredTotal = filteredUsers.length;

    console.log('[UserList] 查询成功, count:', filteredUsers.length, 'total:', filteredTotal);

    return successResponse({
      list: filteredUsers,
      total: filteredTotal,
      page: page,
      limit: limit,
      has_more: false
    });

  } catch (e) {
    console.error('[UserList] 查询失败:', e);
    return errorResponse(7004, '查询用户列表失败');
  }
};

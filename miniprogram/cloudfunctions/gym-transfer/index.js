/**
 * Gym Transfer Cloud Function
 * 拳馆负责人转移云函数
 * 允许拳馆负责人将拳馆转移给其他用户
 * 使用数据库事务确保转移操作的原子性
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
 * 生成转移ID
 */
function generateTransferId() {
  const hash = crypto.createHash('sha256')
    .update('transf_' + Date.now() + Math.random())
    .digest('hex')
    .substring(0, 12);
  return 'transf_' + hash;
}

/**
 * 通用响应函数
 */
function successResponse(data) {
  return {
    errcode: 0,
    errmsg: 'success',
    data
  };
}

function errorResponse(errcode, errmsg) {
  return {
    errcode,
    errmsg
  };
}

/**
 * 根据匿名 user_id 查找真实 OpenID
 */
async function findOpenidByHashedUserId(hashedUserId) {
  try {
    // 获取所有用户(注意: 这个方案在用户量很大时需要优化,目前项目规模可接受)
    const usersRes = await db.collection('users').limit(1000).get();

    for (const user of usersRes.data) {
      const hashedId = hashOpenID(user.openid);
      if (hashedId === hashedUserId) {
        return user.openid;
      }
    }

    return null;
  } catch (e) {
    console.error('[GymTransfer] 查找用户失败:', e);
    return null;
  }
}

/**
 * 发送转移通知
 */
async function sendTransferNotifications(fromOpenid, toOpenid, gymName, fromNickname, toNickname) {
  try {
    const now = new Date();

    // 发送给原负责人
    await db.collection('notifications').add({
      data: {
        notification_id: generateTransferId(),
        recipient_user_id: fromOpenid,
        type: 'gym_transfer',
        title: '拳馆转移成功',
        content: `您已将拳馆 "${gymName}" 转移给 ${toNickname}`,
        is_read: false,
        created_at: now,
        updated_at: now
      }
    });

    // 发送给新负责人
    await db.collection('notifications').add({
      data: {
        notification_id: generateTransferId(),
        recipient_user_id: toOpenid,
        type: 'gym_transfer',
        title: '拳馆转移成功',
        content: `${fromNickname} 将拳馆 "${gymName}" 转移给您`,
        is_read: false,
        created_at: now,
        updated_at: now
      }
    });

    console.log('[GymTransfer] 通知发送成功');
  } catch (e) {
    console.error('[GymTransfer] 发送通知失败:', e);
    // 通知发送失败不影响转移操作
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  if (!openid) {
    console.error('[GymTransfer] 无法获取openid');
    return errorResponse(8001, '无法获取用户信息');
  }

  const { target_user_id } = event;

  if (!target_user_id) {
    return errorResponse(8002, '缺少参数 target_user_id');
  }

  console.log('[GymTransfer] 开始转移, openid:', openid.substring(0, 8) + '...', 'target_user_id:', target_user_id);

  try {
    // 1. 验证当前用户是否为拳馆负责人
    const gymRes = await db.collection('gyms').where({ user_id: openid }).get();
    if (gymRes.data.length === 0) {
      return errorResponse(8001, '您不是该拳馆的负责人');
    }

    const gym = gymRes.data[0];

    // 2. 验证拳馆状态
    if (gym.status !== 'approved') {
      return errorResponse(8004, '拳馆尚未通过审核,无法转移');
    }

    // 3. 查找接收人的真实 OpenID
    const targetOpenid = await findOpenidByHashedUserId(target_user_id);
    if (!targetOpenid) {
      return errorResponse(8002, '接收人用户不存在');
    }

    // 4. 验证不能转移给自己
    if (targetOpenid === openid) {
      return errorResponse(8005, '不能转移给自己');
    }

    // 5. 验证接收人是否已拥有拳馆档案
    const targetGymRes = await db.collection('gyms').where({ user_id: targetOpenid }).get();
    if (targetGymRes.data.length > 0) {
      return errorResponse(8003, '该用户已拥有拳馆档案,无法接收');
    }

    // 6. 获取用户昵称
    const fromUserRes = await db.collection('users').where({ openid }).get();
    const toUserRes = await db.collection('users').where({ openid: targetOpenid }).get();

    if (toUserRes.data.length === 0) {
      return errorResponse(8002, '接收人用户不存在');
    }

    const fromNickname = fromUserRes.data[0]?.nickname || '原负责人';
    const toNickname = toUserRes.data[0]?.nickname || '新负责人';

    // 7. 使用数据库事务执行转移
    const transaction = await db.startTransaction();

    try {
      const now = new Date();
      const gym_id = gym.gym_id;
      const transfer_id = generateTransferId();

      // 7.1 更新拳馆的 user_id
      await transaction.collection('gyms').where({ gym_id }).update({
        data: {
          user_id: targetOpenid,
          updated_at: now
        }
      });

      // 7.2 更新原负责人的用户记录
      await transaction.collection('users').where({ openid }).update({
        data: {
          has_gym_profile: false,
          updated_at: now
        }
      });

      // 7.3 更新新负责人的用户记录
      await transaction.collection('users').where({ openid: targetOpenid }).update({
        data: {
          has_gym_profile: true,
          last_role: 'gym',
          updated_at: now
        }
      });

      // 7.4 插入转移历史记录
      await transaction.collection('gym_transfers').add({
        data: {
          transfer_id,
          gym_id,
          gym_name: gym.name,
          from_user_id: openid,
          from_user_hash: hashOpenID(openid),
          from_nickname: fromNickname,
          to_user_id: targetOpenid,
          to_user_hash: hashOpenID(targetOpenid),
          to_nickname: toNickname,
          transferred_at: now,
          gym_status: gym.status
        }
      });

      // 提交事务
      await transaction.commit();

      console.log('[GymTransfer] 转移成功, transfer_id:', transfer_id);

      // 8. 发送通知消息(异步,不影响主流程)
      sendTransferNotifications(openid, targetOpenid, gym.name, fromNickname, toNickname);

      return successResponse({
        transfer_id,
        gym_id,
        to_nickname: toNickname
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[GymTransfer] 转移失败:', e);
    return errorResponse(8006, '数据库事务失败');
  }
};

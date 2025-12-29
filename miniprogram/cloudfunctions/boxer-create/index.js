/**
 * Boxer Create Cloud Function
 * 创建拳手档案云函数
 * 使用数据库事务确保数据一致性
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成 boxer_id
 */
function generateBoxerId(openid) {
  const hash = crypto.createHash('sha256')
    .update(openid + 'boxer' + Date.now())
    .digest('hex')
    .substring(0, 12);
  return 'boxer_' + hash;
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
 * 输入验证
 */
function validateInput(data) {
  // 必填字段
  if (!data.nickname || data.nickname.trim() === '') {
    return { valid: false, errcode: 2001, errmsg: '昵称不能为空' };
  }

  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    return { valid: false, errcode: 2002, errmsg: '性别值无效' };
  }

  if (!data.birthdate) {
    return { valid: false, errcode: 2004, errmsg: '出生日期不能为空' };
  }

  const birthDate = new Date(data.birthdate);
  if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
    return { valid: false, errcode: 2004, errmsg: '出生日期无效' };
  }

  if (!data.height || data.height < 100 || data.height > 250) {
    return { valid: false, errcode: 2003, errmsg: '身高必须在100-250厘米之间' };
  }

  if (!data.weight || data.weight < 30 || data.weight > 200) {
    return { valid: false, errcode: 2003, errmsg: '体重必须在30-200公斤之间' };
  }

  return { valid: true };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 兼容大小写形式
  const openidVal = wxContext.OPENID || wxContext.openid || '';

  if (!openidVal) {
    console.error('[BoxerCreate] 无法获取openid, WXContext:', wxContext);
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[BoxerCreate] openid:', openidVal.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 检查是否已有拳手档案
    const existingBoxer = await db.collection('boxers').where({ user_id: openidVal }).get();
    if (existingBoxer.data.length > 0) {
      return errorResponse(2005, '拳手档案已存在');
    }

    // 如果提供了 gym_id，验证拳馆是否存在
    if (event.gym_id) {
      const gymCheck = await db.collection('gyms').where({ gym_id: event.gym_id }).get();
      if (gymCheck.data.length === 0) {
        return errorResponse(2006, '关联的拳馆不存在');
      }
    }

    // 生成 boxer_id
    const boxer_id = generateBoxerId(openidVal);

    // 使用数据库事务
    const transaction = await db.startTransaction();

    try {
      // 1. 创建拳手档案
      const now = new Date();
      const boxerData = {
        boxer_id,
        user_id: openidVal,
        nickname: event.nickname.trim(),
        gender: event.gender,
        birthdate: event.birthdate,
        height: event.height,
        weight: event.weight,
        city: event.city || null,
        gym_id: event.gym_id || null,
        phone: event.phone || null,
        record_wins: event.record_wins || 0,
        record_losses: event.record_losses || 0,
        record_draws: event.record_draws || 0,
        created_at: now,
        updated_at: now
      };

      await transaction.collection('boxers').add({
        data: boxerData
      });

      // 2. 更新用户记录
      const userRes = await transaction.collection('users').where({ openid: openidVal }).get();
      if (userRes.data.length > 0) {
        await transaction.collection('users').doc(userRes.data[0]._id).update({
          data: {
            has_boxer_profile: true,
            last_role: 'boxer',
            updated_at: now
          }
        });
      }

      // 3. 增加计数器
      const counterRes = await transaction.collection('counters').where({ _id: 'boxer_count' }).get();
      if (counterRes.data.length > 0) {
        await transaction.collection('counters').doc(counterRes.data[0]._id).update({
          data: {
            count: db.command.inc(1)
          }
        });
      } else {
        await transaction.collection('counters').add({
          data: { _id: 'boxer_count', count: 1 }
        });
      }

      // 提交事务
      await transaction.commit();

      console.log('[BoxerCreate] 创建成功, boxer_id:', boxer_id);

      return successResponse({
        boxer_id,
        user_id: openidVal,
        profile: boxerData
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[BoxerCreate] 创建失败:', e);
    return errorResponse(2007, '数据库操作失败');
  }
};

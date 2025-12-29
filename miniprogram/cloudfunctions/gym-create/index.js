/**
 * Gym Create Cloud Function
 * 创建拳馆档案云函数
 * 使用数据库事务确保数据一致性
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成 gym_id
 */
function generateGymId(openid) {
  const hash = crypto.createHash('sha256')
    .update(openid + 'gym' + Date.now())
    .digest('hex')
    .substring(0, 12);
  return 'gym_' + hash;
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
  if (!data.name || data.name.trim() === '') {
    return { valid: false, errcode: 3001, errmsg: '拳馆名称不能为空' };
  }

  if (!data.address || data.address.trim() === '') {
    return { valid: false, errcode: 3002, errmsg: '地址不能为空' };
  }

  // location 必须包含 latitude 和 longitude
  if (!data.location || typeof data.location.latitude !== 'number' || typeof data.location.longitude !== 'number') {
    return { valid: false, errcode: 3003, errmsg: '位置信息无效' };
  }

  // 验证经纬度范围
  if (data.location.latitude < -90 || data.location.latitude > 90) {
    return { valid: false, errcode: 3003, errmsg: '纬度无效' };
  }
  if (data.location.longitude < -180 || data.location.longitude > 180) {
    return { valid: false, errcode: 3003, errmsg: '经度无效' };
  }

  if (!data.phone || data.phone.trim() === '') {
    return { valid: false, errcode: 3004, errmsg: '联系电话不能为空' };
  }

  return { valid: true };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 兼容大小写形式
  const openidVal = wxContext.OPENID || wxContext.openid || '';

  if (!openidVal) {
    console.error('[GymCreate] 无法获取openid, WXContext:', wxContext);
    return errorResponse(1001, '无法获取用户信息');
  }

  console.log('[GymCreate] openid:', openidVal.substring(0, 8) + '...');

  // 验证输入
  const validation = validateInput(event);
  if (!validation.valid) {
    return errorResponse(validation.errcode, validation.errmsg);
  }

  try {
    // 检查是否已有拳馆档案
    const existingGym = await db.collection('gyms').where({ user_id: openidVal }).get();
    if (existingGym.data.length > 0) {
      return errorResponse(3005, '拳馆档案已存在');
    }

    // 生成 gym_id
    const gym_id = generateGymId(openidVal);

    // 使用数据库事务
    const transaction = await db.startTransaction();

    try {
      // 1. 获取并锁定计数器（先读取当前值）
      const counterRes = await transaction.collection('counters').where({ _id: 'gym_count' }).get();
      let newCount = 1;
      if (counterRes.data.length > 0) {
        newCount = counterRes.data[0].count + 1;
        await transaction.collection('counters').doc(counterRes.data[0]._id).update({
          data: { count: newCount }
        });
      } else {
        await transaction.collection('counters').add({
          data: { _id: 'gym_count', count: 1 }
        });
      }

      // 2. 创建拳馆档案
      const now = new Date();
      const gymData = {
        gym_id,
        user_id: openidVal,
        name: event.name.trim(),
        address: event.address.trim(),
        location: {
          latitude: event.location.latitude,
          longitude: event.location.longitude
        },
        city: event.city || null,
        phone: event.phone.trim(),
        icon_url: event.icon_url || null,
        created_at: now,
        updated_at: now
      };

      await transaction.collection('gyms').add({
        data: gymData
      });

      // 3. 更新用户记录
      const userRes = await transaction.collection('users').where({ openid: openidVal }).get();
      if (userRes.data.length > 0) {
        await transaction.collection('users').doc(userRes.data[0]._id).update({
          data: {
            has_gym_profile: true,
            last_role: 'gym',
            updated_at: now
          }
        });
      }

      // 提交事务
      await transaction.commit();

      console.log('[GymCreate] 创建成功, gym_id:', gym_id);

      return successResponse({
        gym_id,
        user_id: openidVal,
        profile: gymData
      });

    } catch (transError) {
      // 回滚事务
      await transaction.rollback();
      throw transError;
    }

  } catch (e) {
    console.error('[GymCreate] 创建失败:', e);
    return errorResponse(3006, '数据库操作失败');
  }
};

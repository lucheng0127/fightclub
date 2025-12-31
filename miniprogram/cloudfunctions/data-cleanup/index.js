/**
 * Data Cleanup Cloud Function
 * 数据清理云函数 - 定时清理过期数据
 * 触发方式：定时触发器（每天凌晨2点执行）
 *
 * 清理规则：
 * - gym_slots: 保留当前日期往前3天和往后7天的数据
 * - slot_bookings: 保留当前日期往前3天和往后7天的数据
 * - notifications: 保留最近30天的数据
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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
 * 获取日期范围（往前3天，往后7天）
 */
function getDateRange() {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  threeDaysAgo.setHours(0, 0, 0, 0);

  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);
  sevenDaysLater.setHours(23, 59, 59, 999);

  return {
    start: threeDaysAgo,
    end: sevenDaysLater,
    now: now
  };
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 清理过期的 gym_slots 记录
 * 保留：当前日期往前3天和往后7天的数据
 */
async function cleanupGymSlots(dateRange) {
  const minDate = formatDate(dateRange.start);
  const maxDate = formatDate(dateRange.end);

  console.log('[DataCleanup] 清理 gym_slots，保留范围:', minDate, '到', maxDate);

  try {
    // 查询需要删除的记录（日期小于往前3天或大于往后7天）
    const oldSlotsResult = await db.collection('gym_slots')
      .where(db.command.or([
        { date: db.command.lt(minDate) },
        { date: db.command.gt(maxDate) }
      ]))
      .get();

    const oldSlots = oldSlotsResult.data;
    console.log('[DataCleanup] 找到', oldSlots.length, '条过期的 gym_slots 记录');

    // 删除过期记录
    if (oldSlots.length > 0) {
      const deletePromises = oldSlots.map(slot => {
        return db.collection('gym_slots').doc(slot._id).remove();
      });

      await Promise.all(deletePromises);
      console.log('[DataCleanup] 成功删除', oldSlots.length, '条 gym_slots 记录');
    }

    return {
      deleted: oldSlots.length
    };
  } catch (e) {
    console.error('[DataCleanup] 清理 gym_slots 失败:', e);
    throw e;
  }
}

/**
 * 清理过期的 slot_bookings 记录
 * 保留：当前日期往前3天和往后7天的数据
 */
async function cleanupSlotBookings(dateRange) {
  const minDate = formatDate(dateRange.start);
  const maxDate = formatDate(dateRange.end);

  console.log('[DataCleanup] 清理 slot_bookings，保留范围:', minDate, '到', maxDate);

  try {
    // 先获取需要检查的 slot_id
    const expiredSlotsResult = await db.collection('gym_slots')
      .where(db.command.or([
        { date: db.command.lt(minDate) },
        { date: db.command.gt(maxDate) }
      ]))
      .field({ slot_id: true })
      .get();

    const expiredSlotIds = expiredSlotsResult.data.map(s => s.slot_id);
    console.log('[DataCleanup] 找到', expiredSlotIds.length, '个过期的时间段');

    // 删除这些时间段的预约记录
    if (expiredSlotIds.length > 0) {
      // 分批删除（微信云开发数据库一次最多删除20条）
      let totalDeleted = 0;
      const batchSize = 20;

      for (let i = 0; i < expiredSlotIds.length; i += batchSize) {
        const batch = expiredSlotIds.slice(i, i + batchSize);
        const bookingsResult = await db.collection('slot_bookings')
          .where({ slot_id: db.command.in(batch) })
          .get();

        const bookings = bookingsResult.data;
        const deletePromises = bookings.map(booking => {
          return db.collection('slot_bookings').doc(booking._id).remove();
        });

        await Promise.all(deletePromises);
        totalDeleted += bookings.length;
      }

      console.log('[DataCleanup] 成功删除', totalDeleted, '条 slot_bookings 记录');
      return { deleted: totalDeleted };
    }

    return { deleted: 0 };
  } catch (e) {
    console.error('[DataCleanup] 清理 slot_bookings 失败:', e);
    throw e;
  }
}

/**
 * 清理过期的 notifications 记录
 * 保留：最近30天的数据
 */
async function cleanupNotifications(dateRange) {
  const thirtyDaysAgo = new Date(dateRange.now);
  thirtyDaysAgo.setDate(dateRange.now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  console.log('[DataCleanup] 清理 notifications，保留最近30天的数据');

  try {
    // 查询需要删除的通知记录
    const oldNotifsResult = await db.collection('notifications')
      .where({ created_at: db.command.lt(thirtyDaysAgo) })
      .get();

    const oldNotifs = oldNotifsResult.data;
    console.log('[DataCleanup] 找到', oldNotifs.length, '条过期的通知记录');

    // 删除过期记录
    if (oldNotifs.length > 0) {
      const batchSize = 20;
      let totalDeleted = 0;

      for (let i = 0; i < oldNotifs.length; i += batchSize) {
        const batch = oldNotifs.slice(i, i + batchSize);
        const deletePromises = batch.map(notif => {
          return db.collection('notifications').doc(notif._id).remove();
        });

        await Promise.all(deletePromises);
        totalDeleted += batch.length;
      }

      console.log('[DataCleanup] 成功删除', totalDeleted, '条通知记录');
      return { deleted: totalDeleted };
    }

    return { deleted: 0 };
  } catch (e) {
    console.error('[DataCleanup] 清理 notifications 失败:', e);
    throw e;
  }
}

exports.main = async (event, context) => {
  console.log('[DataCleanup] 开始执行数据清理, event:', JSON.stringify(event));

  // 如果是定时触发器触发
  if (context.trigger === 'timer') {
    console.log('[DataCleanup] 由定时触发器调用');
  }

  const dateRange = getDateRange();
  console.log('[DataCleanup] 当前日期:', formatDate(dateRange.now));

  const results = {
    date: formatDate(dateRange.now),
    keep_range: {
      from: formatDate(dateRange.start),
      to: formatDate(dateRange.end)
    }
  };

  try {
    // 清理 gym_slots
    const gymSlotsResult = await cleanupGymSlots(dateRange);
    results.gym_slots = gymSlotsResult;

    // 清理 slot_bookings
    const slotBookingsResult = await cleanupSlotBookings(dateRange);
    results.slot_bookings = slotBookingsResult;

    // 清理 notifications
    const notificationsResult = await cleanupNotifications(dateRange);
    results.notifications = notificationsResult;

    console.log('[DataCleanup] 数据清理完成:', JSON.stringify(results));

    return successResponse(results);

  } catch (e) {
    console.error('[DataCleanup] 数据清理失败:', e);
    return errorResponse(7001, '数据清理失败: ' + e.message);
  }
};

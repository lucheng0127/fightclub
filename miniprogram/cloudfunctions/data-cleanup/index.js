/**
 * Data Archive Cloud Function
 * 数据归档云函数 - 定时归档过期数据
 * 触发方式：定时触发器（每天凌晨2点执行）
 *
 * 归档规则：
 * - gym_slots: 将超过当前日期的时段标记为归档
 * - slot_bookings: 将超过当前日期的预约标记为归档
 * - notifications: 将超过30天的通知标记为归档
 *
 * 归档数据不会被删除，只是标记为 archived=true
 * 查询时默认过滤归档数据，需要单独的归档查看接口
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 归档过期的 gym_slots 记录
 * 将日期早于今天的数据标记为 archived=true
 */
async function archiveGymSlots(now) {
  const today = formatDate(now);

  console.log('[DataArchive] 归档 gym_slots，早于', today);

  try {
    // 查询需要归档的记录（日期早于今天且未归档）
    const oldSlotsResult = await db.collection('gym_slots')
      .where({
        date: _.lt(today),
        archived: _.neq(true)  // 未归档的
      })
      .get();

    const oldSlots = oldSlotsResult.data;
    console.log('[DataArchive] 找到', oldSlots.length, '条需要归档的 gym_slots 记录');

    // 批量更新为归档状态
    if (oldSlots.length > 0) {
      const archivedAt = new Date();

      // 微信云开发批量更新限制，分批处理
      const batchSize = 20;
      for (let i = 0; i < oldSlots.length; i += batchSize) {
        const batch = oldSlots.slice(i, i + batchSize);
        const updatePromises = batch.map(slot => {
          return db.collection('gym_slots').doc(slot._id).update({
            data: {
              archived: true,
              archived_at: archivedAt
            }
          });
        });
        await Promise.all(updatePromises);
      }

      console.log('[DataArchive] 成功归档', oldSlots.length, '条 gym_slots 记录');
    }

    return {
      archived: oldSlots.length
    };
  } catch (e) {
    console.error('[DataArchive] 归档 gym_slots 失败:', e);
    throw e;
  }
}

/**
 * 归档过期的 slot_bookings 记录
 * 将关联的 gym_slot 已归档的预约标记为归档
 */
async function archiveSlotBookings(now) {
  const today = formatDate(now);

  console.log('[DataArchive] 归档 slot_bookings');

  try {
    // 先查询已归档的 gym_slots 的 slot_id
    const archivedSlotsResult = await db.collection('gym_slots')
      .where({
        date: _.lt(today),
        archived: true
      })
      .field({ slot_id: true })
      .get();

    const archivedSlotIds = archivedSlotsResult.data.map(s => s.slot_id);
    console.log('[DataArchive] 找到', archivedSlotIds.length, '个已归档的时间段');

    // 查询这些时间段下未归档的预约记录
    if (archivedSlotIds.length > 0) {
      let totalArchived = 0;
      const batchSize = 20; // 一次查询20个slot_id

      for (let i = 0; i < archivedSlotIds.length; i += batchSize) {
        const batch = archivedSlotIds.slice(i, i + batchSize);

        const bookingsResult = await db.collection('slot_bookings')
          .where({
            slot_id: _.in(batch),
            archived: _.neq(true)  // 未归档的
          })
          .get();

        const bookings = bookingsResult.data;

        if (bookings.length > 0) {
          const archivedAt = new Date();
          const updatePromises = bookings.map(booking => {
            return db.collection('slot_bookings').doc(booking._id).update({
              data: {
                archived: true,
                archived_at: archivedAt
              }
            });
          });
          await Promise.all(updatePromises);
          totalArchived += bookings.length;
        }
      }

      console.log('[DataArchive] 成功归档', totalArchived, '条 slot_bookings 记录');
      return { archived: totalArchived };
    }

    return { archived: 0 };
  } catch (e) {
    console.error('[DataArchive] 归档 slot_bookings 失败:', e);
    throw e;
  }
}

/**
 * 归档过期的 notifications 记录
 * 将超过30天的通知标记为归档
 */
async function archiveNotifications(now) {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  console.log('[DataArchive] 归档 notifications，早于', thirtyDaysAgo.toISOString());

  try {
    // 查询需要归档的通知记录
    const oldNotifsResult = await db.collection('notifications')
      .where({
        created_at: _.lt(thirtyDaysAgo),
        archived: _.neq(true)  // 未归档的
      })
      .get();

    const oldNotifs = oldNotifsResult.data;
    console.log('[DataArchive] 找到', oldNotifs.length, '条需要归档的通知记录');

    // 批量更新为归档状态
    if (oldNotifs.length > 0) {
      const archivedAt = new Date();
      const batchSize = 20;

      for (let i = 0; i < oldNotifs.length; i += batchSize) {
        const batch = oldNotifs.slice(i, i + batchSize);
        const updatePromises = batch.map(notif => {
          return db.collection('notifications').doc(notif._id).update({
            data: {
              archived: true,
              archived_at: archivedAt
            }
          });
        });
        await Promise.all(updatePromises);
      }

      console.log('[DataArchive] 成功归档', oldNotifs.length, '条通知记录');
      return { archived: oldNotifs.length };
    }

    return { archived: 0 };
  } catch (e) {
    console.error('[DataArchive] 归档 notifications 失败:', e);
    throw e;
  }
}

exports.main = async (event, context) => {
  console.log('[DataArchive] 开始执行数据归档, event:', JSON.stringify(event));

  // 如果是定时触发器触发
  if (context.trigger === 'timer') {
    console.log('[DataArchive] 由定时触发器调用');
  }

  const now = new Date();
  console.log('[DataArchive] 当前日期:', formatDate(now));

  const results = {
    date: formatDate(now),
    executed_at: now.toISOString()
  };

  try {
    // 归档 gym_slots
    const gymSlotsResult = await archiveGymSlots(now);
    results.gym_slots = gymSlotsResult;

    // 归档 slot_bookings
    const slotBookingsResult = await archiveSlotBookings(now);
    results.slot_bookings = slotBookingsResult;

    // 归档 notifications
    const notificationsResult = await archiveNotifications(now);
    results.notifications = notificationsResult;

    console.log('[DataArchive] 数据归档完成:', JSON.stringify(results));

    return successResponse(results);

  } catch (e) {
    console.error('[DataArchive] 数据归档失败:', e);
    return errorResponse(7001, '数据归档失败: ' + e.message);
  }
};

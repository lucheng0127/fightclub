/**
 * Gym List Cloud Function
 * 拳馆列表云函数
 * 支持按城市筛选、距离排序，支持分页
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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

/**
 * 使用 Haversine 公式计算两点间距离（米）
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * 格式化距离显示
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  console.log('[GymList] openid:', openid.substring(0, 8) + '...');
  console.log('[GymList] filters:', event);

  try {
    const {
      city = null,
      sort_by_distance = false,
      user_location = null,
      page = 1,
      limit = 20
    } = event;

    // 构建查询条件
    const where = {
      status: 'approved' // 只显示已审核通过的拳馆
    };

    // 城市筛选
    if (city) {
      where.city = city;
    }

    console.log('[GymList] where condition:', JSON.stringify(where));

    // 获取总数
    const countResult = await db.collection('gyms').where(where).count();
    const total = countResult.total;

    // 获取拳馆列表
    const skip = (page - 1) * limit;
    let result;

    if (sort_by_distance && user_location && user_location.latitude && user_location.longitude) {
      // 需要按距离排序，先获取所有符合条件的数据，然后在内存中排序
      result = await db.collection('gyms')
        .where(where)
        .orderBy('created_at', 'desc')
        .get();

      // 计算距离并排序
      const gymsWithDistance = result.data.map(gym => {
        const distance = getDistance(
          user_location.latitude,
          user_location.longitude,
          gym.location.latitude,
          gym.location.longitude
        );
        return {
          ...gym,
          _distance: distance
        };
      }).sort((a, b) => a._distance - b._distance);

      // 分页
      const start = skip;
      const end = skip + limit;
      const pagedGyms = gymsWithDistance.slice(start, end);

      // 获取每个拳馆的拳手数量
      const gymIds = pagedGyms.map(g => g._id);
      let boxerCounts = {};
      if (gymIds.length > 0) {
        const boxerCountResult = await db.collection('boxers')
          .where({
            gym_id: db.command.in(gymIds)
          })
          .field({
            gym_id: true
          })
          .get();

        boxerCountResult.data.forEach(boxer => {
          if (!boxerCounts[boxer.gym_id]) {
            boxerCounts[boxer.gym_id] = 0;
          }
          boxerCounts[boxer.gym_id]++;
        });
      }

      // 处理返回数据
      const gyms = pagedGyms.map(gym => {
        return {
          gym_id: gym.gym_id,
          user_id: gym.user_id,
          name: gym.name,
          address: gym.address,
          location: gym.location,
          city: gym.city,
          phone: gym.phone,
          icon_url: gym.icon_url,
          boxer_count: boxerCounts[gym._id] || 0,
          distance: formatDistance(gym._distance),
          distance_meters: gym._distance,
          created_at: gym.created_at,
          updated_at: gym.updated_at
        };
      });

      console.log('[GymList] 查询成功（距离排序）, count:', gyms.length, 'total:', total);

      return successResponse({
        list: gyms,
        total: total,
        page: page,
        limit: limit,
        has_more: skip + gyms.length < total
      });

    } else {
      // 不需要距离排序，直接分页查询
      result = await db.collection('gyms')
        .where(where)
        .orderBy('created_at', 'desc')
        .skip(skip)
        .limit(limit)
        .get();

      // 获取每个拳馆的拳手数量
      const gymIds = result.data.map(g => g._id);
      let boxerCounts = {};
      if (gymIds.length > 0) {
        const boxerCountResult = await db.collection('boxers')
          .where({
            gym_id: db.command.in(gymIds)
          })
          .field({
            gym_id: true
          })
          .get();

        boxerCountResult.data.forEach(boxer => {
          if (!boxerCounts[boxer.gym_id]) {
            boxerCounts[boxer.gym_id] = 0;
          }
          boxerCounts[boxer.gym_id]++;
        });
      }

      // 处理返回数据
      const gyms = result.data.map(gym => {
        return {
          gym_id: gym.gym_id,
          user_id: gym.user_id,
          name: gym.name,
          address: gym.address,
          location: gym.location,
          city: gym.city,
          phone: gym.phone,
          icon_url: gym.icon_url,
          boxer_count: boxerCounts[gym._id] || 0,
          created_at: gym.created_at,
          updated_at: gym.updated_at
        };
      });

      console.log('[GymList] 查询成功, count:', gyms.length, 'total:', total);

      return successResponse({
        list: gyms,
        total: total,
        page: page,
        limit: limit,
        has_more: skip + gyms.length < total
      });
    }

  } catch (e) {
    console.error('[GymList] 查询失败:', e);
    return errorResponse(3010, '查询拳馆列表失败');
  }
};

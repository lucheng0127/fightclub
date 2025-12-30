/**
 * Boxer List Cloud Function
 * 拳手列表云函数
 * 支持按城市、性别、年龄范围、体重范围筛选，支持分页
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
 * 计算年龄
 */
function calculateAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 根据年龄范围计算出生日期范围
 * age_min: 最小年龄（最年轻的人）-> 出生日期最晚（最近）
 * age_max: 最大年龄（最年长的人）-> 出生日期最早（最远）
 */
function getBirthdateRange(ageMin, ageMax) {
  const today = new Date();

  // 年龄越大，出生日期越早
  // age_min (最年轻) -> maxBirthdate (最近的出生日期)
  // age_max (最年长) -> minBirthdate (最早的出生日期)

  let minBirthdate, maxBirthdate;

  if (ageMin !== null && ageMin !== undefined) {
    // 最小年龄：出生日期不能晚于今天减去ageMin年
    maxBirthdate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
  }

  if (ageMax !== null && ageMax !== undefined) {
    // 最大年龄：出生日期不能早于今天减去ageMax年
    minBirthdate = new Date(today.getFullYear() - (ageMax + 1), today.getMonth(), today.getDate() + 1);
  }

  return { minBirthdate, maxBirthdate };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || wxContext.openid || '';

  console.log('[BoxerList] openid:', openid.substring(0, 8) + '...');
  console.log('[BoxerList] filters:', event);

  try {
    const {
      city = null,
      gender = null,
      age_min = null,
      age_max = null,
      weight_min = null,
      weight_max = null,
      page = 1,
      limit = 20
    } = event;

    // 构建查询条件
    const where = {};

    // 城市筛选
    if (city) {
      where.city = city;
    }

    // 性别筛选
    if (gender && (gender === 'male' || gender === 'female')) {
      where.gender = gender;
    }

    // 年龄筛选（转换为出生日期范围）
    if (age_min !== null || age_max !== null) {
      const { minBirthdate, maxBirthdate } = getBirthdateRange(age_min, age_max);

      if (age_min !== null && age_max !== null) {
        // 既有最小年龄又有最大年龄：between minBirthdate and maxBirthdate
        where.birthdate = db.command.gte(minBirthdate).and(db.command.lte(maxBirthdate));
      } else if (age_min !== null) {
        // 只有最小年龄：出生日期 <= maxBirthdate (年龄 >= age_min)
        where.birthdate = db.command.lte(maxBirthdate);
      } else if (age_max !== null) {
        // 只有最大年龄：出生日期 >= minBirthdate (年龄 <= age_max)
        where.birthdate = db.command.gte(minBirthdate);
      }
    }

    // 体重筛选
    if (weight_min !== null || weight_max !== null) {
      if (weight_min !== null && weight_max !== null) {
        where.weight = db.command.gte(weight_min).and(db.command.lte(weight_max));
      } else if (weight_min !== null) {
        where.weight = db.command.gte(weight_min);
      } else if (weight_max !== null) {
        where.weight = db.command.lte(weight_max);
      }
    }

    console.log('[BoxerList] where condition:', JSON.stringify(where));

    // 获取总数
    const countResult = await db.collection('boxers').where(where).count();
    const total = countResult.total;

    // 获取拳手列表
    const skip = (page - 1) * limit;
    const result = await db.collection('boxers')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    // 处理返回数据
    const boxers = result.data.map(boxer => {
      const age = calculateAge(boxer.birthdate);
      return {
        boxer_id: boxer.boxer_id,
        user_id: boxer.user_id,
        nickname: boxer.nickname,
        gender: boxer.gender,
        age: age,
        height: boxer.height,
        weight: boxer.weight,
        city: boxer.city,
        phone: boxer.phone,
        record_wins: boxer.record_wins || 0,
        record_losses: boxer.record_losses || 0,
        record_draws: boxer.record_draws || 0,
        gym_id: boxer.gym_id,
        created_at: boxer.created_at,
        updated_at: boxer.updated_at
      };
    });

    console.log('[BoxerList] 查询成功, count:', boxers.length, 'total:', total);

    return successResponse({
      list: boxers,
      total: total,
      page: page,
      limit: limit,
      has_more: skip + boxers.length < total
    });

  } catch (e) {
    console.error('[BoxerList] 查询失败:', e);
    return errorResponse(2010, '查询拳手列表失败');
  }
};

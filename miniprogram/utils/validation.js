/**
 * Input Validation Utilities
 * 输入验证工具函数
 */

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function isValidPhone(phone) {
  if (!phone) return true; // 可选字段，空值有效
  const phoneReg = /^1[3-9]\d{9}$/;
  return phoneReg.test(phone);
}

/**
 * 验证昵称
 * @param {string} nickname - 昵称
 * @returns {boolean} 是否有效
 */
function isValidNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return false;
  const len = nickname.trim().length;
  return len >= 1 && len <= 50;
}

/**
 * 验证身高
 * @param {number} height - 身高（厘米）
 * @returns {boolean} 是否有效
 */
function isValidHeight(height) {
  return typeof height === 'number' && height >= 100 && height <= 250;
}

/**
 * 验证体重
 * @param {number} weight - 体重（公斤）
 * @returns {boolean} 是否有效
 */
function isValidWeight(weight) {
  return typeof weight === 'number' && weight >= 30 && weight <= 200;
}

/**
 * 验证性别
 * @param {string} gender - 性别（male/female）
 * @returns {boolean} 是否有效
 */
function isValidGender(gender) {
  return gender === 'male' || gender === 'female';
}

/**
 * 验证出生日期
 * @param {string|Date} birthdate - 出生日期
 * @returns {boolean} 是否有效
 */
function isValidBirthdate(birthdate) {
  if (!birthdate) return false;
  const date = new Date(birthdate);
  const now = new Date();

  // 检查是否为有效日期
  if (isNaN(date.getTime())) return false;

  // 检查是否为过去的日期
  return date < now;
}

/**
 * 计算年龄
 * @param {string|Date} birthdate - 出生日期
 * @returns {number} 年龄
 */
function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * 格式化战绩显示
 * @param {object} record - 战绩 {wins, losses, draws}
 * @returns {string} 格式化后的战绩字符串
 */
function formatRecord(record) {
  if (!record || record.wins === null || record.wins === undefined) {
    return '未填写';
  }
  const wins = record.wins || 0;
  const losses = record.losses || 0;
  const draws = record.draws || 0;
  return `${wins}胜${losses}负${draws}平`;
}

/**
 * 验证拳馆名称
 * @param {string} name - 拳馆名称
 * @returns {boolean} 是否有效
 */
function isValidGymName(name) {
  if (!name || typeof name !== 'string') return false;
  const len = name.trim().length;
  return len >= 1 && len <= 100;
}

/**
 * 验证地址
 * @param {string} address - 地址
 * @returns {boolean} 是否有效
 */
function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const len = address.trim().length;
  return len >= 1 && len <= 200;
}

/**
 * 验证经纬度
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @returns {boolean} 是否有效
 */
function isValidLocation(latitude, longitude) {
  const validLat = typeof latitude === 'number' && latitude >= -90 && latitude <= 90;
  const validLon = typeof longitude === 'number' && longitude >= -180 && longitude <= 180;
  return validLat && validLon;
}

/**
 * 验证URL
 * @param {string} url - URL地址
 * @returns {boolean} 是否有效
 */
function isValidURL(url) {
  if (!url) return true; // 可选字段
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 显示验证错误提示
 * @param {string} field - 字段名称
 * @param {string} value - 错误值
 */
function showValidationError(field, value) {
  wx.showToast({
    title: `${field}格式不正确`,
    icon: 'none',
    duration: 2000
  });
}

module.exports = {
  isValidPhone,
  isValidNickname,
  isValidHeight,
  isValidWeight,
  isValidGender,
  isValidBirthdate,
  calculateAge,
  formatRecord,
  isValidGymName,
  isValidAddress,
  isValidLocation,
  isValidURL,
  showValidationError
};

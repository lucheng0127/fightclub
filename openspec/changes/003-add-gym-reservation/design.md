# 设计文档：拳手预约拳馆功能

## 数据模型设计

### gym_slots 集合（拳馆场地时间段）

```javascript
{
  _id: ObjectId,
  slot_id: String,           // 唯一标识: slot_<hash>
  gym_id: String,            // 关联拳馆
  user_id: String,           // 拳馆所有者 OpenID（云函数内部使用）
  date: Date,                // 日期（YYYY-MM-DD）
  start_time: String,        // 开始时间（HH:mm）
  end_time: String,          // 结束时间（HH:mm）
  max_boxers: Number,        // 最大人数
  current_bookings: Number,  // 当前预约数
  status: String,            // 状态: active/cancelled
  created_at: Date,
  updated_at: Date
}
```

**索引设计**:
- `gym_id + date + status`: 复合索引，用于拳馆查看自己的时间段
- `date + status`: 复合索引，用于拳手浏览可用时间段
- `slot_id`: 唯一索引

### slot_bookings 集合（预约记录）

```javascript
{
  _id: ObjectId,
  booking_id: String,        // 唯一标识: booking_<hash>
  slot_id: String,           // 关联时间段
  gym_id: String,            // 拳馆 ID（用于查询）
  boxer_id: String,          // 拳手 ID
  boxer_user_id: String,     // 拳手 OpenID（云函数内部使用）
  booking_time: Date,        // 预约时间
  status: String,            // 状态: active/cancelled
  cancelled_at: Date,        // 取消时间（可选）
  created_at: Date,
  updated_at: Date
}
```

**索引设计**:
- `slot_id + status`: 复合索引，用于查询时间段的预约列表
- `boxer_id + status`: 复合索引，用于查询拳手的预约记录

## 云函数设计

### 1. gym-slot-publish（发布时间段）

**输入**:
```javascript
{
  date: "YYYY-MM-DD",
  start_time: "HH:mm",
  end_time: "HH:mm",
  max_boxers: Number
}
```

**输出**:
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    slot_id: "slot_xxx",
    date: "YYYY-MM-DD",
    start_time: "HH:mm",
    end_time: "HH:mm",
    max_boxers: Number
  }
}
```

**逻辑**:
1. 验证日期在未来一周内
2. 验证时间有效性（开始时间 < 结束时间）
3. 检查时间段是否冲突（同一拳馆同一时间）
4. 生成 slot_id
5. 使用事务创建记录

### 2. gym-slot-list（查看已发布时间段）

**输入**:
```javascript
{
  status: "all" | "active" | "cancelled"
}
```

**输出**:
```javascript
{
  errcode: 0,
  data: {
    slots: [
      {
        slot_id: "slot_xxx",
        date: "YYYY-MM-DD",
        start_time: "HH:mm",
        end_time: "HH:mm",
        max_boxers: Number,
        current_bookings: Number,
        status: "active",
        can_modify: Boolean  // 是否可修改（无预约时为 true）
      }
    ]
  }
}
```

### 3. gym-slot-update（修改时间段）

**输入**:
```javascript
{
  slot_id: "slot_xxx",
  date: "YYYY-MM-DD",
  start_time: "HH:mm",
  end_time: "HH:mm",
  max_boxers: Number
}
```

**验证**:
- 检查当前预约数，如果有预约则拒绝修改
- 验证新时间段不冲突

### 4. gym-slot-delete（撤销时间段）

**验证**:
- 检查当前预约数，如果有预约则拒绝删除

### 5. slot-list（拳手浏览可用时间段）

**输入**:
```javascript
{
  date_from: "YYYY-MM-DD",    // 可选
  date_to: "YYYY-MM-DD",      // 可选
  gym_id: "gym_xxx",          // 可选
  city: "城市名"              // 可选
}
```

**输出**:
```javascript
{
  errcode: 0,
  data: {
    slots: [
      {
        slot_id: "slot_xxx",
        gym: {
          gym_id: "gym_xxx",
          name: "拳馆名称",
          address: "地址",
          city: "城市"
        },
        date: "YYYY-MM-DD",
        start_time: "HH:mm",
        end_time: "HH:mm",
        max_boxers: Number,
        current_bookings: Number,
        available_spots: Number,  // 剩余名额
        status: "active",
        is_booked: Boolean        // 当前用户是否已预约
      }
    ]
  }
}
```

### 6. slot-book（预约时间段）

**输入**:
```javascript
{
  slot_id: "slot_xxx"
}
```

**事务逻辑**:
1. 查询时间段状态和当前预约数
2. 检查是否达到人数上限
3. 检查用户是否已预约该时间段
4. 创建预约记录
5. 更新时间段的 current_bookings
6. 发送消息通知给拳馆

### 7. slot-cancel（取消预约）

**输入**:
```javascript
{
  booking_id: "booking_xxx"  // 或 slot_id
}
```

**验证**:
- 检查是否在时间段结束前半小时
- 检查是否是本人预约

**事务逻辑**:
1. 更新预约记录状态为 cancelled
2. 减少时间段的 current_bookings
3. 发送消息通知给拳馆和其他预约拳手

### 8. slot-bookings（查看时间段预约列表）

**输入**:
```javascript
{
  slot_id: "slot_xxx"
}
```

**输出**:
```javascript
{
  errcode: 0,
  data: {
    slot: {
      slot_id: "slot_xxx",
      gym: { gym_id, name, ... },
      date: "YYYY-MM-DD",
      start_time: "HH:mm",
      end_time: "HH:mm",
      max_boxers: Number,
      current_bookings: Number
    },
    boxers: [
      {
        boxer_id: "boxer_xxx",
        nickname: "昵称",
        height: Number,
        weight: Number,
        city: "城市",
        booking_time: Date
      }
    ]
  }
}
```

## 消息通知设计

### 通知类型

1. **新预约通知**（发给拳馆）
   - 触发：拳手预约时间段
   - 内容：拳手昵称、预约时间、时间段信息

2. **取消预约通知**（发给拳馆 + 其他预约拳手）
   - 触发：拳手取消预约
   - 内容：取消拳手昵称、时间段信息、剩余名额

### 实现方式

#### 应用内消息
- 在 `notifications` 集合中记录通知
```javascript
{
  _id: ObjectId,
  notification_id: String,
  recipient_user_id: String,     // 接收者 OpenID
  type: String,                  // "new_booking" | "cancelled_booking"
  title: String,
  content: String,
  related_slot_id: String,
  related_boxer_id: String,
  is_read: Boolean,
  created_at: Date
}
```

#### 微信订阅消息
- 使用微信小程序订阅消息 API
- 需要在微信公众平台配置订阅消息模板
- 云函数调用 `cloud.openapi.subscribeMessage.send()` 发送

## 页面导航设计

### 拳馆侧
```
拳馆 Dashboard
  └── 场地管理 (gym-slot-manage)
        ├── 发布时间段 (gym-slot-publish)
        └── 编辑时间段 (gym-slot-edit)
              └── 查看预约列表 (slot-bookings)
```

### 拳手侧
```
Dashboard
  └── 可预约场地 (slot-list)
        ├── 时间段详情 (slot-detail)
        │     └── 查看已预约拳手 (slot-bookings)
        └── 我的预约 (my-bookings)
```

## 安全考虑

1. **OpenID 保护**：
   - 所有云函数中使用 OpenID 进行权限验证
   - 返回给前端的数据不包含原始 OpenID

2. **权限验证**：
   - 拳馆只能操作自己的时间段
   - 拳手只能取消自己的预约
   - 拳馆状态必须是 approved 才能发布时间段

3. **数据一致性**：
   - 预约和取消操作使用数据库事务
   - 并发预约时检查人数上限

## 时间处理

### 一周范围计算
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

const weekLater = new Date(today);
weekLater.setDate(weekLater.getDate() + 7);
```

### 取消预约截止时间检查
```javascript
const slotEndDateTime = new Date(`${date}T${end_time}:00`);
const cancelDeadline = new Date(slotEndDateTime.getTime() - 30 * 60 * 1000);
if (now >= cancelDeadline) {
  return errorResponse(5001, '已超过取消截止时间（时间段结束前半小时）');
}
```

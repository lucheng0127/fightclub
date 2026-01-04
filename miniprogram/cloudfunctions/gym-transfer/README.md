# gym-transfer 云函数

## 功能说明
拳馆负责人转移功能,允许拳馆负责人将拳馆转移给其他平台用户。

## 数据库要求

### 集合: gym_transfers

**创建方式**: 在微信云开发控制台手动创建集合

**字段说明**:
- `_id`: ObjectId (主键)
- `transfer_id`: String (转移ID, 前缀: transf_)
- `gym_id`: String (拳馆ID)
- `gym_name`: String (拳馆名称快照)
- `from_user_id`: String (原负责人 OpenID)
- `from_user_hash`: String (原负责人匿名ID)
- `from_nickname`: String (原负责人昵称快照)
- `to_user_id`: String (新负责人 OpenID)
- `to_user_hash`: String (新负责人匿名ID)
- `to_nickname`: String (新负责人昵称快照)
- `transferred_at`: Date (转移时间)
- `gym_status`: String (拳馆当时状态快照)

**索引建议**:
- `gym_id`: 普通索引,用于查询拳馆转移历史
- `transferred_at`: 普通索引,用于按时间查询

### 创建集合步骤

1. 打开微信云开发控制台
2. 进入数据库
3. 点击"添加集合",输入集合名称 `gym_transfers`
4. 权限设置: 仅创建者可读写
5. 点击确定创建集合

### 创建索引步骤

1. 在 `gym_transfers` 集合页面
2. 点击"索引管理"
3. 添加索引:
   - 索引名称: `gym_id_idx`
   - 字段: `gym_id` (升序)
   - 索引类型: 普通索引
4. 再次添加索引:
   - 索引名称: `transferred_at_idx`
   - 字段: `transferred_at` (降序)
   - 索引类型: 普通索引

## API 接口

### 请求参数
```javascript
{
  target_user_id: string  // 接收人的匿名 user_id (hash后的ID)
}
```

### 响应数据
**成功**:
```javascript
{
  errcode: 0,
  errmsg: 'success',
  data: {
    transfer_id: string,
    gym_id: string,
    to_nickname: string
  }
}
```

**失败**:
```javascript
{
  errcode: number,
  errmsg: string
}
```

### 错误码
- `8001`: 不是拳馆负责人
- `8002`: 接收人用户不存在
- `8003`: 接收人已拥有拳馆档案
- `8004`: 拳馆状态不允许转移(未审核通过)
- `8005`: 不能转移给自己
- `8006`: 数据库事务失败

## 部署说明
在微信开发者工具中右键 `gym-transfer` 文件夹,选择"上传并部署:云端安装依赖"。

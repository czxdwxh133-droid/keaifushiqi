# SQL 查询模式参考

## 表结构与关联关系

示例数据库包含四张表，关联方式如下：
- orders.user_id → users.id：订单关联用户
- orders.product_id → products.id：订单关联商品
- reviews.user_id → users.id：评论关联用户
- reviews.product_id → products.id：评论关联商品

## 日期处理（SQLite 方言）

SQLite 使用 strftime 函数处理日期：
- 按年-月分组：`strftime('%Y-%m', create_time)`
- 按月分组：`strftime('%m', create_time)`
- 按季度分组：`(CAST(strftime('%m', create_time) AS INTEGER) + 2) / 3`
- 日期范围过滤：`create_time >= '2024-01-01' AND create_time < '2024-07-01'`

## 总销售额查询

计算已完成订单的总销售额：
```sql
SELECT SUM(amount) as total_sales FROM orders WHERE status = '已完成'
```
注意：统计销售额时应排除"已取消"和"已退款"状态的订单。

## 分类汇总

按商品类别统计销售额：
```sql
SELECT p.category, SUM(o.amount) as total_sales, COUNT(DISTINCT o.user_id) as buyer_count
FROM orders o JOIN products p ON o.product_id = p.id
WHERE o.status = '已完成'
GROUP BY p.category ORDER BY total_sales DESC
```

## 月度趋势分析

按月统计销售额变化趋势：
```sql
SELECT strftime('%Y-%m', o.create_time) as month, SUM(o.amount) as sales, COUNT(*) as order_count
FROM orders o WHERE o.status = '已完成'
GROUP BY month ORDER BY month
```

## 用户地理分布

按城市统计用户数量和消费金额：
```sql
SELECT u.city, COUNT(DISTINCT u.id) as user_count, COALESCE(SUM(o.amount), 0) as total_spent
FROM users u LEFT JOIN orders o ON u.id = o.user_id AND o.status = '已完成'
GROUP BY u.city ORDER BY total_spent DESC
```

## Top N 排行

查询销售额最高的前5个商品：
```sql
SELECT p.name, SUM(o.amount) as total_sales
FROM orders o JOIN products p ON o.product_id = p.id
WHERE o.status = '已完成'
GROUP BY p.id ORDER BY total_sales DESC LIMIT 5
```

## 用户消费行为

查询每个用户的消费概况：
```sql
SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_spent,
       AVG(o.amount) as avg_order_value, MAX(o.create_time) as last_order
FROM users u LEFT JOIN orders o ON u.id = o.user_id AND o.status = '已完成'
GROUP BY u.id ORDER BY total_spent DESC
```

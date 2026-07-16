// Package redis 提供 Redis（或 Memurai 等兼容服务）客户端的封装。
// Redis 在本项目中主要用于：
//   - 存储 JWT Token，实现单点登录检测（同一账号只能有一个在线会话）
//   - 存储短信验证码（带过期时间）
//   - 场景服务中的 AOI（区域兴趣）实体位置缓存
//   - 登录频率限流（防止暴力破解）
package redis

import (
	"context" // Go 标准库：用于传递超时和取消信号
	"time"

	// go-redis 是 Go 语言中最常用的 Redis 客户端库
	// 这里取了别名 goredis，避免与包名 redis 冲突
	"xunxian/internal/config" // 引入项目的配置结构体

	goredis "github.com/go-redis/redis/v8"
)

// Client 是对 go-redis 客户端的封装。
// 为什么封装？因为 go-redis 原生 API 每次调用都需要传入 context，
// 封装后简化为内部统一管理 context，调用方不需要关心。
type Client struct {
	rdb *goredis.Client // 底层 go-redis 客户端实例
	ctx context.Context // 默认的上下文对象（用于所有 Redis 操作）
}

// NewRedis 创建并返回一个 Redis 客户端实例。
//
// 参数:
//   - cfg: Redis 配置项，包含地址（如 "127.0.0.1:6379"）、密码、数据库编号
//
// 返回值:
//   - *Client: 封装后的 Redis 客户端
//   - error: 如果 Redis 不可达则返回错误
func NewRedis(cfg config.RedisConfig) (*Client, error) {
	// 创建 go-redis 客户端，传入连接参数
	rdb := goredis.NewClient(&goredis.Options{
		Addr:     cfg.Addr,     // Redis 服务地址，格式: "IP:端口"
		Password: cfg.Password, // Redis 密码，本地开发一般为空
		DB:       cfg.DB,       // Redis 数据库编号（0-15），不同服务可用不同编号隔离数据
	})

	// 使用空的背景上下文（不会超时，适合长期运行的服务）
	ctx := context.Background()

	// Ping 验证 Redis 连通性，如果 Redis 没启动或密码错误会在这里报错
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &Client{rdb: rdb, ctx: ctx}, nil
}

// Close 关闭 Redis 连接，释放资源。
// 通常在服务关闭时调用（defer rdb.Close()）。
func (c *Client) Close() error {
	return c.rdb.Close()
}

// Set 向 Redis 写入一个键值对，可设置过期时间。
//
// 参数:
//   - key: 键名，如 "token:abc123" 或 "sms:13800138000"
//   - value: 值，支持字符串、数字等任何类型（go-redis 会自动序列化）
//   - expiration: 过期时间，如 2*time.Hour 表示2小时后自动删除；设为0表示永不过期
func (c *Client) Set(key string, value interface{}, expiration time.Duration) error {
	return c.rdb.Set(c.ctx, key, value, expiration).Err()
}

// Get 从 Redis 读取指定键的值。
//
// 参数:
//   - key: 键名
//
// 返回值:
//   - string: 键对应的值（字符串形式）
//   - error: 如果键不存在会返回 redis.Nil 错误
func (c *Client) Get(key string) (string, error) {
	return c.rdb.Get(c.ctx, key).Result()
}

// Del 从 Redis 删除指定键。
// 常用于用户登出时删除其 Token，或验证码使用后删除。
func (c *Client) Del(key string) error {
	return c.rdb.Del(c.ctx, key).Err()
}

// Exists 检查指定键是否存在于 Redis 中。
//
// 返回值:
//   - bool: true=键存在，false=键不存在
//   - error: Redis 操作错误
//
// 使用场景：检查某个 Token 是否仍然有效（存在且未过期）。
func (c *Client) Exists(key string) (bool, error) {
	// Exists 返回匹配到的键的数量（0或1），转换为 bool
	n, err := c.rdb.Exists(c.ctx, key).Result()
	return n > 0, err
}

// Incr 将指定键的值原子性地加1，并返回新值。
//
// 使用场景：
//   - 登录频率限流：每次登录请求 Incr 一次，超过阈值则拒绝
//   - 如果键不存在，Redis 会先初始化为0再加1，返回1
func (c *Client) Incr(key string) (int64, error) {
	return c.rdb.Incr(c.ctx, key).Result()
}

// Expire 为已存在的键设置或更新过期时间。
//
// 参数:
//   - key: 键名
//   - expiration: 过期时间，如 5*time.Minute 表示5分钟后过期
//
// 使用场景：延长 Token 有效期，或为没有设置过期时间的键补充过期策略。
func (c *Client) Expire(key string, expiration time.Duration) error {
	return c.rdb.Expire(c.ctx, key, expiration).Err()
}

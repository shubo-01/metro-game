package redis

import (
	"context"
	"time"

	goredis "github.com/go-redis/redis/v8"
	"xunxian/internal/config"
)

type Client struct {
	rdb *goredis.Client
	ctx context.Context
}

func NewRedis(cfg config.RedisConfig) (*Client, error) {
	rdb := goredis.NewClient(&goredis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Client{rdb: rdb, ctx: ctx}, nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

func (c *Client) Set(key string, value interface{}, expiration time.Duration) error {
	return c.rdb.Set(c.ctx, key, value, expiration).Err()
}

func (c *Client) Get(key string) (string, error) {
	return c.rdb.Get(c.ctx, key).Result()
}

func (c *Client) Del(key string) error {
	return c.rdb.Del(c.ctx, key).Err()
}

func (c *Client) Exists(key string) (bool, error) {
	n, err := c.rdb.Exists(c.ctx, key).Result()
	return n > 0, err
}

func (c *Client) Incr(key string) (int64, error) {
	return c.rdb.Incr(c.ctx, key).Result()
}

func (c *Client) Expire(key string, expiration time.Duration) error {
	return c.rdb.Expire(c.ctx, key, expiration).Err()
}

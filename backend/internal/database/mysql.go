// Package database 提供 MySQL 数据库连接的初始化和管理功能。
// 本包封装了 Go 标准库 database/sql 的连接创建逻辑，
// 所有微服务（auth/player/scene/session）启动时都通过本包创建数据库连接。
package database

import (
	"database/sql" // Go 标准库：通用的 SQL 数据库操作接口
	"time"

	// 导入 MySQL 驱动（注意前面的 _ 表示只执行包的 init 函数来注册驱动，不直接使用包中的任何符号）
	// 这个驱动让 database/sql 能够识别 "mysql" 这个数据库类型
	"xunxian/internal/config" // 引入项目的配置结构体

	_ "github.com/go-sql-driver/mysql"
)

// NewMySQL 创建并返回一个 MySQL 数据库连接池。
//
// 参数:
//   - cfg: MySQL 配置项，包含 DSN 连接字符串、最大连接数等参数
//
// 返回值:
//   - *sql.DB: 数据库连接池对象（不是单个连接，而是一个可复用的连接池）
//   - error: 如果连接失败则返回错误
//
// 使用示例:
//
//	db, err := database.NewMySQL(config.MySQLConfig{
//	    DSN:          "root:password@tcp(127.0.0.1:3306)/game_main",
//	    MaxOpenConns: 50,
//	    MaxIdleConns: 10,
//	})
func NewMySQL(cfg config.MySQLConfig) (*sql.DB, error) {
	// 第一步：创建数据库连接（此时并不会真正连接数据库，只是初始化连接池对象）
	db, err := sql.Open("mysql", cfg.DSN)
	if err != nil {
		return nil, err
	}

	// 第二步：设置连接池参数
	// MaxOpenConns: 最大同时打开的连接数，防止数据库被过多连接压垮
	if cfg.MaxOpenConns > 0 {
		db.SetMaxOpenConns(cfg.MaxOpenConns)
	}
	// MaxIdleConns: 最大空闲连接数，空闲连接会被保留以复用，避免频繁创建/销毁
	if cfg.MaxIdleConns > 0 {
		db.SetMaxIdleConns(cfg.MaxIdleConns)
	}
	// ConnMaxLifetime: 每个连接的最大存活时间，超过后会被回收重建
	// 设为 1 小时，防止数据库端主动关闭的连接被客户端继续使用导致报错
	db.SetConnMaxLifetime(time.Hour)

	// 第三步：真正尝试连接数据库（Ping 会发送一个简单的查询验证连通性）
	// 如果 MySQL 没有启动或者密码错误，这里会返回错误
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

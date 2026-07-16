// Package config 负责从 YAML 配置文件加载微服务的运行参数。
//
// 每个微服务都有自己的配置文件（如 configs/auth.yaml），格式统一，
// 启动时通过 config.Load("configs/xxx.yaml") 读取并解析为 Config 结构体。
//
// 配置文件示例（configs/auth.yaml）:
//
//	server:
//	  port: 8001          # HTTP 监听端口
//	  name: auth-service  # 服务名称（用于日志标识）
//	mysql:
//	  dsn: "root:password@tcp(127.0.0.1:3306)/game_main?charset=utf8mb4"
//	redis:
//	  addr: "127.0.0.1:6379"
package config

import (
	"os" // Go 标准库：用于读取文件

	// yaml.v3 是 Go 语言的 YAML 解析库
	// 负责把 YAML 格式的配置文件解析为 Go 的结构体
	"gopkg.in/yaml.v3"
)

// Config 是所有微服务的顶层配置结构体。
// 每个字段对应 YAML 配置文件中的一级节点。
// 结构体标签 `yaml:"xxx"` 告诉解析器 YAML 中对应的键名。
type Config struct {
	Server ServerConfig `yaml:"server"`  // 服务器配置（端口号、服务名）
	MySQL  MySQLConfig  `yaml:"mysql"`   // MySQL 数据库连接配置
	Redis  RedisConfig  `yaml:"redis"`   // Redis 缓存连接配置
	JWT    JWTConfig    `yaml:"jwt"`     // JWT Token 签名和过期时间配置
	Wechat WechatConfig `yaml:"wechat"`  // 微信小游戏/小程序的 AppID 和密钥
	Douyin DouyinConfig `yaml:"douyin"`  // 抖音小游戏的 AppID 和密钥
	AliSMS AliSMSConfig `yaml:"ali_sms"` // 阿里云短信服务的密钥和模板配置
}

// ServerConfig 服务器基础配置。
type ServerConfig struct {
	Port int    `yaml:"port"` // HTTP 服务监听端口，如 8001
	Name string `yaml:"name"` // 服务名称，如 "auth-service"，用于日志中区分不同服务
}

// MySQLConfig MySQL 数据库连接配置。
type MySQLConfig struct {
	DSN          string `yaml:"dsn"`            // 数据源名称（连接字符串），格式: "用户名:密码@tcp(地址:端口)/库名?参数"
	MaxOpenConns int    `yaml:"max_open_conns"` // 连接池最大打开连接数，防止数据库过载
	MaxIdleConns int    `yaml:"max_idle_conns"` // 连接池最大空闲连接数，保留以复用
}

// RedisConfig Redis 缓存连接配置。
type RedisConfig struct {
	Addr     string `yaml:"addr"`     // Redis 服务地址，格式: "IP:端口"，如 "127.0.0.1:6379"
	Password string `yaml:"password"` // Redis 访问密码，本地开发环境通常为空
	DB       int    `yaml:"db"`       // Redis 数据库编号（0-15），不同服务可用不同编号隔离数据
}

// JWTConfig JWT（JSON Web Token）配置。
// JWT 是一种无状态的认证方案，服务端签发加密的 Token 给客户端，
// 客户端每次请求携带 Token，服务端验证 Token 的有效性来确认用户身份。
type JWTConfig struct {
	Secret         string `yaml:"secret"`          // 签名密钥，用于加密和解密 Token（生产环境必须修改为强随机字符串）
	AccessExpires  int    `yaml:"access_expires"`  // AccessToken 有效期，单位：小时（默认2小时）
	RefreshExpires int    `yaml:"refresh_expires"` // RefreshToken 有效期，单位：天（默认7天），用于 AccessToken 过期后刷新
}

// WechatConfig 微信小游戏/小程序的应用凭证配置。
type WechatConfig struct {
	AppID     string `yaml:"app_id"`     // 微信开放平台分配的应用 ID
	AppSecret string `yaml:"app_secret"` // 微信开放平台分配的应用密钥（不能泄露）
}

// DouyinConfig 抖音小游戏的应用凭证配置。
type DouyinConfig struct {
	AppID     string `yaml:"app_id"`     // 抖音开放平台分配的应用 ID
	AppSecret string `yaml:"app_secret"` // 抖音开放平台分配的应用密钥（不能泄露）
}

// AliSMSConfig 阿里云短信服务配置。
type AliSMSConfig struct {
	AccessKeyID     string `yaml:"access_key_id"`     // 阿里云 AccessKey ID（身份标识）
	AccessKeySecret string `yaml:"access_key_secret"` // 阿里云 AccessKey Secret（身份密钥）
	SignName        string `yaml:"sign_name"`         // 短信签名，显示在短信开头的【签名】，如"寻仙"
	TemplateCode    string `yaml:"template_code"`     // 短信模板编号，如 "SMS_123456789"
}

// Load 从指定路径读取 YAML 配置文件并解析为 Config 结构体。
//
// 参数:
//   - path: 配置文件的完整路径，如 "configs/auth.yaml"
//
// 返回值:
//   - *Config: 解析后的配置对象
//   - error: 如果文件不存在或格式错误则返回错误
func Load(path string) (*Config, error) {
	// 读取配置文件的全部内容（字节数组）
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// 将 YAML 字节数据解析为 Config 结构体
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	// 为未配置的字段设置默认值（防止用户漏填导致异常）
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8001 // 默认端口 8001
	}
	if cfg.JWT.AccessExpires == 0 {
		cfg.JWT.AccessExpires = 2 // AccessToken 默认 2 小时过期
	}
	if cfg.JWT.RefreshExpires == 0 {
		cfg.JWT.RefreshExpires = 7 // RefreshToken 默认 7 天过期
	}

	return &cfg, nil
}

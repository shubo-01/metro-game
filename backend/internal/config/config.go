package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server  ServerConfig  `yaml:"server"`
	MySQL   MySQLConfig   `yaml:"mysql"`
	Redis   RedisConfig   `yaml:"redis"`
	JWT     JWTConfig     `yaml:"jwt"`
	Wechat  WechatConfig  `yaml:"wechat"`
	Douyin  DouyinConfig  `yaml:"douyin"`
	AliSMS  AliSMSConfig  `yaml:"ali_sms"`
}

type ServerConfig struct {
	Port int    `yaml:"port"`
	Name string `yaml:"name"`
}

type MySQLConfig struct {
	DSN          string `yaml:"dsn"`
	MaxOpenConns int    `yaml:"max_open_conns"`
	MaxIdleConns int    `yaml:"max_idle_conns"`
}

type RedisConfig struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type JWTConfig struct {
	Secret          string `yaml:"secret"`
	AccessExpires   int    `yaml:"access_expires"`   // 小时
	RefreshExpires  int    `yaml:"refresh_expires"`  // 天
}

type WechatConfig struct {
	AppID     string `yaml:"app_id"`
	AppSecret string `yaml:"app_secret"`
}

type DouyinConfig struct {
	AppID     string `yaml:"app_id"`
	AppSecret string `yaml:"app_secret"`
}

type AliSMSConfig struct {
	AccessKeyID     string `yaml:"access_key_id"`
	AccessKeySecret string `yaml:"access_key_secret"`
	SignName        string `yaml:"sign_name"`
	TemplateCode    string `yaml:"template_code"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	// 默认值
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8001
	}
	if cfg.JWT.AccessExpires == 0 {
		cfg.JWT.AccessExpires = 2
	}
	if cfg.JWT.RefreshExpires == 0 {
		cfg.JWT.RefreshExpires = 7
	}
	return &cfg, nil
}

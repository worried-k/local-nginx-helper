module.exports = [
  {
    // 本地nginx服务，下载根证书专用
    domainList: ['local-nginx.xxx.io']
  },
  {
    domainList: ['xxx.demo.io'],
    pathConfig: {
      '/': 3000,
      // 反向代理到本地的某个端口
      '/test': 3001,
      // 反向代理到其它地址
      '/api': 'https://10.22.0.83'
    }
  }
]

// 在cookie中动态修改local-proxy-test的值，可以针对部分path部分域名 启用临时反向代理
// 配置的值如：https://10.22.0.83

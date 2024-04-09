const { getTopDomain } = require('../../utils/domain')

function getProxyLocalConfig(pathConfig, domain) {
  let pathConfStr = '# 根据配置生成$proxy_local_port的赋值逻辑'
  Object.keys(pathConfig).forEach((name) => {
    if (name === '/') return
    const port = pathConfig[name]

    if (!/^[0-9]+$/.test(port)) {
      // 若配置的不是端口号则取消配置
      return
    }

    pathConfStr += `
    if ($http_referer ~ ^https://${domain}${name}) {
      set $proxy_local_port ${port};
    }
`
    pathConfStr += `
    if ($uri ~ ^${name}) {
      set $proxy_local_port ${port};
    }
`
  })
  return pathConfStr
}

function getProxyCommonConfig() {
  return `# 设置清除代理缓存
  add_header Cache-Control no-cache;
  add_header Pragma no-cache;
  add_header Expires 0;
  # 设置代理http版本
  proxy_http_version 1.1;
  proxy_read_timeout 86400;
  # 透传配置header头
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Host $http_host;
  proxy_set_header Referer $http_referer;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $http_connection;
  proxy_set_header Accept $http_accept;
  # 把 HTML 页面的 gzip 压缩去掉，不然 sub_filter 无法替换内容
  proxy_set_header Accept-Encoding '';
  # 设置代理缓存
  proxy_buffer_size 1024k; #设置代理服务器（nginx）保存用户头信息的缓冲区大小
  proxy_buffers 16 1024k; #proxy_buffers缓冲区，网页平均在32k以下的设置
  proxy_busy_buffers_size 2048k; #高负荷下缓冲大小（proxy_buffers*2）
  proxy_temp_file_write_size 2048k;#设定缓存文件夹大小，大于这个值，将从upstream服务器传
`
}

function getSubFilterConfig() {
  return `
    # 替换指定字符串（若返回内容被压缩则无法替换）
    sub_filter '<head>' '<head><script src="https://thor.shuiditech.com/thor/thor.js?t=$msec"></script> <script src="/local-thor.js?t=$msec"></script> <link href="/local-thor.css?t=$msec" rel="stylesheet" />';
    # sub_filter_types *; #默认值为：text/html 此处不做更新
    sub_filter_once off;
`
}

function localProxyTest() {
  return `
    if ($cookie_local-proxy-test != "") {
      # 若当前path已被标记为本地代理模式，则直接代理到测试环境
      proxy_pass $cookie_local-proxy-test;
      # 这里的break 组织下面的if再次执行（nginx中，如果多个if都被满足，会最后执行最后面的if内的内容）
      break;
    }
`
}

module.exports = ({
  nginxDir,
  domain,
  pathConfig = {}
}) => {
  const sslCertificateName = getTopDomain(domain)
  let pathConfStr = ''
  Object.keys(pathConfig).forEach((name) => {
    if (name === '/') return
    const port = pathConfig[name]

    if (/^http/.test(port)) {
      // 若配置的值为Origin，则直接设置代理
      pathConfStr += `  location ${name} {
    proxy_pass ${port};
  }

`
      return
    }
    if (!/^[0-9]+$/.test(port)) {
      // 若配置的不是端口号则取消配置
      return
    }
    pathConfStr += `  location ${name} {
    ${getSubFilterConfig()}
    ${localProxyTest()}
`

    pathConfStr += `
    add_header Set-Cookie "dev_port=${port}; path=/; SameSite=None; Secure;";
    proxy_pass http://127.0.0.1:${port};
  }

`
  })
  return `server {
  listen 80;
  server_name ${domain};
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl;
  server_name ${domain};
  charset utf-8;

  ssl_certificate ${nginxDir}ssl/${sslCertificateName}.crt;
  ssl_certificate_key ${nginxDir}ssl/${sslCertificateName}.key;

  #access_log ${nginxDir}logs/access.log;
  error_log ${nginxDir}logs/error.log error;

  client_max_body_size 20m;

  ${getProxyCommonConfig()}

  error_page 502 /502.html;
  location = /502.html {
    root   ${nginxDir}error-pages;
  }
  location = /local-thor.css {
    root   ${nginxDir}www;
  }
  location = /local-thor.js {
    root   ${nginxDir}www;
  }
  location /root-ssl {
    root   ${nginxDir};

    autoindex on;
    autoindex_format html;
    autoindex_exact_size on;
    autoindex_localtime on;
  }

  ${pathConfStr}

  location / {
    ${getSubFilterConfig()}
    set $proxy_local_port $cookie_dev_port;
    ${getProxyLocalConfig(pathConfig, domain)}
    if ($http_accept ~ 'text/html') {
      set $proxy_local_port ${pathConfig['/'] || '$proxy_local_port'};
    }

    ${localProxyTest()}
    if ($proxy_local_port != '') {
      proxy_pass http://127.0.0.1:$proxy_local_port;
      # 通过dev_port这个cookie的值来确定将要代理到的端口
      add_header Set-Cookie "dev_port=$proxy_local_port; path=/; SameSite=None; Secure;";
    }
  }
}
`
}

// 尽量减少nginx配置文件内部if的使用，nginx配置的执行顺序和nginx处理请求的11个阶段有关，可能不是代码的书写顺序（可能会导致逻辑不好理解、混乱）

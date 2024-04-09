# local-nginx-helper

可以通过本项目快速配置本地nginx以方便于前端同学的本地开发工作

## 获取nginx配置-使用方式
* 确保本地nginx -t 可执行通过
* git clone 本项目到本地
* 进入项目目录 local-nginx-helper
* yarn
* npm run nginx

## 信任根证书
* 在配置完nginx后会提示 信任根证书“local-private-ca.crt”，根证书时效为365天，过期后再次执行 “npm run nginx” 会重置更证书，后需重新信任


## 获取最新host-使用方式
* npm run host
* 会在桌面生成3个文件（host-devFeTestApi、host-test、host-devFeOnlineApi）
* 可以将这个3个文件的内容copy到对应的host配置应用的文件中
* host-devFeTestApi：本地开发时使用的host配置，前端页面使用本地服务，其它api使用测试环境服务
* host-test：前端后端均使用测试环境服务
* host-devFeOnlineApi：前端使用本地服务，其它api使用线上服务


## 问题解决list
* 解决每次执行nginx都需要使用”sudo nginx xxx“，可以在命令行执行：sudo chmod 777 ”nginx所在的目录 或 任何无权限的目录或文件“（使每登录用户都有读和写以及执行的权限）这样就不会每次都需要sudo来执行nginx了

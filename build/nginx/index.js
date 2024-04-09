const shell = require('shelljs')
const path = require('path')
const config = require('../../config/index')
const getNginxConf = require('./getNginxConf')
const getSSLFile = require('./getSSLFile')


function pathResolve(pathDir) {
  return path.resolve(__dirname, '../../', pathDir)
}

async function getNginxDir() {
  const result = await shell.exec('nginx -t')
  const stderr = result.stderr

  if (stderr.indexOf('test is successful') > 0) {
    return stderr.match(/configuration file (.+)nginx.conf/)[1]
  }
  return stderr.match(/configuration file (.+)nginx.conf test failed/)[1]
}

async function createClearDist() {
  if (!shell.test('-d', pathResolve('./dist'))) {
    await shell.mkdir(pathResolve('./dist'))
  }
  await shell.rm('-rf', pathResolve('./dist/*'))
  await shell.mkdir(pathResolve('./dist/ssl'))
}

async function createClearLogs(nginxDir) {
  if (shell.test('-d', pathResolve(`${nginxDir}logs`))) {
    console.log('清空log目录', `${nginxDir}logs/`)
    await shell.rm('-rf', pathResolve(`${nginxDir}logs/*`))
  } else {
    console.log('创建log目录', `${nginxDir}logs`)
    await shell.mkdir(pathResolve(`${nginxDir}logs`))
  }
}

async function makeNginxFiles(nginxDir) {
  await shell.cp('-R', pathResolve('./modules/root-ssl'), pathResolve('./dist'))
  await shell.cp('-R', pathResolve('./modules/error-pages'), pathResolve('./dist'))
  await shell.cp('-R', pathResolve('./modules/www'), pathResolve('./dist'))
  await shell.mkdir(pathResolve('./dist/servers'))
  for (const item of config) {
    for (const domain of item.domainList) {
      await new shell.ShellString(getNginxConf({
        nginxDir,
        domain,
        pathConfig: item.pathConfig
      })).to(pathResolve(`./dist/servers/${domain}.conf`))
    }
  }
}

async function runScript() {
  const nginxDir = await getNginxDir()
  if (!nginxDir) return
  console.log(`当前nginx所在目录为：${ nginxDir}`)
  await createClearDist()
  console.log('完成dist目录的创建与清空')
  await makeNginxFiles(nginxDir)
  console.log('*** 生成ssl证书 ***')
  await getSSLFile()
  console.log('*** 完成ssl证书生成 ***')
  console.log('完成配置文件生成到dist目录')
  await createClearLogs(nginxDir)
  await shell.cp('-R', './dist/*', nginxDir)
  console.log('完成nginx配置文件更新覆盖')
  await shell.exec('nginx -s reload')
  console.log('完成nginx reload ：‘nginx -s reload’')
  console.log('\n***** 根证书信任 提示 *****')
  console.log(`运行并信任根证书：open ${nginxDir}root-ssl/local-private-ca.crt`)
  console.log('\n***** Node 环境运行 提示 *****')
  console.log('需在 ~/.bashrc 或 ~/.zashrc 中增加如下node变量:')
  console.log(`export NODE_EXTRA_CA_CERTS=${nginxDir}root-ssl/local-private-ca.crt`)
  console.log('\n***** Mobile 环境运行 提示 *****')
  console.log('如需安装证书，请访问：https://local-nginx.xxx.io/root-ssl/')
}
runScript()
// 解析nginx.conf地址
// copy error-pages
// copy ssl
// 构建conf文件
// 写入conf文件

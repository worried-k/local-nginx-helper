/* eslint-disable no-tabs */
const shell = require('shelljs')
const config = require('../../config/index')
const testApiDomainConfig = require('../../config/testApiDomainConfig')

const defaultHost = `# 系统默认host
127.0.0.1		localhost
255.255.255.255	broadcasthost
::1				localhost
fe80::1%lo0		localhost

#破解应用注册
127.0.0.1 xmind.net
127.0.0.1 www.xmind.net

`

const devDomainList = []
config.forEach(({ domainList }) => {
  devDomainList.push(...domainList)
})

function getSimpleTestApiConfig() {
  let affiliatedHostText = '# 根据现有nginx配置生成的host(根据主域名自动生成，可能不真实存在，根据水滴域名命名规则批量生成)\n'
  devDomainList.forEach((domain) => {
    const arr = domain.split('.') || []
    if (arr.length >= 3) {
      affiliatedHostText += `127.0.0.1 ${domain}\n`
    }
  })

  let diyHostText = '# 自定义host配置(平台未默认配置，需手动配置)\n'
  Object.keys(testApiDomainConfig).forEach((domain) => {
    if (affiliatedHostText.indexOf(` ${domain}`) > -1 || diyHostText.indexOf(` ${ domain}`) > -1) return
    const ipStr = testApiDomainConfig[domain]
    if (!ipStr) return
    diyHostText += `${ipStr} ${domain}\n`
  })

  return `${defaultHost}

${affiliatedHostText}

${diyHostText}
`
}


function getSwhDataJson({
  localH5AndTestApiSimple,
  onlineH5AndOnlineApi,
  localH5AndOnlineApi
}) {
  const baseInfo = {
    localH5AndTestApiSimple: {
      title: '本地H5-测试API-Simple',
      id: `localH5AndTestApi-${Math.random().toString()}`
    },
    onlineH5AndOnlineApi: {
      title: '线上H5-线上API',
      id: `onlineH5AndOnlineApi-${Math.random().toString()}`
    },
    localH5AndOnlineApi: {
      title: '本地H5+线上API',
      id: `localH5AndOnlineApi-${Math.random().toString()}`
    }
  }
  return JSON.stringify({
    data: {
      dict: {},
      list: {
        tree: [
          {
            title: baseInfo.localH5AndTestApiSimple.title,
            id: baseInfo.localH5AndTestApiSimple.id,
            on: false
          },
          {
            title: baseInfo.onlineH5AndOnlineApi.title,
            id: baseInfo.onlineH5AndOnlineApi.id,
            on: false
          },
          {
            title: baseInfo.localH5AndOnlineApi.title,
            id: baseInfo.localH5AndOnlineApi.id,
            on: false
          }
        ]
      },
      set: {},
      collection: {
        history: {
          meta: {
            index: 5
          },
          data: [],
          index_keys: []
        },
        hosts: {
          meta: {
            index: 5
          },
          data: [
            {
              id: baseInfo.localH5AndTestApiSimple.id,
              content: localH5AndTestApiSimple,
              _id: '1'
            },
            {
              id: baseInfo.onlineH5AndOnlineApi.id,
              content: onlineH5AndOnlineApi,
              _id: '4'
            },
            {
              id: baseInfo.localH5AndOnlineApi.id,
              content: localH5AndOnlineApi,
              _id: '5'
            }
          ],
          index_keys: []
        }
      }
    },
    version: []
  })
}

async function makeHostFile() {

  // 本地H5+测试API host配置生成
  let devFileTextTemp = ''
  let devFileText = '# 本地开发环境配置\n'
  devDomainList.forEach((name) => {
    devFileText += `127.0.0.1 ${name}\n`
    devFileTextTemp = devFileTextTemp.replace(new RegExp(`[^.]${name}[^.]`, 'ig'), ' local-test.com ')
  })

  const localH5AndTestApiText = `${defaultHost}
# thor测试环境host配置
${devFileTextTemp}

${devFileText}
  `
  new shell.ShellString(localH5AndTestApiText).to('~/Desktop/host-localH5_testApi.text')

  // 本地H5+线上API host配置生成
  const localH5AndOnlineApiText = `${defaultHost}
${devFileText}
  `
  new shell.ShellString(localH5AndOnlineApiText).to('~/Desktop/host-localH5_onlineApi.text')

  // switch-host导入文件生成
  const swhDataStr = getSwhDataJson({
    localH5AndTestApiSimple: getSimpleTestApiConfig(),
    onlineH5AndOnlineApi: defaultHost,
    localH5AndOnlineApi: localH5AndOnlineApiText
  })
  new shell.ShellString(swhDataStr).to('~/Desktop/nginx-helper-swh_data.json')
}

makeHostFile()
console.log('\n***** 已将host配置文件生成至桌面 *****')
console.log('\n***** 建议安装 SwitchHosts *****')
console.log('最新版本地址：https://github.com/oldj/SwitchHosts/releases')
console.log('\n***** SwitchHosts 快捷配置方式 *****')
console.log('设置=>导入=>选则桌面文件 nginx-helper-swh_data.json')

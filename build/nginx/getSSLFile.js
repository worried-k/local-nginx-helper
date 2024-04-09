const shell = require('shelljs')
const path = require('path')
const config = require('../../config/index')
const { getTopDomain } = require('../../utils/domain')

function pathResolve(pathDir) {
  return path.resolve(__dirname, '../../', pathDir)
}

function asyncExec(shellStr) {
  return new Promise((resolve, reject) => {
    shell.exec(shellStr, (code, stdout, stderr) => {
      if (code !== 0) {
        console.log('run error: ', shellStr, code, stdout, stderr)
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

function getDomainList() {
  const result = []
  config.forEach(({ domainList }) => {
    domainList.forEach((domain) => {
      const topDomain = getTopDomain(domain)
      if (!topDomain || result.includes(topDomain)) return
      result.push(topDomain)
    })
  })
  return result
}

module.exports = async () => {
  if (!shell.which('openssl')) {
    throw new Error('请先安装openssl => brew install openssl')
  }
  await asyncExec('openssl -v').then((str) => {
    const versionStrArr = str.match(/[0-9.]+/) || []
    const versionStr = versionStrArr[0] || ''
    const mainVersion = versionStr.split('.')[0]
    if (!mainVersion || mainVersion < 3) {
      throw new Error('请先更新openssl版本，使其>=3.0.0')
    }
  })
  const domainList = getDomainList()
  // 跟证书需要git持久化存储，不能实时动态生成。ps：根证书重新生成后需要再系统侧重新进行信任证书操作
  const rootKeyName = pathResolve('modules/root-ssl/local-private-ca.key')
  const rootCrtName = pathResolve('modules/root-ssl/local-private-ca.crt')
  const rootCsrName = pathResolve('modules/root-ssl/local-private-ca.csr')
  const extIniName = pathResolve('dist/root-ssl/ext.ini')
  let needRestRootCrt = false
  await asyncExec(`openssl x509 -in ${rootCrtName} -noout -enddate`).then((str) => {
    const endDate = str.replace('notAfter=', '')
    needRestRootCrt = new Date(endDate).getTime() < new Date().getTime()
  })
  if (needRestRootCrt) {
    await asyncExec(`openssl x509 -req -days 365 -in ${rootCsrName} -signkey ${rootKeyName} -out ${rootCrtName}`)
  }
  if (!shell.test('-f', extIniName)) {
    await asyncExec(`cp ${pathResolve('modules/root-ssl/ext.ini')} ${extIniName}`)
  }
  for (let i = 0; i < domainList.length; i += 1) {
    const name = domainList[i]
    const keyName = pathResolve(`dist/ssl/${name}.key`)
    const csrName = pathResolve(`dist/ssl/${name}.csr`)
    const crtName = pathResolve(`dist/ssl/${name}.crt`)
    await asyncExec(`echo "DNS.${i + 1} = *.${name}" >> ${extIniName}`)
    await asyncExec(`openssl genrsa -out ${keyName} 2048`)
    await asyncExec(`openssl req -new -sha256 -key ${keyName} -out ${csrName} -subj "/C=CN/ST=beijing/O=local-private-ca/CN=local-private-ca"`)
    await asyncExec(`openssl x509 -req -in ${csrName} -CA ${rootCrtName} -CAkey ${rootKeyName} -CAcreateserial -extfile ${extIniName} -out ${crtName} -days 365 -sha256`)
  }

  if (needRestRootCrt) {
    console.log('\n***** 警告 *****\n')
    console.log('根证书已跟新，请在操作系统中删除旧证书，并重新信任新根证书 local-private-ca.crt')
    console.log('\n***** 警告 *****\n')
  }
}
// 生成根证书私钥（生成后不在需要重新生成）
// openssl genrsa -out local-private-ca.key 2048
// 生成根证书请求文件（生成后不在需要重新生成）
// openssl req -new -key local-private-ca.key -out local-private-ca.csr -subj "/C=CN/ST=beijing/O=local-private-ca/CN=local-private-ca"
// 生成根证书（有效期1年，过期后需要重新生成）
// openssl x509 -req -days 365 -in ./modules/root-ssl/local-private-ca.csr -signkey ./modules/root-ssl/local-private-ca.key -out ./modules/root-ssl/local-private-ca.crt

// 增加node根证书变量
// export NODE_EXTRA_CA_CERTS=/Users/kp/homebrew/etc/nginx/root-ssl/local-private-ca.crt

function getTopDomain(domain) {
  const arr = domain.split('.')
  if (arr.length < 2) return
  if (arr.length === 2) return domain
  arr.shift()
  return arr.join('.')
}

module.exports = {
  getTopDomain
}

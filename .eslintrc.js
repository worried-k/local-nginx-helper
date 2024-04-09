module.exports = {
  root: true,
  extends: [
    '@belllabs/drips-legacy'
  ],
  globals: {},
  settings: {},
  rules: {
    // 自定义配置
    // 字符串变量引用次数
    'sonarjs/no-duplicate-string': 0,
    'no-console': 0,
    // 强制要求函数必须有返回值：关闭
    'consistent-return': 0,
    'vue/no-v-html': 0,
    // 强制数组/对象进行解构赋值：关闭
    'prefer-destructuring': ['error', {
      array: false,
      object: false
    }],
    'global-require': 0,
    'no-new': 0,
    'func-names': 0,
    // 下划线变量
    'no-underscore-dangle': 0,
    'no-restricted-syntax': 0,
    'no-await-in-loop': 0
  }
}

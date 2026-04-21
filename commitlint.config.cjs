// MindLink 要求 commit message 以 [PN] 前缀开头（N = phase），
// 兼顾 conventional commits 的 type: 前缀亦可。
module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // 兼容两种格式：
      //   [P2] api: add customers CRUD
      //   feat(api): add customers CRUD
      headerPattern: /^(?:\[P(\d)\]\s+)?([a-z]+)(?:\(([^)]+)\))?:\s+(.+)$/,
      headerCorrespondence: ['phase', 'type', 'scope', 'subject'],
    },
  },
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert',
       'api', 'web', 'mp', 'shared', 'ui', 'db', 'infra'],
    ],
    'subject-min-length': [2, 'always', 4],
  },
};

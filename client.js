/**
 * Browser half of the GitHub workbench.
 *
 * Core responsibility: register one right-Sidebar tab type (`github`) plus its
 * body and one conversation-header trigger, and render the current session
 * repository's pull requests, issues, and discussions inside that tab.
 * Contracts: the Host half serves `/api/github-panel/*`; slot props supply the
 * session id, the `useSessions` selector hook, and the namespace translate.
 * Constraints: no Harness Client package is imported (React comes from the
 * browser module table), no DOM writes outside the plugin's own elements, and
 * every color comes from a `--dsw-*` theme token or a semantic state color.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-github-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    /** This plugin's client module id; also the tab type id and body seat key. */
    const ID = '@local/dsh-github-panel'
    /** The page kind the right Sidebar opens by name. */
    const KIND = 'github'
    /** Locale namespace of every visible string. */
    const NS = 'githubPanel'

    /** The three item families the workbench browses. */
    const KINDS = [
      { id: 'pr', labelKey: 'tab.pr', emptyKey: 'list.empty.pr' },
      { id: 'issue', labelKey: 'tab.issue', emptyKey: 'list.empty.issue' },
      { id: 'discussion', labelKey: 'tab.discussion', emptyKey: 'list.empty.discussion' },
    ]

    /** One list state filter per item family that supports closed items. */
    const STATE_FILTERS = [
      { id: 'open', labelKey: 'state.open' },
      { id: 'closed', labelKey: 'state.closed' },
      { id: 'all', labelKey: 'state.all' },
    ]

    const dict = {
      zh: {
        'type.label': 'GitHub',
        'guide.title': 'GitHub 工作台',
        'guide.description': '查看当前会话仓库的 PR、Issue 与讨论',
        'header.open': '打开 GitHub 工作台',

        'tab.pr': 'Pull requests',
        'tab.issue': 'Issues',
        'tab.discussion': 'Discussions',

        'state.open': '开放中',
        'state.closed': '已关闭',
        'state.all': '全部',
        'state.draft': '草稿',
        'state.merged': '已合并',
        'state.unknown': '未知状态',

        'repo.loading': '正在定位仓库…',
        'repo.noWorkspace': '当前会话还没有工作目录，无法定位仓库。',
        'repo.error': '无法定位仓库',
        'repo.retry': '重试',
        'repo.refresh': '刷新',

        'list.loading': '正在加载…',
        'list.error': '加载失败',
        'list.retry': '重试',
        'list.empty.pr': '没有符合筛选条件的 Pull Request',
        'list.empty.issue': '没有符合筛选条件的 Issue',
        'list.empty.discussion': '没有 Discussion',
        'list.viewer': '当前账号',

        'detail.back': '返回列表',
        'detail.open': '在 GitHub 打开',
        'detail.body': '描述',
        'detail.checks': '检查',
        'detail.reviewers': '审阅人',
        'detail.files': '变更文件',
        'detail.commits': '提交',
        'detail.comments': '评论',
        'detail.noBody': '没有填写描述。',
        'detail.noChecks': '没有检查项。',
        'detail.noReviewers': '还没有审阅人。',
        'detail.noFiles': '没有文件变更。',
        'detail.noCommits': '没有提交记录。',
        'detail.noComments': '还没有评论。',
        'detail.changedFiles': '文件',
        'detail.additions': '新增',
        'detail.deletions': '删除',
        'detail.branch': '分支',
        'detail.author': '作者',
        'detail.updated': '更新于',
        'detail.created': '创建于',
        'detail.answer': '已回答',
        'detail.unanswered': '未回答',

        'review.approved': '已批准',
        'review.changesRequested': '请求修改',
        'review.commented': '已评论',
        'review.pending': '待审阅',
        'review.dismissed': '已驳回',
        'review.requested': '等待审阅',
        'review.summary': '审阅',
        'review.none': '未审阅',

        'merge.summary': '合并',
        'merge.clean': '可合并',
        'merge.blocked': '被阻止',
        'merge.behind': '落后于目标分支',
        'merge.unstable': '检查未通过',
        'merge.dirty': '存在冲突',
        'merge.draft': '草稿',
        'merge.unknown': '状态未知',

        'checks.summary': '检查',
        'checks.passed': '全部通过',
        'checks.failed': '有失败',
        'checks.running': '进行中',

        'filter.state': '按状态筛选',
        'detail.conflicts': '存在冲突',
        'detail.truncatedPrefix': '仅显示前 ',
        'detail.truncatedSuffix': ' 项，完整内容请在 GitHub 查看。',
        'detail.updatedAtLabel': '更新于',
        'md.copy': '复制',
        'md.copied': '已复制',
        'md.mermaidUnsupported': '此图暂时无法在面板内预览，可在 GitHub 上查看原始图表。',

        'view.summary': 'Summary',
        'view.changes': 'Changes',
        'activity.title': 'Activity',
        'activity.opened.pr': '创建了此 Pull Request',
        'activity.opened.issue': '创建了此 Issue',
        'activity.opened.discussion': '创建了此讨论',
        'activity.resolved': '已解决',
        'detail.noActivity': '还没有活动。',
        'side.reviewers': '审阅人',
        'side.checks': '检查',
        'side.comments': '评论',
        'side.files': '变更文件',
        'side.commits': '提交',
        'side.labels': '标签',
        'side.assignees': '指派给',
        'side.status': '状态',
        'diff.loading': '正在加载变更…',
        'diff.error': '无法加载变更',
        'diff.empty': '没有文件变更。',
'diff.unified': '统一',
'diff.split': '双列',
'diff.viewMode': 'Diff 视图',
'diff.comments': '行内评论',
'diff.resolved': '已解决',
'diff.unresolved': '未解决',
'diff.showResolved': '展开已解决的评论',
        'diff.expandAll': '全部展开',
        'diff.collapseAll': '全部收起',
        'activity.scopeAria': '活动范围',
        'activity.scope.all': '全部',
        'activity.scope.unresolved': '未解决',
        'activity.scope.mine': '我的',
        'activity.filter': '筛选活动',
        'activity.filter.types': '类型',
        'activity.filter.authors': '作者',
        'activity.filter.allAuthors': '全部作者',
        'activity.filter.reset': '重置筛选',
        'activity.sort': '排序',
        'activity.sort.newest': '最新优先',
        'activity.sort.oldest': '最早优先',
        'activity.type.opened': '打开',
        'activity.type.commit': '提交',
        'activity.type.comment': '评论',
        'activity.type.review': '审阅',
        'activity.type.thread': '代码线程',
        'activity.noFiltered': '当前筛选下没有活动。',
        'activity.noUnresolved': '没有未解决的线程。',
        'activity.noMine': '没有属于你的动态。',
'side.collapse': '收起',
'side.expand': '展开',
'actions.quote': '引用到输入框',
'actions.quoted': '已引用',
'actions.open': '在 GitHub 打开',
'actions.copy': '复制',
'actions.copied': '已复制',
'actions.more': '更多操作',
'actions.copyFailed': '无法访问剪贴板',
'review.action': '提交审阅',
'review.approve': '批准',
'review.requestChanges': '请求修改',
'review.comment': '评论',
'review.submit': '提交审阅',
'review.submitting': '正在提交…',
'review.cancel': '取消',
'review.placeholder': '写下审阅意见（请求修改时必填）',
'review.success': '审阅已提交',
'review.requiresBody': '请求修改需要填写审阅意见。',
'review.permission': '当前 GitHub 账号没有提交审阅的权限。',
'review.state.open': '打开',
'review.state.merged': '已合并',
'review.state.closed': '已关闭',
        'diff.noPatch': '该文件没有可显示的文本差异（二进制或过大）。',
        'diff.truncatedFiles': '文件较多，仅显示前 100 个。',
        'diff.truncatedPrefix': '仅显示前 ',

        'check.success': '通过',
        'check.failure': '失败',
        'check.pending': '进行中',
        'check.neutral': '中立',
        'check.skipped': '跳过',

        'time.now': '刚刚',
        'time.minute': '分钟前',
        'time.hour': '小时前',
        'time.day': '天前',
        'time.month': '个月前',

        'error.gh-missing': '未找到 GitHub CLI，请先在宿主机安装 gh。',
        'error.gh-unauthenticated': 'GitHub CLI 未登录，请先运行 gh auth login。',
        'error.rate-limited': 'GitHub 接口限流，请稍后再试。',
        'error.not-found': '仓库或条目不存在，或当前账号无权访问。',
        'error.invalid-repo': '仓库地址无效。',
        'error.discussions-unavailable': '该仓库未启用 Discussions。',
        'error.no-remote': '当前工作目录的 Git 仓库没有远程地址，无法定位 GitHub 仓库。',
        'error.not-github': '当前远程不是 github.com 地址，本插件只支持 GitHub。',
        'error.missing-cwd': '当前会话的工作目录已不存在。',
        'error.invalid-cwd': '当前会话没有可用的工作目录。',
        'error.timeout': 'GitHub 请求超时，请稍后重试。',
        'error.graphql': 'GitHub 拒绝了这次查询，请稍后重试。',
        'error.bad-json': 'GitHub 返回了无法读取的响应。',
        'error.invalid-kind': '不支持的内容类型。',
        'error.invalid-item': '内容编号无效。',
        'error.unauthorized': '请求未通过 DSH 的页面鉴权，请刷新页面后重试。',
        'error.host-unavailable': '插件后端未就绪，请刷新页面或在插件管理中确认已启用。',
        'error.failed': 'GitHub 请求失败',
      },
      en: {
        'type.label': 'GitHub',
        'guide.title': 'GitHub workbench',
        'guide.description': 'Pull requests, issues, and discussions of this session repository',
        'header.open': 'Open the GitHub workbench',

        'tab.pr': 'Pull requests',
        'tab.issue': 'Issues',
        'tab.discussion': 'Discussions',

        'state.open': 'Open',
        'state.closed': 'Closed',
        'state.all': 'All',
        'state.draft': 'Draft',
        'state.merged': 'Merged',
        'state.unknown': 'Unknown',

        'repo.loading': 'Resolving repository…',
        'repo.noWorkspace': 'This session has no working directory yet.',
        'repo.error': 'Could not resolve the repository',
        'repo.retry': 'Retry',
        'repo.refresh': 'Refresh',

        'list.loading': 'Loading…',
        'list.error': 'Could not load',
        'list.retry': 'Retry',
        'list.empty.pr': 'No pull requests match this filter',
        'list.empty.issue': 'No issues match this filter',
        'list.empty.discussion': 'No discussions',
        'list.viewer': 'Signed in as',

        'detail.back': 'Back to list',
        'detail.open': 'Open on GitHub',
        'detail.body': 'Description',
        'detail.checks': 'Checks',
        'detail.reviewers': 'Reviewers',
        'detail.files': 'Files changed',
        'detail.commits': 'Commits',
        'detail.comments': 'Comments',
        'detail.noBody': 'No description provided.',
        'detail.noChecks': 'No checks.',
        'detail.noReviewers': 'No reviewers yet.',
        'detail.noFiles': 'No file changes.',
        'detail.noCommits': 'No commits.',
        'detail.noComments': 'No comments yet.',
        'detail.changedFiles': 'files',
        'detail.additions': 'additions',
        'detail.deletions': 'deletions',
        'detail.branch': 'Branch',
        'detail.author': 'Author',
        'detail.updated': 'Updated',
        'detail.created': 'Created',
        'detail.answer': 'Answered',
        'detail.unanswered': 'Unanswered',

        'review.approved': 'Approved',
        'review.changesRequested': 'Changes requested',
        'review.commented': 'Commented',
        'review.pending': 'Pending',
        'review.dismissed': 'Dismissed',
        'review.requested': 'Review requested',
        'review.summary': 'Review',
        'review.none': 'Not reviewed',

        'merge.summary': 'Merge',
        'merge.clean': 'Mergeable',
        'merge.blocked': 'Blocked',
        'merge.behind': 'Behind base',
        'merge.unstable': 'Checks failing',
        'merge.dirty': 'Conflicts',
        'merge.draft': 'Draft',
        'merge.unknown': 'Unknown',

        'checks.summary': 'Checks',
        'checks.passed': 'All passed',
        'checks.failed': 'Failures',
        'checks.running': 'Running',

        'filter.state': 'Filter by state',
        'detail.conflicts': 'Merge conflicts',
        'detail.truncatedPrefix': 'Showing the first ',
        'detail.truncatedSuffix': ' items only. Open GitHub for the complete list.',
        'detail.updatedAtLabel': 'Updated',
        'md.copy': 'Copy',
        'md.copied': 'Copied',
        'md.mermaidUnsupported': 'This diagram cannot be previewed here; open it on GitHub for the rendered chart.',

        'view.summary': 'Summary',
        'view.changes': 'Changes',
        'activity.title': 'Activity',
        'activity.opened.pr': 'opened this pull request',
        'activity.opened.issue': 'opened this issue',
        'activity.opened.discussion': 'opened this discussion',
        'activity.resolved': 'Resolved',
        'detail.noActivity': 'No activity yet.',
        'side.reviewers': 'Reviewers',
        'side.checks': 'Checks',
        'side.comments': 'Comments',
        'side.files': 'Files changed',
        'side.commits': 'Commits',
        'side.labels': 'Labels',
        'side.assignees': 'Assignees',
        'side.status': 'Status',
        'diff.loading': 'Loading changes…',
        'diff.error': 'Could not load changes',
        'diff.empty': 'No file changes.',
'diff.unified': 'Unified',
'diff.split': 'Split',
'diff.viewMode': 'Diff view',
'diff.comments': 'Inline comments',
'diff.resolved': 'Resolved',
'diff.unresolved': 'Unresolved',
'diff.showResolved': 'Show resolved comments',
        'diff.expandAll': 'Expand all',
        'diff.collapseAll': 'Collapse all',
        'activity.scopeAria': 'Activity scope',
        'activity.scope.all': 'All',
        'activity.scope.unresolved': 'Unresolved',
        'activity.scope.mine': 'Mine',
        'activity.filter': 'Filter activity',
        'activity.filter.types': 'Type',
        'activity.filter.authors': 'Author',
        'activity.filter.allAuthors': 'All authors',
        'activity.filter.reset': 'Reset filters',
        'activity.sort': 'Sort activity',
        'activity.sort.newest': 'Newest first',
        'activity.sort.oldest': 'Oldest first',
        'activity.type.opened': 'Opened',
        'activity.type.commit': 'Commits',
        'activity.type.comment': 'Comments',
        'activity.type.review': 'Reviews',
        'activity.type.thread': 'Review threads',
        'activity.noFiltered': 'No activity matches this filter.',
        'activity.noUnresolved': 'No unresolved threads.',
        'activity.noMine': 'No activity from you.',
'side.collapse': 'Collapse',
'side.expand': 'Expand',
'actions.quote': 'Quote in composer',
'actions.quoted': 'Quoted',
'actions.open': 'Open on GitHub',
'actions.copy': 'Copy',
'actions.copied': 'Copied',
'actions.more': 'More actions',
'actions.copyFailed': 'Clipboard is unavailable',
'review.action': 'Submit review',
'review.approve': 'Approve',
'review.requestChanges': 'Request changes',
'review.comment': 'Comment',
'review.submit': 'Submit review',
'review.submitting': 'Submitting…',
'review.cancel': 'Cancel',
'review.placeholder': 'Write a review comment (required when requesting changes)',
'review.success': 'Review submitted',
'review.requiresBody': 'Requesting changes requires a review comment.',
'review.permission': 'The signed-in GitHub account cannot submit a review.',
'review.state.open': 'Open',
'review.state.merged': 'Merged',
'review.state.closed': 'Closed',
        'diff.noPatch': 'No textual diff is available for this file (binary or too large).',
        'diff.truncatedFiles': 'Showing the first 100 files.',
        'diff.truncatedPrefix': 'Showing the first ',

        'check.success': 'Passed',
        'check.failure': 'Failed',
        'check.pending': 'Running',
        'check.neutral': 'Neutral',
        'check.skipped': 'Skipped',

        'time.now': 'just now',
        'time.minute': 'm ago',
        'time.hour': 'h ago',
        'time.day': 'd ago',
        'time.month': 'mo ago',

        'error.gh-missing': 'GitHub CLI is not installed on the host. Install gh first.',
        'error.gh-unauthenticated': 'GitHub CLI is not logged in. Run gh auth login.',
        'error.rate-limited': 'GitHub rate limit reached. Try again later.',
        'error.not-found': 'Repository or item not found, or the token cannot read it.',
        'error.invalid-repo': 'Invalid repository.',
        'error.discussions-unavailable': 'Discussions are not enabled for this repository.',
        'error.no-remote': 'This checkout has no Git remote, so there is no GitHub repository to show.',
        'error.not-github': 'This remote is not github.com; only GitHub repositories are supported.',
        'error.missing-cwd': 'The session working directory no longer exists.',
        'error.invalid-cwd': 'This session has no usable working directory.',
        'error.timeout': 'GitHub timed out. Try again in a moment.',
        'error.graphql': 'GitHub rejected the query. Try again later.',
        'error.bad-json': 'GitHub returned an unreadable response.',
        'error.invalid-kind': 'Unsupported item kind.',
        'error.invalid-item': 'Invalid item number.',
        'error.unauthorized': 'The request did not pass DSH page authorization. Reload the page and retry.',
        'error.host-unavailable': 'The plugin backend is not ready. Reload the page or check that the plugin is enabled.',
        'error.failed': 'GitHub request failed',
      },
    }

    /** Palette used for deterministic initial avatars; white labels need dark fills. */
    const AVATAR_COLORS = ['#1d4ed8', '#4f46e5', '#7c3aed', '#be185d', '#b45309', '#0f766e', '#0e7490', '#334155']

    // ---------------------------------------------------------------- icons

    /** Shared SVG wrapper: 16px grid, currentColor, decorative. */
    function Glyph(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: props.size || 16,
          height: props.size || 16,
          fill: props.fill || 'none',
          stroke: props.fill ? 'none' : 'currentColor',
          strokeWidth: props.fill ? undefined : 1.4,
          strokeLinecap: props.fill ? undefined : 'round',
          strokeLinejoin: props.fill ? undefined : 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          className: props.className,
        },
        props.children,
      )
    }

    /** GitHub mark, used by the conversation header trigger. */
    function GitHubGlyph(props) {
      return h(Glyph, { size: props.size, fill: 'currentColor', className: props.className }, h('path', {
        d: 'M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z',
      }))
    }

    /** Pull-request glyph: two nodes joined by a branch. */
    function IconPullRequest(props) {
      return h(Glyph, { size: props.size }, h('circle', { cx: 4, cy: 3.2, r: 1.6 }), h('circle', { cx: 4, cy: 12.8, r: 1.6 }), h('path', { d: 'M4 4.8v6.4' }), h('circle', { cx: 12, cy: 12.8, r: 1.6 }), h('path', { d: 'M12 11.2V6.4a2 2 0 0 0-2-2H7.2' }))
    }

    /** Issue glyph: a circle with an exclamation mark. */
    function IconIssue(props) {
      return h(Glyph, { size: props.size }, h('circle', { cx: 8, cy: 8, r: 6 }), h('path', { d: 'M8 5v3.6' }), h('path', { d: 'M8 11.2h.01' }))
    }

    /** Discussion glyph: a speech bubble with two lines. */
    function IconDiscussion(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M2.8 3.4h10.4a1.2 1.2 0 0 1 1.2 1.2v6a1.2 1.2 0 0 1-1.2 1.2H7.4L4.6 14v-2.2H2.8a1.2 1.2 0 0 1-1.2-1.2v-6a1.2 1.2 0 0 1 1.2-1.2Z' }), h('path', { d: 'M4.8 6.6h6.4' }), h('path', { d: 'M4.8 9h4.2' }))
    }

    /** Refresh glyph: a circular arrow. */
    function IconRefresh(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M13.2 8a5.2 5.2 0 1 1-1.7-3.85' }), h('path', { d: 'M13.4 2.6v3.2h-3.2' }))
    }

    /** Back glyph: a left chevron. */
    function IconBack(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M9.8 3.4 4.8 8l5 4.6' }))
    }

    /** External-link glyph: a box with an arrow leaving it. */
    function IconExternal(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M6.4 3.2h6.4v6.4' }), h('path', { d: 'M12.8 3.2 6.8 9.2' }), h('path', { d: 'M12.4 9.6v2.8a1.2 1.2 0 0 1-1.2 1.2H3.6a1.2 1.2 0 0 1-1.2-1.2V4.8a1.2 1.2 0 0 1 1.2-1.2h2.8' }))
    }

    /** Comment glyph: a small speech bubble. */
    function IconComment(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M2.6 3.8h10.8v6.4H7.2L4.2 13v-2.8H2.6Z' }))
    }

    /** Empty-state glyph: a rounded panel with a line. */
    function IconEmpty(props) {
      return h(Glyph, { size: props.size }, h('rect', { x: 2.2, y: 3.2, width: 11.6, height: 9.6, rx: 1.6 }), h('path', { d: 'M5 7h6' }), h('path', { d: 'M5 9.6h3.4' }))
    }

    // ---------------------------------------------------------------- syntax highlighting

    /** Tokenizer rules for the built-in highlighter, one entry per normalized language. */
    const CODE_RULES = {
      ts: {
        line: '//',
        block: true,
        quote: ['"', "'", '`'],
        keywords: ['abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'satisfies', 'set', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'yield'],
      },
      js: {
        line: '//',
        block: true,
        quote: ['"', "'", '`'],
        keywords: ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'yield'],
      },
      json: { line: null, block: false, quote: ['"'], keywords: ['true', 'false', 'null'] },
      bash: { line: '#', block: false, quote: ['"', "'"], keywords: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'in', 'return', 'export', 'local', 'echo', 'set', 'source', 'read', 'cd'] },
      yaml: { line: '#', block: false, quote: ['"', "'"], keywords: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'] },
      python: { line: '#', block: false, quote: ['"', "'"], keywords: ['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'] },
      css: { line: null, block: true, quote: ['"', "'"], keywords: ['important', 'media', 'import', 'from', 'and', 'not'] },
      html: { line: null, block: true, quote: ['"', "'"], keywords: [] },
      md: { line: null, block: false, quote: [], keywords: [] },
      text: { line: null, block: false, quote: [], keywords: [] },
    }

    /** Language aliases GitHub fences use. */
    const LANGUAGE_ALIASES = {
      typescript: 'ts',
      tsx: 'ts',
      javascript: 'js',
      jsx: 'js',
      mjs: 'js',
      cjs: 'js',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
      powershell: 'bash',
      ps1: 'bash',
      yml: 'yaml',
      py: 'python',
      jsonc: 'json',
      markup: 'html',
      xml: 'html',
      svg: 'html',
      markdown: 'md',
      mermaid: 'text',
      txt: 'text',
      plaintext: 'text',
      console: 'text',
      diff: 'text',
      patch: 'text',
    }

    /**
     * Normalize a fenced-code language tag.
     * @param {string} raw - the fence info string.
     * @returns {string} a key of {@link CODE_RULES}.
     */
    function normalizeLanguage(raw) {
      const value = String(raw || '').trim().toLowerCase().split(/\s+/)[0]
      if (!value) return 'text'
      const alias = LANGUAGE_ALIASES[value]
      const normalized = alias || value
      return CODE_RULES[normalized] ? normalized : 'text'
    }

    /**
     * Split source code into typed tokens for the built-in highlighter.
     * @param {string} code - source text.
     * @param {string} lang - normalized language.
     * @returns {Array<{ type: string, value: string }>} tokens; adjacent plain text is merged.
     */
    function highlightCode(code, lang) {
      const rules = CODE_RULES[lang] || CODE_RULES.text
      const keywords = new Set(rules.keywords)
      const tokens = []
      const push = (type, value) => {
        if (!value) return
        const last = tokens[tokens.length - 1]
        if (type === 'plain' && last && last.type === 'plain') {
          last.value += value
          return
        }
        tokens.push({ type, value })
      }
      let index = 0
      while (index < code.length) {
        if (rules.line && code.startsWith(rules.line, index)) {
          const end = code.indexOf('\n', index)
          const stop = end === -1 ? code.length : end
          push('comment', code.slice(index, stop))
          index = stop
          continue
        }
        if (rules.block && code.startsWith('/*', index)) {
          const end = code.indexOf('*/', index + 2)
          const stop = end === -1 ? code.length : end + 2
          push('comment', code.slice(index, stop))
          index = stop
          continue
        }
        const ch = code[index]
        if (rules.quote.includes(ch)) {
          let cursor = index + 1
          while (cursor < code.length) {
            if (code[cursor] === '\\') {
              cursor += 2
              continue
            }
            if (code[cursor] === ch) {
              cursor += 1
              break
            }
            if (ch !== '`' && code[cursor] === '\n') break
            cursor += 1
          }
          push('string', code.slice(index, cursor))
          index = cursor
          continue
        }
        if (ch >= '0' && ch <= '9' && !/[\w$]/.test(code[index - 1] || '')) {
          let cursor = index + 1
          while (cursor < code.length && /[0-9a-fA-FxX._]/.test(code[cursor])) cursor += 1
          push('number', code.slice(index, cursor))
          index = cursor
          continue
        }
        if (/[A-Za-z_$]/.test(ch)) {
          let cursor = index + 1
          while (cursor < code.length && /[\w$]/.test(code[cursor])) cursor += 1
          const word = code.slice(index, cursor)
          if (keywords.has(word)) push('keyword', word)
          else if (code[cursor] === '(') push('function', word)
          else push('plain', word)
          index = cursor
          continue
        }
        push('plain', ch)
        index += 1
      }
      return tokens
    }

    /** Fenced code block with a language chip, copy control, and token colors. */
    function CodeBlock(props) {
      const t = props.t || fallbackTranslate
      const lang = normalizeLanguage(props.lang)
      const [copied, setCopied] = useState(false)
      const timerRef = useRef(null)
      const tokens = useMemo(() => highlightCode(props.code, lang), [props.code, lang])
      useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }, [])
      const copy = () => {
        try {
          const clipboard = navigator.clipboard
          if (!clipboard || typeof clipboard.writeText !== 'function') return
          clipboard.writeText(props.code).then(() => {
            setCopied(true)
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => setCopied(false), 1600)
          }).catch(() => {})
        } catch (error) {
          void error
        }
      }
      const rawLang = String(props.lang || '').trim().toLowerCase().split(/\s+/)[0]
      const isDiff = rawLang === 'diff' || rawLang === 'patch'
      const diffLines = isDiff ? props.code.split('\n') : null
      return h(
        'div',
        { className: 'ghp-code' },
        h(
          'div',
          { className: 'ghp-code-head' },
          h('span', { className: 'ghp-code-lang' }, isDiff ? rawLang : rawLang || (lang === 'text' ? 'text' : lang)),
          h('button', { type: 'button', className: 'ghp-code-copy', onClick: copy, 'aria-label': copied ? t('md.copied') : t('md.copy') }, copied ? t('md.copied') : t('md.copy')),
        ),
        h(
          'pre',
          { className: 'ghp-code-pre' },
          h(
            'code',
            null,
            isDiff
              ? diffLines.map((line, index) =>
                  h(
                    'span',
                    { key: index, className: 'ghp-diff-' + (line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : 'ctx') },
                    line + (index < diffLines.length - 1 ? '\n' : ''),
                  ),
                )
              : tokens.map((token, index) => (token.type === 'plain' ? token.value : h('span', { key: index, className: 'ghp-tok-' + token.type }, token.value))),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- mermaid

    /** Flow directions the built-in renderer lays out. */
    const MERMAID_DIRECTIONS = new Set(['TD', 'TB', 'BT', 'LR', 'RL'])

    /** Lines the tiny renderer deliberately ignores instead of failing on them. */
    const MERMAID_IGNORED = /^(?:%%|style\s|classDef\s|class\s|linkStyle\s|click\s|end\b|direction\s|accTitle|accDescr)/i

    /** Node-shape decorations stripped from a label: [[ ]], ([ ]]), (( )), [ ], ( ), { }, > ]; the shape is required so arrows stay intact, and ids cannot start with "-" so "-->" is never read as a node. */
    const MERMAID_NODE = /([A-Za-z0-9_][A-Za-z0-9_.-]*)\s*(?:\[\[([^\]]*)\]\]|\[\(([^)]*)\)\]|\(\(([^)]*)\)\)|\(\[([^\]]*)\]\)|\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|>([^\]]*)\])/g

    /**
     * Parse the flowchart subset of mermaid: node declarations, directed edges,
     * edge labels, and one level of subgraph grouping. Styling directives are
     * ignored; unsupported syntax makes the whole diagram fall back to source.
     * @param {string} source - fenced mermaid source.
     * @returns {{ direction: string, nodes: Array<{ id: string, label: string, subgraph: string | null }>, edges: Array<{ from: string, to: string, label: string, dashed: boolean }>, subgraphs: Array<{ id: string, label: string, nodeIds: string[] }> } | null}
     *   the diagram model, or null when it is not a supported flowchart.
     */
    function parseMermaid(source) {
      const lines = String(source || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      if (lines.length === 0) return null
      const head = /^(?:flowchart|graph)\s+([A-Za-z]{2})\s*$/i.exec(lines[0])
      if (!head || !MERMAID_DIRECTIONS.has(head[1].toUpperCase())) return null
      const direction = head[1].toUpperCase()
      const nodes = new Map()
      const edges = []
      const subgraphs = []
      const stack = []
      const unquote = (value) => {
        const trimmed = String(value || '').trim()
        const quoted = /^"(.*)"$/.exec(trimmed) || /^'(.*)'$/.exec(trimmed)
        return quoted ? quoted[1] : trimmed
      }
      const nodeById = (id) => {
        if (!nodes.has(id)) {
          const group = stack[stack.length - 1]
          nodes.set(id, { id, label: id, subgraph: group ? group.id : null })
          if (group && !group.nodeIds.includes(id)) group.nodeIds.push(id)
        }
        return nodes.get(id)
      }
      for (const rawLine of lines.slice(1)) {
        const subgraph = /^subgraph\b\s*([A-Za-z0-9_.-]+)?\s*(?:\[\s*([^\]]*?)\s*\])?\s*$/i.exec(rawLine)
        if (subgraph) {
          const label = unquote(subgraph[2] !== undefined ? subgraph[2] : subgraph[1] || '')
          const group = { id: subgraph[1] || 'subgraph' + subgraphs.length, label: label || 'subgraph', nodeIds: [] }
          subgraphs.push(group)
          // One grouping level is rendered; a nested subgraph joins its parent.
          if (stack.length === 0) stack.push(group)
          else stack[0] = group
          continue
        }
        if (/^end\b/i.test(rawLine)) {
          stack.length = 0
          continue
        }
        if (MERMAID_IGNORED.test(rawLine)) continue
        const line = rawLine.replace(/;+$/, '').trim()
        if (!line) continue
        // Register node labels first, then replace each declaration with its bare id.
        const bare = line.replace(MERMAID_NODE, (match, id, doubleBracket, bracketParen, doubleParen, parenBracket, bracket, paren, brace, angled) => {
          const label = [doubleBracket, bracketParen, doubleParen, parenBracket, bracket, paren, brace, angled].find((value) => typeof value === 'string')
          const node = nodeById(id)
          if (label !== undefined && label.trim() !== '') node.label = unquote(label).replace(/<br\s*\/?>/gi, '\n')
          return id
        })
        // One statement is a node chain: `A --> B --> C`, optionally with labels
        // (`A -->|label| B`) or the inline label form (`A -- label --> B`).
        const chain = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)([\s\S]*)$/.exec(bare)
        if (!chain) return null
        const chainIds = [chain[1]]
        let rest = chain[2]
        while (rest.trim().length > 0) {
          const inlineArrow = /^\s*--\s*([^-|>]+?)\s*-->\s*/.exec(rest)
          const arrow = inlineArrow || /^\s*(-->|---|-\.->|==>)\s*(?:\|([^|]*)\|)?\s*/.exec(rest)
          if (!arrow) return null
          const next = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)/.exec(rest.slice(arrow[0].length))
          if (!next) return null
          const from = chainIds[chainIds.length - 1]
          const to = next[1]
          const label = inlineArrow ? unquote(inlineArrow[1]) : unquote(arrow[2] || '')
          edges.push({ from, to, label, dashed: Boolean(arrow[1] === '-.->') })
          nodeById(from)
          nodeById(to)
          chainIds.push(to)
          rest = rest.slice(arrow[0].length + next[0].length)
        }
      }
      // Edges may point at a subgraph id; those belong to the group frame, not to a
      // synthetic node, so drop the placeholder nodes and keep the edges for the
      // renderer to resolve against the group boxes.
      const groupIds = new Set(subgraphs.map((group) => group.id))
      const realNodes = [...nodes.values()].filter((node) => !(groupIds.has(node.id) && node.label === node.id))
      const realNodeIds = new Set(realNodes.map((node) => node.id))
      for (const group of subgraphs) group.nodeIds = group.nodeIds.filter((id) => realNodeIds.has(id))
      if (realNodes.length === 0 || realNodes.length > 40 || edges.length > 60) return null
      return { direction, nodes: realNodes, edges, subgraphs }
    }

    /** Approximate pixel width of one label line (CJK glyphs are wider). */
    function mermaidTextWidth(text) {
      let width = 0
      for (const ch of String(text)) width += ch.charCodeAt(0) > 0x2e80 ? 12 : 7
      return width
    }

    /** Wrap a node label into at most four lines that fit the node width. */
    function mermaidWrap(label, maxWidth) {
      const lines = []
      // `<br/>` in a mermaid label is an explicit line break.
      for (const segment of String(label || ' ').split('\n')) {
        let current = ''
        let width = 0
        for (const ch of segment) {
          const charWidth = ch.charCodeAt(0) > 0x2e80 ? 12 : 7
          if (current && width + charWidth > maxWidth) {
            lines.push(current)
            current = ''
            width = 0
          }
          current += ch
          width += charWidth
        }
        if (current) lines.push(current)
      }
      return lines.length === 0 ? [' '] : lines.slice(0, 4)
    }

    /** Intersection of a centre-to-centre ray with a node rectangle. */
    function mermaidClip(cx, cy, width, height, dx, dy) {
      if (dx === 0 && dy === 0) return { x: cx, y: cy }
      const scaleX = dx === 0 ? Infinity : width / 2 / Math.abs(dx)
      const scaleY = dy === 0 ? Infinity : height / 2 / Math.abs(dy)
      const scale = Math.min(scaleX, scaleY)
      return { x: cx + dx * scale, y: cy + dy * scale }
    }

    /**
     * Lay out a parsed flowchart by dependency depth (layered graph drawing).
     * @param {{ direction: string, nodes: Array<{ id: string, label: string }>, edges: Array<{ from: string, to: string, label: string }> }} model - parsed diagram.
     * @returns {{ width: number, height: number, horizontal: boolean, nodes: Map<string, { x: number, y: number, width: number, height: number, lines: string[] }> }} geometry.
     */
    function layoutMermaid(model) {
      const ids = model.nodes.map((node) => node.id)
      const outgoing = new Map()
      const incoming = new Map()
      for (const id of ids) {
        outgoing.set(id, [])
        incoming.set(id, 0)
      }
      for (const edge of model.edges) {
        if (!outgoing.has(edge.from) || !incoming.has(edge.to)) continue
        outgoing.get(edge.from).push(edge.to)
        incoming.set(edge.to, incoming.get(edge.to) + 1)
      }
      const depth = new Map()
      const queue = ids.filter((id) => incoming.get(id) === 0)
      if (queue.length === 0 && ids.length > 0) queue.push(ids[0])
      for (const id of queue) depth.set(id, 0)
      while (queue.length > 0) {
        const id = queue.shift()
        const base = depth.get(id) || 0
        for (const next of outgoing.get(id) || []) {
          if (depth.has(next)) continue
          depth.set(next, base + 1)
          queue.push(next)
        }
      }
      for (const id of ids) if (!depth.has(id)) depth.set(id, 0)

      const levels = []
      for (const node of model.nodes) {
        const level = depth.get(node.id) || 0
        if (!levels[level]) levels[level] = []
        levels[level].push(node)
      }

      const NODE_GAP = 24
      const LEVEL_GAP = 52
      // Grouped diagrams reserve a title band above the first row of nodes.
      const PADDING = model.subgraphs && model.subgraphs.length > 0 ? 28 : 14
      const measured = new Map()
      for (const node of model.nodes) {
        const lines = mermaidWrap(node.label, 200)
        const textWidth = Math.max(24, ...lines.map(mermaidTextWidth))
        measured.set(node.id, { width: Math.min(236, textWidth + 26), height: lines.length * 18 + 18, lines })
      }

      const horizontal = model.direction === 'LR' || model.direction === 'RL'
      const levelWidths = []
      const levelHeights = []
      for (let level = 0; level < levels.length; level += 1) {
        const nodes = levels[level] || []
        let width = 0
        let height = 0
        nodes.forEach((node, index) => {
          const size = measured.get(node.id)
          width += size.width + (index > 0 ? NODE_GAP : 0)
          height = Math.max(height, size.height)
        })
        levelWidths[level] = width
        levelHeights[level] = height
      }

      const positions = new Map()
      let width = 0
      let height = 0
      if (horizontal) {
        let cursorX = PADDING
        for (let level = 0; level < levels.length; level += 1) {
          const nodes = levels[level] || []
          let cursorY = PADDING
          for (const node of nodes) {
            const size = measured.get(node.id)
            positions.set(node.id, { x: cursorX + (levelWidths[level] - size.width) / 2, y: cursorY, width: size.width, height: size.height, lines: size.lines })
            cursorY += size.height + NODE_GAP
          }
          width = Math.max(width, cursorX + levelWidths[level])
          height = Math.max(height, cursorY - NODE_GAP)
          cursorX += levelWidths[level] + LEVEL_GAP
        }
        width += PADDING
        height += PADDING
      } else {
        const canvasWidth = Math.max(0, ...levelWidths) + PADDING * 2
        let cursorY = PADDING
        for (let level = 0; level < levels.length; level += 1) {
          const nodes = levels[level] || []
          let cursorX = (canvasWidth - levelWidths[level]) / 2
          for (const node of nodes) {
            const size = measured.get(node.id)
            positions.set(node.id, { x: cursorX, y: cursorY + (levelHeights[level] - size.height) / 2, width: size.width, height: size.height, lines: size.lines })
            cursorX += size.width + NODE_GAP
          }
          cursorY += levelHeights[level] + LEVEL_GAP
        }
        width = canvasWidth
        height = Math.max(PADDING * 2, cursorY - LEVEL_GAP + PADDING)
      }
      // Subgraph frames: one bounding box per group, with a title band above its
      // nodes. Frames paint behind every node, so an overlapping frame stays legible.
      const subgraphBoxes = []
      for (const group of model.subgraphs || []) {
        const boxes = group.nodeIds.map((id) => positions.get(id)).filter(Boolean)
        if (boxes.length === 0) continue
        const minX = Math.max(2, Math.min(...boxes.map((box) => box.x)) - 12)
        const minY = Math.max(2, Math.min(...boxes.map((box) => box.y)) - 24)
        const maxX = Math.max(...boxes.map((box) => box.x + box.width)) + 12
        const maxY = Math.max(...boxes.map((box) => box.y + box.height)) + 12
        subgraphBoxes.push({ id: group.id, label: group.label, x: minX, y: minY, width: maxX - minX, height: maxY - minY })
        width = Math.max(width, maxX + 2)
        height = Math.max(height, maxY + 2)
      }
      return { width, height, horizontal, positions, subgraphBoxes }
    }

    /** Render a parsed flowchart as inline SVG. */
    function MermaidDiagram(props) {
      const t = props.t || fallbackTranslate
      const uid = React.useId ? React.useId().replace(/[^a-zA-Z0-9_-]/g, '') : 'm'
      const parsed = useMemo(() => parseMermaid(props.source), [props.source])
      const geometry = useMemo(() => (parsed ? layoutMermaid(parsed) : null), [parsed])
      if (!parsed || !geometry) {
        return h(
          'div',
          { className: 'ghp-mermaid-fallback' },
          h(CodeBlock, { code: props.source, lang: 'mermaid', t }),
          h('div', { className: 'ghp-mermaid-note' }, t('md.mermaidUnsupported')),
        )
      }
      const markerId = 'ghp-mermaid-arrow-' + uid
      const nodeElements = []
      for (const [id, box] of geometry.positions) {
        nodeElements.push(
          h(
            'g',
            { key: 'n-' + id },
            h('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: 7, className: 'ghp-mermaid-node' }),
            h(
              'text',
              { x: box.x + box.width / 2, y: box.y + box.height / 2 - ((box.lines.length - 1) * 18) / 2 + 4, textAnchor: 'middle', className: 'ghp-mermaid-label' },
              box.lines.map((line, index) => h('tspan', { key: index, x: box.x + box.width / 2, dy: index === 0 ? 0 : 18 }, line)),
            ),
          ),
        )
      }
      const subgraphElements = (geometry.subgraphBoxes || []).map((box, index) =>
        h(
          'g',
          { key: 'sg-' + index },
          h('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: 10, className: 'ghp-mermaid-subgraph' }),
          h('text', { x: box.x + 10, y: box.y + 15, className: 'ghp-mermaid-subgraph-label' }, box.label),
        ),
      )
      // Group-to-group edges address a subgraph id; resolve those against the
      // rendered group frames so the diagram does not grow phantom nodes.
      const groupBoxes = new Map((geometry.subgraphBoxes || []).map((box) => [box.id, box]))
      const edgeElements = parsed.edges.map((edge, index) => {
        const from = geometry.positions.get(edge.from) || groupBoxes.get(edge.from)
        const to = geometry.positions.get(edge.to) || groupBoxes.get(edge.to)
        if (!from || !to) return null
        const fromX = from.x + from.width / 2
        const fromY = from.y + from.height / 2
        const toX = to.x + to.width / 2
        const toY = to.y + to.height / 2
        const dx = toX - fromX
        const dy = toY - fromY
        const start = mermaidClip(fromX, fromY, from.width, from.height, dx, dy)
        const end = mermaidClip(toX, toY, to.width, to.height, -dx, -dy)
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        return h(
          'g',
          { key: 'e-' + index },
          h('line', {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            className: 'ghp-mermaid-edge' + (edge.dashed ? ' ghp-mermaid-edge-dashed' : ''),
            markerEnd: 'url(#' + markerId + ')',
          }),
          edge.label ? h('text', { x: midX, y: midY - 5, textAnchor: 'middle', className: 'ghp-mermaid-edge-label' }, edge.label) : null,
        )
      })
      return h(
        'div',
        { className: 'ghp-mermaid' },
        h(
          'svg',
          { viewBox: '0 0 ' + Math.ceil(geometry.width) + ' ' + Math.ceil(geometry.height), width: Math.ceil(geometry.width), height: Math.ceil(geometry.height), role: 'img', 'aria-label': 'mermaid diagram' },
          h(
            'defs',
            null,
            h(
              'marker',
              { id: markerId, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
              h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'ghp-mermaid-arrow' }),
            ),
          ),
          subgraphElements,
          edgeElements,
          nodeElements,
        ),
      )
    }

    // ---------------------------------------------------------------- github body html

    /**
     * The panel renders the HTML GitHub itself produces for a body (`bodyHTML`
     * from the GraphQL API) instead of parsing markdown again: GitHub's own
     * parser output plus GitHub's own markdown stylesheet is the closest match to
     * the comment people already know from the web UI. Everything below is the
     * allow-list sanitizer that turns that HTML into React nodes.
     */

    /** Named entities GitHub decodes inside text and attributes. */
    const HTML_ENTITIES = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: '\u00a0',
      rarr: '→',
      larr: '←',
      uarr: '↑',
      darr: '↓',
      harr: '↔',
      mdash: '—',
      ndash: '–',
      hellip: '…',
      middot: '·',
      bull: '•',
      times: '×',
      divide: '÷',
      copy: '©',
      reg: '®',
      trade: '™',
      check: '✓',
      cross: '✗',
      laquo: '«',
      raquo: '»',
      ldquo: '“',
      rdquo: '”',
      lsquo: '‘',
      rsquo: '’',
    }

    /** Decode the entity spellings that appear in GitHub-rendered HTML. */
    function decodeEntities(text) {
      return String(text).replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g, (match, decimal, hex, name) => {
        if (decimal !== undefined) {
          const code = Number(decimal)
          return Number.isFinite(code) ? String.fromCodePoint(code) : match
        }
        if (hex !== undefined) {
          const code = parseInt(hex, 16)
          return Number.isFinite(code) ? String.fromCodePoint(code) : match
        }
        const decoded = HTML_ENTITIES[String(name).toLowerCase()]
        return decoded === undefined ? match : decoded
      })
    }

    /** Tags kept from GitHub's rendered HTML; every other tag is unwrapped. */
    const HTML_KEPT_TAGS = new Set([
      'a', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'path', 'picture',
      'pre', 's', 'samp', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td',
      'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'video',
    ])

    /** Container tags whose whole subtree is dropped (scripts, styles, embeds). */
    const HTML_DROPPED_TAGS = new Set(['iframe', 'math', 'noscript', 'object', 'script', 'select', 'style', 'template', 'textarea'])

    /** Void elements: they never take children. */
    const HTML_VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'source', 'wbr'])

    /** HTML attribute name (lower case) -> React prop name. */
    const HTML_ATTR_PROPS = {
      align: 'align',
      alt: 'alt',
      checked: 'checked',
      colspan: 'colSpan',
      controls: 'controls',
      datetime: 'dateTime',
      disabled: 'disabled',
      height: 'height',
      href: 'href',
      lang: 'lang',
      loading: 'loading',
      loop: 'loop',
      media: 'media',
      muted: 'muted',
      open: 'open',
      poster: 'poster',
      reversed: 'reversed',
      role: 'role',
      rowspan: 'rowSpan',
      sizes: 'sizes',
      src: 'src',
      srcset: 'srcSet',
      start: 'start',
      title: 'title',
      type: 'type',
      version: 'version',
      viewbox: 'viewBox',
      width: 'width',
      'aria-hidden': 'aria-hidden',
      'aria-label': 'aria-label',
      'data-footnote-ref': 'data-footnote-ref',
      'data-footnote-backref': 'data-footnote-backref',
      'data-footnote-id': 'data-footnote-id',
    }

    /**
     * Class names GitHub's rendered HTML carries that its stylesheet needs.
     * Everything else is stripped so remote markup cannot borrow panel styles.
     */
    const HTML_CLASS_NAME = /^(?:pl-[a-z0-9]+|highlight(?:-source-[a-z0-9.+#_-]+)?|notranslate|position-relative|overflow-auto|mr-2|octicon(?:-[a-z0-9-]+)?|markdown-alert(?:-[a-z]+)?|contains-task-list|task-list-item(?:-checkbox)?|snippet-clipboard-content|render-plaintext-hidden|emoji)$/

    /** Attribute that carries the exact code text GitHub's copy control writes. */
    const HTML_COPY_ATTR = 'data-snippet-clipboard-copy-content'

    /** Classes that only exist for GitHub's own client-side behaviour or a11y. */
    const HTML_SKIPPED_CLASSES = new Set(['sr-only', 'js-render-enrichment-loader', 'render-plaintext-hidden'])

    /** Whether a URL may be opened from the panel: http(s) only. */
function isSafeUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

/** Whether an `href` is safe to render as a link (http(s), mailto, in-page anchor). */
    function isSafeHref(url) {
      return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^mailto:[^\s]+$/i.test(url) || /^#[^\s<>"']*$/.test(url))
    }

    /** Whether a `src`/`srcset` URL is safe to render (http(s) or an inline image). */
    function isSafeSrc(url) {
      return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^data:image\/[a-z0-9.+-]+[;,]/i.test(url))
    }

    /** Validate one `srcset` candidate list; an unsafe candidate drops the attribute. */
    function safeSrcSet(value) {
      const candidates = String(value || '').split(',').map((candidate) => candidate.trim()).filter(Boolean)
      if (candidates.length === 0) return ''
      for (const candidate of candidates) {
        if (!isSafeSrc(candidate.split(/\s+/)[0])) return ''
      }
      return candidates.join(', ')
    }

    /** Split a raw class attribute into the names the GitHub stylesheet knows. */
    function safeClassNames(value) {
      const names = String(value || '').split(/\s+/).filter((name) => HTML_CLASS_NAME.test(name))
      return names.join(' ')
    }

    /** Pattern of one start-tag attribute. */
    const HTML_ATTR_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

    /**
     * Parse one start tag's attributes.
     * @param {string} source - attribute text of a start tag.
     * @returns {Record<string, string>} lower-case attribute names and decoded values.
     */
    function parseHtmlAttributes(source) {
      const attrs = {}
      if (!source) return attrs
      const pattern = new RegExp(HTML_ATTR_PATTERN)
      let match
      while ((match = pattern.exec(source)) !== null) {
        const name = match[1].toLowerCase()
        const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : ''
        attrs[name] = decodeEntities(value)
      }
      return attrs
    }

    /** Concatenate every text node below one parsed node (mermaid sources, copy targets). */
    function nodeText(node) {
      if (node.type === 'text') return node.value
      if (HTML_DROPPED_TAGS.has(node.tag)) return ''
      let text = ''
      for (const child of node.children) text += nodeText(child)
      return text
    }

    /** Find the raw `<pre lang="mermaid">` source inside GitHub's mermaid wrapper. */
    function findMermaidSource(node) {
      if (node.type !== 'element') return ''
      if (node.tag === 'pre') {
        const lang = String(node.attrs.lang || '').toLowerCase()
        if (lang === 'mermaid') return nodeText(node)
      }
      if (node.tag === 'code') {
        const classes = String(node.attrs.class || '').split(/\s+/)
        if (classes.includes('language-mermaid')) return nodeText(node)
      }
      for (const child of node.children) {
        const found = findMermaidSource(child)
        if (found) return found
      }
      return ''
    }

    /** Floating "copy code" control used by every rendered code block. */
    function CopyCodeButton(props) {
      const t = props.t || fallbackTranslate
      const [copied, setCopied] = useState(false)
      const timerRef = useRef(null)
      useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }, [])
      const copy = () => {
        const clipboard = navigator.clipboard
        if (!clipboard || typeof clipboard.writeText !== 'function') return
        clipboard.writeText(String(props.code || '')).then(() => {
          setCopied(true)
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => setCopied(false), 1600)
        }).catch(() => {})
      }
      return h(
        'button',
        { type: 'button', className: 'ghp-html-copy', onClick: copy, 'aria-label': t(copied ? 'md.copied' : 'md.copy') },
        t(copied ? 'md.copied' : 'md.copy'),
      )
    }

    /** Convert one element's kept attributes into React props. */
    function htmlElementProps(tag, attrs) {
      const props = {}
      for (const [name, value] of Object.entries(attrs)) {
        if (name === 'class' || name === HTML_COPY_ATTR) continue
        const prop = HTML_ATTR_PROPS[name]
        if (!prop) continue
        if (prop === 'href') {
          if (isSafeHref(value)) props.href = value
          continue
        }
        if (prop === 'src') {
          if (isSafeSrc(value)) props.src = value
          continue
        }
        if (prop === 'srcSet') {
          const safe = safeSrcSet(value)
          if (safe) props.srcSet = safe
          continue
        }
        if (prop === 'width' || prop === 'height' || prop === 'colSpan' || prop === 'rowSpan' || prop === 'start') {
          const number = Number(value)
          if (Number.isFinite(number)) props[prop] = number
          continue
        }
        if (prop === 'align') {
          if (tag === 'img') {
            // The GitHub stylesheet targets images by their align attribute.
            if (/^(?:left|right)$/i.test(value)) props.align = value.toLowerCase()
          } else if (/^(?:left|center|right|justify)$/i.test(value)) {
            props.style = { textAlign: value.toLowerCase() }
          }
          continue
        }
        if (prop === 'checked' || prop === 'disabled' || prop === 'open' || prop === 'controls' || prop === 'muted' || prop === 'loop' || prop === 'reversed') {
          props[prop] = true
          continue
        }
        props[prop] = value
      }
      if (tag === 'img') {
        props.loading = 'lazy'
        props.decoding = 'async'
      }
      if (tag === 'video') props.playsInline = true
      return props
    }

    /**
     * Render one parsed element into React content.
     * @param {any} node - parsed element node.
     * @param {string} key - React key.
     * @param {(key: string) => string} t - namespace translate.
     * @param {{ inCodeBlock?: boolean, inSvg?: boolean }} context - parent context.
     * @param {number} depth - nesting guard.
     * @returns {any} React node, a node array, or null when dropped.
     */
    function renderHtmlNode(node, key, t, context, depth) {
      const tag = node.tag
      const attrs = node.attrs
      const classes = safeClassNames(attrs.class)

      // GitHub's mermaid wrapper: the raw source is the only meaningful child, and
      // the rest of the wrapper is a client-side loading placeholder.
      if (tag === 'section' && attrs['data-type'] === 'mermaid') {
        const source = findMermaidSource(node)
        return source ? h(MermaidDiagram, { key, source, t }) : null
      }
      if (String(attrs.class || '').split(/\s+/).some((name) => HTML_SKIPPED_CLASSES.has(name))) return null
      if (tag === 'pre') {
        const lang = String(attrs.lang || '').toLowerCase()
        if (lang === 'mermaid') return h(MermaidDiagram, { key, source: nodeText(node), t })
        const children = renderHtmlChildren(node, key + '-', t, { ...context, inCodeBlock: true }, depth + 1)
        const pre = h('pre', { key: key + '-pre', className: classes || undefined }, children)
        if (context.inCodeBlock) return pre
        return h('div', { key, className: 'ghp-code-block' }, [
          pre,
          h(CopyCodeButton, { key: key + '-copy', code: nodeText(node), t }),
        ])
      }
      if (tag === 'input') {
        if (String(attrs.type || '').toLowerCase() !== 'checkbox') return null
        return h('input', {
          key,
          type: 'checkbox',
          className: 'task-list-item-checkbox',
          checked: attrs.checked !== undefined,
          disabled: true,
          readOnly: true,
          tabIndex: -1,
          'aria-label': attrs['aria-label'] || undefined,
        })
      }
      if (tag === 'svg') {
        return h(
          'svg',
          {
            key,
            viewBox: attrs.viewbox || '0 0 16 16',
            width: attrs.width ? Number(attrs.width) || undefined : undefined,
            height: attrs.height ? Number(attrs.height) || undefined : undefined,
            className: ('octicon ' + classes).split(/\s+/).filter((name, position, all) => name && all.indexOf(name) === position).join(' '),
            'aria-hidden': 'true',
            focusable: 'false',
          },
          renderHtmlChildren(node, key + '-', t, { ...context, inSvg: true }, depth + 1),
        )
      }
      if (tag === 'path') {
        if (!context.inSvg) return null
        const path = typeof attrs.d === 'string' ? attrs.d : ''
        if (!path) return null
        return h('path', {
          key,
          d: path,
          fillRule: attrs['fill-rule'] || undefined,
          clipRule: attrs['clip-rule'] || undefined,
        })
      }
      if (!HTML_KEPT_TAGS.has(tag)) return renderHtmlChildren(node, key + '-', t, context, depth + 1)

      const copyText = typeof attrs[HTML_COPY_ATTR] === 'string' ? attrs[HTML_COPY_ATTR] : ''
      const isCodeContainer = tag === 'div' && /(?:^|\s)(?:highlight|snippet-clipboard-content)(?:\s|$)/.test(classes)
      if (isCodeContainer) {
        const containerClass = (classes + ' ghp-code-block').trim()
        const children = renderHtmlChildren(node, key + '-', t, { ...context, inCodeBlock: true }, depth + 1)
        return h('div', { key, className: containerClass }, [
          ...children,
          h(CopyCodeButton, { key: key + '-copy', code: copyText || nodeText(node), t }),
        ])
      }

      const props = { key, ...htmlElementProps(tag, attrs) }
      if (classes) props.className = classes
      if (tag === 'a') {
        const href = props.href || ''
        // In-page anchors point at ids this renderer strips. Keep the anchor element
        // without its href so GitHub's footnote markers (data-footnote-ref /
        // data-footnote-backref) still get their brackets from the stylesheet.
        if (href.startsWith('#')) {
          delete props.href
        } else if (href) {
          props.target = '_blank'
          props.rel = 'noreferrer noopener'
        }
      }
      if (HTML_VOID_TAGS.has(tag)) return h(tag, props)
      const children = renderHtmlChildren(node, key + '-', t, context, depth + 1)
      return h(tag, props, children.length > 0 ? children : undefined)
    }

    /** Render the children of one parsed node. */
    function renderHtmlChildren(node, prefix, t, context, depth) {
      if (depth > 12) {
        const text = nodeText(node)
        return text ? [text] : []
      }
      const output = []
      for (const [index, child] of node.children.entries()) {
        if (child.type === 'text') {
          if (child.value) output.push(child.value)
          continue
        }
        const rendered = renderHtmlNode(child, prefix + index, t, context, depth)
        if (rendered === null || rendered === undefined || rendered === '') continue
        output.push(rendered)
      }
      return output
    }

    /**
     * Turn GitHub's rendered body HTML into sanitized React nodes.
     * GitHub already sanitizes the markup it returns; this allow-list keeps that
     * contract in the panel as well (no scripts, styles, handlers, or unsafe URLs).
     * @param {string} source - `bodyHTML` string from the API.
     * @param {(key: string) => string} t - namespace translate.
     * @returns {Array<any>} React children for the body container.
     */
    function renderGitHubHtml(source, t) {
      const text = String(source || '')
      const root = { type: 'element', tag: 'root', attrs: {}, children: [] }
      const stack = [root]
      let index = 0
      const pushText = (value) => {
        const decoded = decodeEntities(value)
        if (!decoded) return
        const parent = stack[stack.length - 1]
        const last = parent.children[parent.children.length - 1]
        if (last && last.type === 'text') last.value += decoded
        else parent.children.push({ type: 'text', value: decoded })
      }
      while (index < text.length) {
        const lt = text.indexOf('<', index)
        if (lt === -1) {
          pushText(text.slice(index))
          break
        }
        if (lt > index) pushText(text.slice(index, lt))
        if (text.startsWith('<!--', lt)) {
          const end = text.indexOf('-->', lt + 4)
          index = end === -1 ? text.length : end + 3
          continue
        }
        if (text.startsWith('<!', lt)) {
          const end = text.indexOf('>', lt + 2)
          index = end === -1 ? text.length : end + 1
          continue
        }
        const tagMatch = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/.exec(text.slice(lt))
        if (!tagMatch) {
          pushText('<')
          index = lt + 1
          continue
        }
        const closing = tagMatch[1] === '/'
        const tag = tagMatch[2].toLowerCase()
        const attrs = parseHtmlAttributes(tagMatch[3])
        const selfClosing = tagMatch[4] === '/' || HTML_VOID_TAGS.has(tag)
        index = lt + tagMatch[0].length
        if (closing) {
          for (let depthIndex = stack.length - 1; depthIndex > 0; depthIndex -= 1) {
            if (stack[depthIndex].tag === tag) {
              stack.length = depthIndex
              break
            }
          }
          continue
        }
        if (HTML_DROPPED_TAGS.has(tag)) {
          const close = text.toLowerCase().indexOf('</' + tag, index)
          if (close === -1) {
            index = text.length
          } else {
            const gt = text.indexOf('>', close)
            index = gt === -1 ? text.length : gt + 1
          }
          continue
        }
        const node = { type: 'element', tag, attrs, children: [] }
        stack[stack.length - 1].children.push(node)
        if (!selfClosing) stack.push(node)
      }
      return renderHtmlChildren(root, 'gh', t, {}, 0)
    }

    /**
     * Rendered body: GitHub's own HTML plus GitHub's own markdown stylesheet.
     * A body without `bodyHTML` (older cached payloads) falls back to plain text.
     * @param {{ html?: string, text?: string, t?: (key: string) => string }} props - rendered HTML and raw source.
     * @returns {any} the body container.
     */
    function HtmlBody(props) {
      const t = props.t || fallbackTranslate
      const html = typeof props.html === 'string' ? props.html : ''
      const fallbackText = typeof props.text === 'string' ? props.text : ''
      const nodes = useMemo(() => (html.trim() ? renderGitHubHtml(html, t) : null), [html, t])
      if (!nodes) {
        return h('div', { className: 'ghp-body ghp-body-fallback' }, fallbackText.trim() ? fallbackText : null)
      }
      return h('div', { className: 'ghp-body markdown-body' }, nodes)
    }


    // ---------------------------------------------------------------- format helpers

    /** Deterministic avatar background for a login. */
    function avatarColor(login) {
      const text = String(login || '?')
      let hash = 0
      for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
      return AVATAR_COLORS[hash % AVATAR_COLORS.length]
    }

    /** Format an ISO timestamp relative to now. */
    function relativeTime(iso, t) {
      if (!iso) return ''
      const then = new Date(iso).getTime()
      if (!Number.isFinite(then)) return ''
      const diff = Math.max(0, Date.now() - then)
      const minute = 60 * 1000
      const hour = 60 * minute
      const day = 24 * hour
      const month = 30 * day
      if (diff < minute) return t('time.now')
      if (diff < hour) return Math.floor(diff / minute) + ' ' + t('time.minute')
      if (diff < day) return Math.floor(diff / hour) + ' ' + t('time.hour')
      if (diff < month) return Math.floor(diff / day) + ' ' + t('time.day')
      return Math.floor(diff / month) + ' ' + t('time.month')
    }

    /** Format an ISO timestamp as a short local date. */
    function shortDate(iso) {
      if (!iso) return ''
      const value = new Date(iso)
      if (Number.isNaN(value.getTime())) return ''
      try {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value)
      } catch {
        return value.toISOString().slice(0, 10)
      }
    }

    /** Format an ISO timestamp as local HH:mm. */
    function shortTime(iso) {
      if (!iso) return ''
      const value = new Date(iso)
      if (Number.isNaN(value.getTime())) return ''
      const hours = String(value.getHours()).padStart(2, '0')
      const minutes = String(value.getMinutes()).padStart(2, '0')
      return hours + ':' + minutes
    }

    /** Human-readable state of a pull request or issue item. */
    function stateOf(item) {
      const raw = String(item.state || '').toUpperCase()
      if (item.isDraft && raw === 'OPEN') return 'draft'
      if (raw === 'MERGED') return 'merged'
      if (raw === 'CLOSED') return 'closed'
      if (raw === 'OPEN') return 'open'
      return 'unknown'
    }

    /** Localized state label key. */
    function stateKey(item) {
      const state = stateOf(item)
      return state === 'draft' ? 'state.draft' : state === 'merged' ? 'state.merged' : state === 'closed' ? 'state.closed' : state === 'open' ? 'state.open' : 'state.unknown'
    }

    /** Map a review decision/state to a localized label key. */
    function reviewKey(state) {
      switch (String(state || '').toUpperCase()) {
        case 'APPROVED':
          return 'review.approved'
        case 'CHANGES_REQUESTED':
          return 'review.changesRequested'
        case 'COMMENTED':
          return 'review.commented'
        case 'DISMISSED':
          return 'review.dismissed'
        case 'PENDING':
          return 'review.pending'
        default:
          return 'review.requested'
      }
    }

    /** Tint class for a review event chip: approval, change request, or plain comment. */
    function reviewChipClass(state) {
      const normalized = String(state || '').toUpperCase()
      if (normalized === 'APPROVED') return 'ghp-act-chip-approved'
      if (normalized === 'CHANGES_REQUESTED') return 'ghp-act-chip-changes'
      return 'ghp-act-chip-comment'
    }

    /** Map a check conclusion/state to a localized label key. */
    function checkKey(status, conclusion) {
      const value = String(conclusion || status || '').toUpperCase()
      if (value === 'SUCCESS' || value === 'PASSED') return 'check.success'
      if (['FAILURE', 'FAILED', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'].includes(value)) return 'check.failure'
      if (['PENDING', 'IN_PROGRESS', 'QUEUED', 'WAITING', 'EXPECTED'].includes(value)) return 'check.pending'
      if (value === 'SKIPPED') return 'check.skipped'
      return 'check.neutral'
    }

    /** Classify a check for its dot color. */
    function checkTone(status, conclusion) {
      const key = checkKey(status, conclusion)
      return key === 'check.success' ? 'ok' : key === 'check.failure' ? 'bad' : key === 'check.pending' ? 'wait' : 'idle'
    }

    /** Reasons the Host classifies and the panel can phrase itself. */
    const LOCALIZED_ERRORS = [
      'gh-missing',
      'gh-unauthenticated',
      'rate-limited',
      'not-found',
      'invalid-repo',
      'discussions-unavailable',
      'no-remote',
      'not-github',
      'missing-cwd',
      'invalid-cwd',
      'timeout',
      'graphql',
      'bad-json',
      'invalid-kind',
      'invalid-item',
      'unauthorized',
      'host-unavailable',
    ]

    /** Reasons where repeating the same request can succeed. */
    const RETRYABLE_ERRORS = new Set(['gh-missing', 'gh-unauthenticated', 'rate-limited', 'timeout', 'failed', 'internal', 'graphql', 'bad-json', 'host-unavailable'])

    /**
     * Describe one failure payload for rendering.
     * @param {{ reason?: string, message?: string, error?: string } | null} payload - failed request payload.
     * @param {(key: string) => string} t - namespace translate.
     * @returns {{ text: string, retryable: boolean }} localized message and whether a retry button helps.
     */
    function errorInfo(payload, t) {
      const reason = payload && payload.reason
      const localized = LOCALIZED_ERRORS.includes(reason) ? t('error.' + reason) : ''
      const detail = (payload && (payload.message || payload.error)) || ''
      return { text: localized || detail || t('error.failed'), retryable: reason ? RETRYABLE_ERRORS.has(reason) : true }
    }

    /**
     * Fetch JSON and turn transport failures into the shared failure shape.
     * @param {string} path - route path.
     * @param {AbortSignal} [signal] - cancellation.
     * @returns {Promise<any>} the parsed payload, or `{ ok: false, reason }`.
     */
    function requestJson(path, signal) {
      return fetch(path, { headers: { accept: 'application/json' }, signal }).then((response) => {
        const type = response.headers.get('content-type') || ''
        if (!response.ok || !type.includes('application/json')) return { ok: false, reason: 'host-unavailable' }
        return response.json().catch(() => ({ ok: false, reason: 'host-unavailable' }))
      })
    }

    /**
     * POST JSON and turn transport failures into the shared failure shape.
     * @param {string} path - route path.
     * @param {unknown} body - JSON body.
     * @returns {Promise<any>} the parsed payload, or `{ ok: false, reason }`.
     */
    function postJson(path, body) {
      return fetch(path, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body === undefined ? {} : body),
      }).then((response) => {
        const type = response.headers.get('content-type') || ''
        if (!type.includes('application/json')) return { ok: false, reason: 'host-unavailable' }
        return response.json().catch(() => ({ ok: false, reason: 'host-unavailable' }))
      })
    }

    /**
     * One GET resource with loading/failed/ready states, a background refresh
     * flag that keeps the previous data on screen, and a manual reload.
     * @param {(signal: AbortSignal) => Promise<any>} load - request thunk.
     * @param {Array<unknown>} deps - primitive dependencies; reloads when changed.
     * @returns {{ state: {status: string, data?: any, refreshing?: boolean, reason?: string, message?: string}, reload: () => void }}
     */
    function useResource(load, deps) {
      const [state, setState] = useState({ status: 'loading' })
      const [nonce, setNonce] = useState(0)
      useEffect(() => {
        let alive = true
        const controller = new AbortController()
        setState((previous) => (previous.status === 'ready' ? { ...previous, refreshing: true } : { status: 'loading' }))
        load(controller.signal)
          .then((payload) => {
            if (!alive) return
            if (payload && payload.ok) setState({ status: 'ready', data: payload })
            else setState({ status: 'failed', reason: payload && payload.reason, message: payload && (payload.error || payload.message) })
          })
          .catch((error) => {
            if (!alive || controller.signal.aborted) return
            setState({ status: 'failed', message: String((error && error.message) || error) })
          })
        return () => {
          alive = false
          controller.abort()
        }
      }, [...deps, nonce])
      const reload = useCallback(() => setNonce((value) => value + 1), [])
      return { state, reload }
    }

    /** Resolve the session repository from its working directory. */
    function useRepository(cwd) {
      return useResource(
        (signal) => (cwd ? requestJson('/api/github-panel/repo?cwd=' + encodeURIComponent(cwd), signal) : Promise.resolve({ ok: false, reason: 'invalid-cwd' })),
        [cwd],
      )
    }

    /**
     * Load one item list.
     * @param {string | null} repo - `owner/name`, or null before resolution.
     * @param {string} kind - `pr`, `issue`, or `discussion`.
     * @param {string} stateFilter - `open`, `closed`, or `all`.
     * @param {number} refreshToken - nonzero asks the Host to bypass its cache.
     * @returns {{ state: object, reload: () => void }} the list resource.
     */
    function useItemList(repo, kind, stateFilter, refreshToken) {
      const deps = useMemo(() => [repo || '', kind, stateFilter, refreshToken || 0], [repo, kind, stateFilter, refreshToken])
      return useResource(
        (signal) => {
          if (!repo) return Promise.resolve({ ok: false, reason: 'invalid-repo' })
          const fresh = refreshToken > 0 ? '&fresh=1' : ''
          const query =
            '/api/github-panel/list?repo=' +
            encodeURIComponent(repo) +
            '&kind=' +
            encodeURIComponent(kind) +
            '&state=' +
            encodeURIComponent(stateFilter) +
            fresh
          return requestJson(query, signal)
        },
        deps,
      )
    }

    /**
     * Load one item detail.
     * @param {string | null} repo - `owner/name`, or null before resolution.
     * @param {string} kind - `pr`, `issue`, or `discussion`.
     * @param {number} number - item number.
     * @param {number} refreshToken - nonzero asks the Host to bypass its cache.
     * @returns {{ state: object, reload: () => void }} the detail resource.
     */
    function useItemDetail(repo, kind, number, refreshToken) {
      const deps = useMemo(() => [repo || '', kind, number, refreshToken || 0], [repo, kind, number, refreshToken])
      return useResource(
        (signal) => {
          if (!repo || !number) return Promise.resolve({ ok: false, reason: 'invalid-item' })
          const fresh = refreshToken > 0 ? '&fresh=1' : ''
          const query =
            '/api/github-panel/detail?repo=' +
            encodeURIComponent(repo) +
            '&kind=' +
            encodeURIComponent(kind) +
            '&number=' +
            encodeURIComponent(number) +
            fresh
          return requestJson(query, signal)
        },
        deps,
      )
    }

    /**
     * Load one pull request's changed files (unified patches).
     * @param {string | null} repo - `owner/name`.
     * @param {number} number - pull request number.
     * @param {number} refreshToken - nonzero asks the Host to bypass its cache.
     * @returns {{ state: object, reload: () => void }} the diff resource.
     */
    function useDiff(repo, number, refreshToken) {
      const deps = useMemo(() => [repo || '', number || 0, refreshToken || 0], [repo, number, refreshToken])
      return useResource(
        (signal) => {
          if (!repo || !number) return Promise.resolve({ ok: false, reason: 'invalid-item' })
          const fresh = refreshToken > 0 ? '&fresh=1' : ''
          return requestJson('/api/github-panel/diff?repo=' + encodeURIComponent(repo) + '&kind=pr&number=' + encodeURIComponent(number) + fresh, signal)
        },
        deps,
      )
    }

    // ---------------------------------------------------------------- small components

    /** GitHub avatar image with an initial-letter fallback on load failure. */
    function Avatar(props) {
      const size = props.size || 18
      const author = props.author || { login: props.login, avatarUrl: props.avatarUrl }
      const login = author && author.login ? author.login : ''
      const url = author && typeof author.avatarUrl === 'string' && /^https?:\/\//i.test(author.avatarUrl) ? author.avatarUrl : ''
      const [failed, setFailed] = useState(false)
      if (url && !failed) {
        return h('img', {
          className: 'ghp-avatar ghp-avatar-img',
          src: url,
          alt: login,
          title: login,
          width: size,
          height: size,
          loading: 'lazy',
          decoding: 'async',
          style: { width: size, height: size },
          onError: () => setFailed(true),
        })
      }
      return h(
        'span',
        {
          className: 'ghp-avatar',
          style: { width: size, height: size, background: avatarColor(login), fontSize: Math.max(9, Math.round(size * 0.52)) },
          title: login,
          'aria-hidden': 'true',
        },
        String(login || '?').slice(0, 1).toUpperCase(),
      )
    }

    /** Small chevron for collapsible sections and menus. */
    function IconChevron(props) {
      return h(Glyph, { size: props.size || 12 }, h('path', { d: props.open ? 'M3.6 6.4 8 10.6l4.4-4.2' : 'M6.4 3.6 10.6 8 6.4 12.4' }))
    }

    /** Funnel glyph for the activity filter. */
    function IconFilter(props) {
      return h(Glyph, { size: props.size || 13 }, h('path', { d: 'M2.4 3.2h11.2L9.4 8v4.1l-2.8 1.5V8L2.4 3.2Z' }))
    }

    /** Sort glyph: ordered lines with a downward arrow. */
    function IconSort(props) {
      return h(
        Glyph,
        { size: props.size || 14 },
        h('path', { d: 'M2.4 4.4h6.2' }),
        h('path', { d: 'M2.4 8h4.2' }),
        h('path', { d: 'M2.4 11.6h2.4' }),
        h('path', { d: 'M12.6 3.8v8.4' }),
        h('path', { d: 'M10 9.8l2.6 2.6 2.6-2.6' }),
      )
    }

    /** Expand-all glyph: four corners pushed outward. */
    function IconExpandAll(props) {
      return h(Glyph, { size: props.size || 14 }, h('path', { d: 'M2.6 6.4V2.6h3.8' }), h('path', { d: 'M13.4 6.4V2.6H9.6' }), h('path', { d: 'M2.6 9.6v3.8h3.8' }), h('path', { d: 'M13.4 9.6v3.8H9.6' }))
    }

    /** Collapse-all glyph: four corners pulled inward. */
    function IconCollapseAll(props) {
      return h(Glyph, { size: props.size || 14 }, h('path', { d: 'M6.4 2.6v3.8H2.6' }), h('path', { d: 'M9.6 2.6v3.8h3.8' }), h('path', { d: 'M6.4 13.4V9.6H2.6' }), h('path', { d: 'M9.6 13.4V9.6h3.8' }))
    }

    /** Quote glyph for the comment action menu. */
    function IconQuote(props) {
      return h(Glyph, { size: props.size || 12 }, h('path', { d: 'M3.2 3.8h4v4H4.8v1.4c0 .8.5 1.4 1.4 1.6v1.4c-1.8-.2-3-1.5-3-3.3V3.8Z' }), h('path', { d: 'M8.8 3.8h4v4H10.4v1.4c0 .8.5 1.4 1.4 1.6v1.4c-1.8-.2-3-1.5-3-3.3V3.8Z' }))
    }

    /** Copy text to the clipboard; resolves whether the write succeeded. */
    function copyText(value) {
      const clipboard = navigator.clipboard
      if (!clipboard || typeof clipboard.writeText !== 'function') return Promise.resolve(false)
      return clipboard.writeText(String(value || '')).then(() => true).catch(() => false)
    }

    /**
     * Put one review comment into the chat composer as a Markdown quote. Falls
     * back to the clipboard when the composer is not addressable.
     * @param {{ text?: string, meta?: string, t: (key: string) => string, actions: any }} options - quote payload and composer actions.
     * @returns {Promise<'quoted' | 'copied' | 'failed'>} the outcome used for button feedback.
     */
    function quoteReviewComment(options) {
      const text = String(options.text || '').trim()
      if (!text) return Promise.resolve('failed')
      const lines = text.split('\n').map((line) => (line ? '> ' + line : '>'))
      const payload = (options.meta ? '> ' + options.meta + '\n' : '') + lines.join('\n')
      const actions = options.actions
      if (actions && typeof actions.insertQuote === 'function') {
        try {
          if (actions.insertQuote(payload)) return Promise.resolve('quoted')
        } catch {
          // Fall through to the clipboard when the composer rejects the insertion.
        }
      }
      return copyText(payload).then((ok) => (ok ? 'copied' : 'failed'))
    }

    /**
     * Decide whether a dropdown should open above its trigger. Menus live inside
     * scrollable panels, so opening downward close to the bottom edge clipped
     * them; flip the menu when little room is left below the trigger.
     * @param {boolean} open - whether the menu is currently open.
     * @param {{ current: any }} wrapRef - ref to the trigger wrapper.
     * @returns {boolean} true when the menu should open upward.
     */
    function useDropUp(open, wrapRef) {
      const [dropUp, setDropUp] = useState(false)
      useEffect(() => {
        if (!open) return undefined
        const node = wrapRef.current
        const rect = node && typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null
        if (rect) setDropUp(window.innerHeight - rect.bottom < 220)
        return undefined
      }, [open, wrapRef])
      return dropUp
    }

    /** Per-comment action menu: quote into the composer, open on GitHub, copy. */
    function CommentActions(props) {
      const t = props.t
      const actions = props.actions || null
      const [open, setOpen] = useState(false)
      const [feedback, setFeedback] = useState('')
      const wrapRef = useRef(null)
      const dropUp = useDropUp(open, wrapRef)
      const timerRef = useRef(null)
      useEffect(() => {
        if (!open) return undefined
        const close = (event) => {
          if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
      }, [open])
      useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }, [])
      const announce = (text) => {
        setFeedback(text)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setFeedback(''), 1800)
      }
      const quote = () => {
        setOpen(false)
        quoteReviewComment({ text: props.quoteText, meta: props.quoteMeta, t, actions }).then((outcome) => {
          announce(t(outcome === 'quoted' ? 'actions.quoted' : outcome === 'copied' ? 'actions.copied' : 'actions.copyFailed'))
        })
      }
      const copy = () => {
        setOpen(false)
        copyText(props.quoteText).then((ok) => announce(t(ok ? 'actions.copied' : 'actions.copyFailed')))
      }
      const url = typeof props.url === 'string' && isSafeUrl(props.url) ? props.url : ''
      return h(
        'span',
        { className: 'ghp-act-menu', ref: wrapRef },
        h(
          'button',
          { type: 'button', className: 'ghp-icon-btn ghp-icon-btn-sm', title: t('actions.more'), 'aria-label': t('actions.more'), 'aria-expanded': open, onClick: () => setOpen((value) => !value) },
          '…',
        ),
        open
          ? h(
              'span',
              { className: 'ghp-menu' + (dropUp ? ' ghp-menu-up' : ''), role: 'menu' },
              h('button', { type: 'button', className: 'ghp-menu-item', role: 'menuitem', onClick: quote }, h(IconQuote), h('span', null, t('actions.quote'))),
              url ? h('a', { className: 'ghp-menu-item', role: 'menuitem', href: url, target: '_blank', rel: 'noreferrer noopener', onClick: () => setOpen(false) }, h(IconExternal), h('span', null, t('actions.open'))) : null,
              h('button', { type: 'button', className: 'ghp-menu-item', role: 'menuitem', onClick: copy }, h(IconQuote), h('span', null, t('actions.copy'))),
            )
          : null,
        feedback ? h('span', { className: 'ghp-act-feedback', role: 'status' }, feedback) : null,
      )
    }

    /** One inline review thread rendered between diff lines. */
    function InlineThread(props) {
      const t = props.t
      const thread = props.thread
      const comments = thread.comments || []
      const first = comments[0] || {}
      const author = first.author || {}
      const [open, setOpen] = useState(!thread.isResolved)
      const meta = (thread.path || '') + (thread.line ? ':' + thread.line : '')
      const preview = bodyExcerpt(first.body, 140)
      return h(
        'div',
        { className: 'ghp-inline-thread' + (thread.isResolved ? ' ghp-inline-resolved' : '') },
        h(
          'div',
          { className: 'ghp-inline-head' },
          h(
            'button',
            { type: 'button', className: 'ghp-inline-toggle', 'aria-expanded': open, onClick: () => setOpen((value) => !value) },
            h(IconChevron, { open }),
            h(
              'span',
              { className: 'ghp-act-chip ' + (thread.isResolved ? 'ghp-act-chip-approved' : 'ghp-act-chip-thread') },
              thread.isResolved ? h(IconReview, { size: 13 }) : h(IconComment, { size: 13 }),
            ),
            h(Avatar, { author, size: 18 }),
            h('span', { className: 'ghp-act-author' }, author.login || 'ghost'),
            thread.isResolved ? h('span', { className: 'ghp-thread-resolved' }, t('diff.resolved')) : h('span', { className: 'ghp-thread-open' }, t('diff.unresolved')),
            h('span', { className: 'ghp-inline-count' }, comments.length + ' ' + t('diff.comments')),
          ),
          h(CommentActions, { t, actions: props.actions, url: first.url, quoteText: first.body, quoteMeta: author.login ? '@' + author.login + ' · ' + meta : meta }),
        ),
        open
          ? h(
              'div',
              { className: 'ghp-inline-body' },
              comments.map((comment, index) =>
                h(
                  'div',
                  { key: index, className: 'ghp-inline-comment' },
                  h(
                    'div',
                    { className: 'ghp-inline-comment-head' },
                    h(Avatar, { author: comment.author || {}, size: 16 }),
                    h('span', { className: 'ghp-act-author' }, (comment.author && comment.author.login) || 'ghost'),
                    h('span', { className: 'ghp-act-time' }, relativeTime(comment.createdAt, t)),
                    h(CommentActions, { t, actions: props.actions, url: comment.url, quoteText: comment.body, quoteMeta: comment.author && comment.author.login ? '@' + comment.author.login : meta }),
                  ),
                  h('div', { className: 'ghp-inline-comment-body' }, h(HtmlBody, { html: comment.bodyHtml, text: comment.body || '', t })),
                ),
              ),
            )
          : preview
            ? h('button', { type: 'button', className: 'ghp-inline-preview', title: preview, onClick: () => setOpen(true) }, preview)
            : null,
      )
    }

    /** State dot plus label for one item. */
    function StateBadge(props) {
      const state = stateOf(props.item)
      return h(
        'span',
        { className: 'ghp-state-badge ghp-state-' + state },
        h('span', { className: 'ghp-dot ghp-dot-' + state, 'aria-hidden': 'true' }),
        h('span', null, props.t(stateKey(props.item))),
      )
    }

    /** A label chip tinted by GitHub's label color. */
    function LabelChip(props) {
      const color = String(props.label.color || '888888').replace(/^#/, '')
      const hex = /^[0-9a-fA-F]{6}$/.test(color) ? '#' + color : '#888888'
      return h(
        'span',
        { className: 'ghp-label', style: { borderColor: hex + '66', background: hex + '1f' } },
        h('span', { className: 'ghp-label-dot', style: { background: hex } }),
        props.label.name,
      )
    }

    /** Busy indicator used by lists and details. */
    function Spinner() {
      return h('span', { className: 'ghp-spinner', 'aria-hidden': 'true' })
    }

    /** Full-area status block with an optional action. */
    function StatusBlock(props) {
      return h(
        'div',
        { className: 'ghp-status', role: 'status', 'aria-live': 'polite' },
        props.loading ? h(Spinner) : null,
        h('span', { className: 'ghp-status-title' }, props.title),
        props.detail ? h('span', { className: 'ghp-status-detail' }, props.detail) : null,
        props.actionLabel ? h('button', { type: 'button', className: 'ghp-btn', onClick: props.onAction }, props.actionLabel) : null,
      )
    }

    /** CI tone of a list item, or an empty string when it carries no checks. */
    function itemCheckTone(item) {
      if (!item || !item.checks) return ''
      return checkTone(item.checks, null)
    }

    /** Compact state tail of one list row. */
    function RowState(props) {
      const { item, kind, t } = props
      if (kind === 'discussion') {
        const answered = item.answered === true
        return h(
          'span',
          { className: 'ghp-state-badge' + (answered ? ' ghp-state-answered' : '') },
          h('span', { className: 'ghp-dot ghp-dot-' + (answered ? 'answered' : 'unanswered'), 'aria-hidden': 'true' }),
          h('span', null, t(answered ? 'detail.answer' : 'detail.unanswered')),
        )
      }
      return h(StateBadge, { item, t })
    }

    /** A single list row. */
    function ListRow(props) {
      const item = props.item
      const rowRef = useRef(null)
      useEffect(() => {
        if (props.focusOnMount && rowRef.current) rowRef.current.focus()
      }, [props.focusOnMount])
      const stateLabel = props.kind === 'discussion' ? props.t(item.answered ? 'detail.answer' : 'detail.unanswered') : props.t(stateKey(item))
      const ciTone = props.kind === 'pr' ? itemCheckTone(item) : ''
      return h(
        'button',
        {
          type: 'button',
          ref: rowRef,
          className: 'ghp-row',
          'aria-label': (item.title || '(untitled)') + ' · #' + item.number + ' · ' + stateLabel,
          onClick: () => props.onOpen(item),
        },
        h('span', { className: 'ghp-row-icon' }, props.kind === 'pr' ? h(IconPullRequest) : props.kind === 'issue' ? h(IconIssue) : h(IconDiscussion)),
        h(
          'span',
          { className: 'ghp-row-main' },
          h('span', { className: 'ghp-row-title' }, item.title || '(untitled)'),
          h(
            'span',
            { className: 'ghp-row-meta' },
            h('span', { className: 'ghp-row-number' }, '#' + item.number),
            h('span', { className: 'ghp-row-author' }, (item.author && item.author.login) || 'ghost'),
            h('span', { className: 'ghp-row-time' }, relativeTime(item.updatedAt || item.createdAt, props.t)),
            item.comments > 0 ? h('span', { className: 'ghp-row-comments' }, h(IconComment, { size: 12 }), String(item.comments)) : null,
            ciTone ? h('span', { className: 'ghp-dot ghp-ci-dot-' + ciTone, title: props.t(checkKey(item.checks, null)), 'aria-hidden': 'true' }) : null,
          ),
        ),
        h('span', { className: 'ghp-row-tail' }, h(RowState, { item, kind: props.kind, t: props.t })),
      )
    }

    /** The list body for one item family. */
    function ListView(props) {
      const { t, repo, kind, stateFilter, refreshToken } = props
      const list = useItemList(repo, kind, stateFilter, refreshToken || 0)
      const state = list.state
      const scrollRef = props.scrollRef
      const listRef = useRef(null)
      // Restore the list's scroll offset after a detail round-trip; the list is
      // remounted by that navigation, so the offset lives beside the component.
      useEffect(() => {
        const element = listRef.current
        if (element && scrollRef) element.scrollTop = scrollRef.current || 0
      }, [state.status, scrollRef])
      const onScroll = (event) => {
        if (scrollRef) scrollRef.current = event.currentTarget.scrollTop
      }

      if (state.status === 'loading') {
        return h(StatusBlock, { loading: true, title: t('list.loading') })
      }
      if (state.status === 'failed') {
        const info = errorInfo({ reason: state.reason, message: state.message }, t)
        return h(StatusBlock, { title: t('list.error'), detail: info.text, actionLabel: info.retryable ? t('list.retry') : undefined, onAction: list.reload })
      }
      const items = (state.data && state.data.items) || []
      const fetchedAt = state.data && state.data.fetchedAt
      const updated = h(
        'div',
        { className: 'ghp-updated' },
        state.refreshing ? h(Spinner) : null,
        fetchedAt ? h('span', null, t('detail.updatedAtLabel') + ' ' + shortTime(fetchedAt)) : null,
      )
      const emptyKey = (KINDS.find((entry) => entry.id === kind) || KINDS[0]).emptyKey
      if (items.length === 0) {
        return h(
          'div',
          { className: 'ghp-list', ref: listRef, onScroll },
          updated,
          h('div', { className: 'ghp-empty' }, h(IconEmpty, { size: 22 }), h('span', null, t(emptyKey))),
        )
      }
      return h(
        'div',
        { className: 'ghp-list', ref: listRef, onScroll },
        updated,
        items.map((item) => h(ListRow, { key: kind + ':' + item.number, item, kind, t, onOpen: props.onOpen, focusOnMount: props.focusNumber === item.number })),
      )
    }

    // ---------------------------------------------------------------- detail view

    /** Git-commit glyph used by the activity timeline. */
    function IconCommit(props) {
      return h(Glyph, { size: props.size }, h('circle', { cx: 8, cy: 8, r: 2.6 }), h('path', { d: 'M1.8 8h3.4' }), h('path', { d: 'M10.8 8h3.4' }))
    }

    /** Summary key of a pull request's review decision, or an empty string. */
    function reviewDecisionKey(decision) {
      switch (String(decision || '').toUpperCase()) {
        case 'APPROVED':
          return 'review.approved'
        case 'CHANGES_REQUESTED':
          return 'review.changesRequested'
        case 'REVIEW_REQUIRED':
          return 'review.requested'
        default:
          return ''
      }
    }

    /** Summary key of a pull request's merge state, or an empty string. */
    function mergeStateKey(item) {
      if (item.mergeable === 'CONFLICTING') return 'merge.dirty'
      switch (String(item.mergeStateStatus || '').toUpperCase()) {
        case 'CLEAN':
          return 'merge.clean'
        case 'BLOCKED':
          return 'merge.blocked'
        case 'BEHIND':
          return 'merge.behind'
        case 'UNSTABLE':
          return 'merge.unstable'
        case 'DIRTY':
          return 'merge.dirty'
        case 'DRAFT':
          return 'merge.draft'
        default:
          return ''
      }
    }

    /** Roll-up state of a pull request's checks, from the Host summary or the detail list. */
    function checksSummaryState(item) {
      if (item.checksState) return String(item.checksState).toUpperCase()
      const checks = item.checks || []
      if (checks.length === 0) return ''
      let bad = false
      let waiting = false
      for (const check of checks) {
        const tone = checkTone(check.status, check.conclusion)
        if (tone === 'bad') bad = true
        else if (tone === 'wait') waiting = true
      }
      return bad ? 'FAILURE' : waiting ? 'PENDING' : 'SUCCESS'
    }

    /** Summary key of a checks roll-up state, or an empty string. */
    function checksSummaryKey(state) {
      switch (String(state || '').toUpperCase()) {
        case 'SUCCESS':
          return 'checks.passed'
        case 'FAILURE':
        case 'ERROR':
          return 'checks.failed'
        case 'PENDING':
        case 'EXPECTED':
          return 'checks.running'
        default:
          return ''
      }
    }

    /** Format a duration in ms as GitHub's h:mm:ss / m:ss. */
    function formatDuration(ms) {
      if (!Number.isFinite(ms) || ms < 0) return ''
      const totalSeconds = Math.round(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (value) => String(value).padStart(2, '0')
      return hours > 0 ? hours + ':' + pad(minutes) + ':' + pad(seconds) : minutes + ':' + pad(seconds)
    }

    /** One line summary of a markdown body for comment previews. */
    function bodyExcerpt(text, limit) {
      const plain = String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/[#>*_`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      return plain.length > limit ? plain.slice(0, limit) + '…' : plain
    }

    /**
     * Merge commits, comments, reviews, review threads, and the opening event
     * into one chronological activity list.
     * @param {any} item - detail item.
     * @param {string} kind - pr, issue, or discussion.
     * @returns {Array<{ type: string, at: string | null }>} sorted events.
     */
    function buildActivity(item, kind) {
      const events = []
      if (item.createdAt) events.push({ type: 'opened', at: item.createdAt, author: item.author, url: item.url })
      for (const commit of item.commits || []) {
        if (commit && commit.oid) events.push({ type: 'commit', at: commit.committedDate || null, commit })
      }
      for (const comment of item.comments || []) {
        if (comment) events.push({ type: 'comment', at: comment.createdAt || null, comment })
      }
      for (const review of item.reviews || []) {
        if (review && review.submittedAt && review.body && String(review.body).trim() !== '') events.push({ type: 'review', at: review.submittedAt, review })
      }
      for (const thread of item.reviewThreads || []) {
        const first = thread.comments && thread.comments[0]
        if (!first) continue
        events.push({ type: 'thread', at: first.createdAt || null, thread })
      }
      return events.sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')))
    }

    /** Activity scopes shown as a segmented control. */
    const ACTIVITY_SCOPES = [
      { id: 'all', labelKey: 'activity.scope.all' },
      { id: 'unresolved', labelKey: 'activity.scope.unresolved' },
      { id: 'mine', labelKey: 'activity.scope.mine' },
    ]

    /** Activity event types offered in the filter menu. */
    const ACTIVITY_TYPES = [
      { id: 'opened', labelKey: 'activity.type.opened' },
      { id: 'commit', labelKey: 'activity.type.commit' },
      { id: 'comment', labelKey: 'activity.type.comment' },
      { id: 'review', labelKey: 'activity.type.review' },
      { id: 'thread', labelKey: 'activity.type.thread' },
    ]

    /** Sort orders for the activity list. */
    const ACTIVITY_SORTS = [
      { id: 'newest', labelKey: 'activity.sort.newest' },
      { id: 'oldest', labelKey: 'activity.sort.oldest' },
    ]

    /** Author of one activity event, used for filtering and quote metadata. */
    function activityAuthor(event) {
      if (event.author) return event.author
      if (event.comment) return event.comment.author
      if (event.review) return event.review.author
      if (event.thread && event.thread.comments && event.thread.comments[0]) return event.thread.comments[0].author
      return null
    }

    /** Author login of one activity event, or an empty string when it has none. */
    function activityLogin(event) {
      const author = activityAuthor(event)
      return author && typeof author.login === 'string' ? author.login : ''
    }

    /** Toggle one id in a hidden-ids map and return a new map. */
    function toggleHiddenId(hidden, id) {
      const next = { ...hidden }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    }

    /**
     * Unique authors of the given activity events.
     * @param {any[]} events - events returned by `buildActivity`.
     * @returns {{ login: string, avatarUrl?: string, isBot: boolean }[]} humans first, then bots, each group alphabetical.
     */
    function collectActivityAuthors(events) {
      const authors = []
      const seen = {}
      for (const event of events) {
        const login = activityLogin(event)
        if (!login || seen[login]) continue
        seen[login] = true
        const author = activityAuthor(event) || {}
        authors.push({ login, avatarUrl: author.avatarUrl, isBot: author.isBot === true || /\[bot\]$/i.test(login) })
      }
      authors.sort((left, right) => (left.isBot === right.isBot ? left.login.localeCompare(right.login) : left.isBot ? 1 : -1))
      return authors
    }

    /**
     * Apply the scope, type, author, and sort choices to activity events.
     * @param {any[]} events - events returned by `buildActivity`.
     * @param {{ scope: string, sort: string, hiddenTypes: Record<string, boolean>, hiddenAuthors: Record<string, boolean>, viewer: string }} options - current choices.
     * @returns {any[]} the visible events in display order.
     */
    function selectActivity(events, options) {
      const scoped = events.filter((event) => {
        if (options.scope === 'unresolved') return event.type === 'thread' && !event.thread.isResolved
        if (options.scope === 'mine') return options.viewer !== '' && activityLogin(event) === options.viewer
        return true
      })
      const visible = scoped.filter((event) => {
        if (options.hiddenTypes[event.type]) return false
        const login = activityLogin(event)
        return !login || !options.hiddenAuthors[login]
      })
      if (options.sort === 'newest') visible.reverse()
      return visible
    }

    /** Review glyph: a speech bubble with a check. */
    function IconReview(props) {
      return h(Glyph, { size: props.size }, h('path', { d: 'M2.6 3.4h10.8v6.6H7.2L4.2 12.8V10H2.6Z' }), h('path', { d: 'M5.6 6.2 7 7.6l3.2-3' }))
    }

    /** The "opened this pull request" row, linked to its GitHub page. */
    function OpenedRow(props) {
      const kindKey = props.kind === 'issue' ? 'activity.opened.issue' : props.kind === 'discussion' ? 'activity.opened.discussion' : 'activity.opened.pr'
      const url = typeof props.url === 'string' && isSafeUrl(props.url) ? props.url : ''
      const kindIcon = props.kind === 'issue' ? IconIssue : props.kind === 'discussion' ? IconDiscussion : IconPullRequest
      const content = [
        h('span', { key: 'chip', className: 'ghp-act-chip ghp-act-chip-open' }, h(kindIcon, { size: 13 })),
        props.author ? h(Avatar, { key: 'avatar', author: props.author, size: 18 }) : null,
        h('span', { key: 'text', className: 'ghp-act-text' }, h('strong', null, (props.author && props.author.login) || 'ghost'), ' ', props.t(kindKey)),
        h('span', { key: 'time', className: 'ghp-act-time' }, relativeTime(props.at, props.t)),
      ]
      if (!url) return h('div', { className: 'ghp-act-row ghp-act-opened' }, content)
      return h('a', { className: 'ghp-act-row ghp-act-opened ghp-act-link-row', href: url, target: '_blank', rel: 'noreferrer noopener' }, content)
    }

    /** One activity entry: opened, commit, comment, review, or review thread. */
    function ActivityEvent(props) {
      const { event, t } = props
      if (event.type === 'opened') return h(OpenedRow, { author: event.author, at: event.at, kind: props.kind, t, url: event.url })
      if (event.type === 'commit') {
        const commit = event.commit
        const url = typeof commit.url === 'string' && isSafeUrl(commit.url) ? commit.url : ''
        const content = [
          h('span', { key: 'chip', className: 'ghp-act-chip' }, h(IconCommit, { size: 13 })),
          h('code', { key: 'oid', className: 'ghp-commit-oid' }, String(commit.oid).slice(0, 7)),
          h('span', { key: 'subject', className: 'ghp-act-commit-subject' }, commit.messageHeadline || ''),
          h('span', { key: 'time', className: 'ghp-act-time' }, relativeTime(event.at, t)),
        ]
        if (!url) return h('div', { className: 'ghp-act-row ghp-act-commit' }, content)
        return h('a', { className: 'ghp-act-row ghp-act-commit ghp-act-link-row', href: url, target: '_blank', rel: 'noreferrer noopener' }, content)
      }
      if (event.type === 'comment') {
        const comment = event.comment
        return h(
          'div',
          { className: 'ghp-act-card ghp-act-card-comment' },
          h(
            'div',
            { className: 'ghp-act-card-head' },
            h('span', { className: 'ghp-act-chip ghp-act-chip-comment' }, h(IconComment, { size: 13 })),
            comment.author ? h(Avatar, { author: comment.author, size: 20 }) : null,
            h('span', { className: 'ghp-act-author' }, (comment.author && comment.author.login) || 'ghost'),
            h('span', { className: 'ghp-act-time' }, relativeTime(event.at, t)),
            h(CommentActions, { t, actions: props.actions, url: comment.url, quoteText: comment.body, quoteMeta: comment.author && comment.author.login ? '@' + comment.author.login : '' }),
          ),
          h('div', { className: 'ghp-act-card-body' }, h(HtmlBody, { html: comment.bodyHtml, text: comment.body || '', t })),
        )
      }
      if (event.type === 'review') {
        const review = event.review
        return h(
          'div',
          { className: 'ghp-act-card ghp-act-card-review' },
          h(
            'div',
            { className: 'ghp-act-card-head' },
            h('span', { className: 'ghp-act-chip ' + reviewChipClass(review.state) }, h(IconReview, { size: 13 })),
            review.author ? h(Avatar, { author: review.author, size: 20 }) : null,
            h('span', { className: 'ghp-act-author' }, (review.author && review.author.login) || 'ghost'),
            h('span', { className: 'ghp-review-badge ghp-review-' + String(review.state || '').toLowerCase() }, t(reviewKey(review.state))),
            h('span', { className: 'ghp-act-time' }, relativeTime(event.at, t)),
            h(CommentActions, { t, actions: props.actions, url: review.url, quoteText: review.body, quoteMeta: review.author && review.author.login ? '@' + review.author.login : '' }),
          ),
          h('div', { className: 'ghp-act-card-body' }, h(HtmlBody, { html: review.bodyHtml, text: review.body || '', t })),
        )
      }
      const thread = event.thread
      const first = thread.comments[0]
      const threadLocation = thread.path ? thread.path + (thread.line ? ':' + thread.line : '') : ''
      return h(
        'div',
        { className: 'ghp-act-card ghp-act-thread' },
        h(
          'div',
          { className: 'ghp-act-card-head' },
          h('span', { className: 'ghp-act-chip ghp-act-chip-thread' }, h(IconComment, { size: 13 })),
          first.author ? h(Avatar, { author: first.author, size: 20 }) : null,
          h('span', { className: 'ghp-act-author' }, (first.author && first.author.login) || 'ghost'),
          h('span', { className: 'ghp-act-time' }, relativeTime(event.at, t)),
          h(CommentActions, { t, actions: props.actions, url: first.url, quoteText: first.body, quoteMeta: first.author && first.author.login ? '@' + first.author.login : '' }),
        ),
        h(
          'div',
          { className: 'ghp-act-card-body' },
          threadLocation || thread.isResolved
            ? h(
                'div',
                { className: 'ghp-thread-meta' },
                threadLocation ? h('span', { className: 'ghp-thread-file' }, threadLocation) : null,
                thread.isResolved ? h('span', { className: 'ghp-thread-resolved' }, t('activity.resolved')) : null,
              )
            : null,
          thread.comments.map((comment, index) =>
            h(
              'div',
              { key: index, className: 'ghp-thread-comment' },
              h(
                'div',
                { className: 'ghp-thread-comment-head' },
                h(Avatar, { author: comment.author || {}, size: 16 }),
                h('span', { className: 'ghp-act-author' }, (comment.author && comment.author.login) || 'ghost'),
                h('span', { className: 'ghp-act-time' }, relativeTime(comment.createdAt, t)),
                h(CommentActions, { t, actions: props.actions, url: comment.url, quoteText: comment.body, quoteMeta: comment.author && comment.author.login ? '@' + comment.author.login : '' }),
              ),
              h(HtmlBody, { html: comment.bodyHtml, text: comment.body || '', t }),
            ),
          ),
        ),
      )
    }

    /** The Activity section of a summary view: scope segments, type/author filter, and sort. */
    function ActivitySection(props) {
      const t = props.t
      const viewer = typeof props.viewer === 'string' ? props.viewer : ''
      const [scope, setScope] = useState('all')
      const [sort, setSort] = useState('oldest')
      const [hiddenTypes, setHiddenTypes] = useState({})
      const [hiddenAuthors, setHiddenAuthors] = useState({})
      const [menu, setMenu] = useState('')
      const filterRef = useRef(null)
      const sortRef = useRef(null)
      const filterDropUp = useDropUp(menu === 'filter', filterRef)
      const sortDropUp = useDropUp(menu === 'sort', sortRef)
      useEffect(() => {
        if (!menu) return undefined
        const close = (event) => {
          const node = event.target
          if (filterRef.current && filterRef.current.contains(node)) return
          if (sortRef.current && sortRef.current.contains(node)) return
          setMenu('')
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
      }, [menu])

      const allEvents = buildActivity(props.item, props.kind)
      const authors = collectActivityAuthors(allEvents)
      const typeCounts = {}
      for (const event of allEvents) typeCounts[event.type] = (typeCounts[event.type] || 0) + 1
      const events = selectActivity(allEvents, { scope, sort, hiddenTypes, hiddenAuthors, viewer })
      const hiddenTypeCount = ACTIVITY_TYPES.filter((entry) => hiddenTypes[entry.id]).length
      const hiddenAuthorCount = authors.filter((author) => hiddenAuthors[author.login]).length
      const hasFilters = hiddenTypeCount > 0 || hiddenAuthorCount > 0
      const emptyKey = scope === 'unresolved' ? 'activity.noUnresolved' : scope === 'mine' ? 'activity.noMine' : hasFilters ? 'activity.noFiltered' : 'detail.noActivity'
      const sortLabel = t((ACTIVITY_SORTS.find((entry) => entry.id === sort) || ACTIVITY_SORTS[1]).labelKey)
      const resetFilters = () => {
        setHiddenTypes({})
        setHiddenAuthors({})
      }
      const toggleAllAuthors = () => {
        setHiddenAuthors((current) => (authors.every((author) => !current[author.login]) ? Object.fromEntries(authors.map((author) => [author.login, true])) : {}))
      }
      const scopeButtons = ACTIVITY_SCOPES.filter((entry) => (entry.id !== 'mine' || viewer !== '') && (entry.id !== 'unresolved' || props.kind === 'pr')).map((entry) =>
        h(
          'button',
          {
            key: entry.id,
            type: 'button',
            className: 'ghp-seg-btn' + (scope === entry.id ? ' ghp-seg-btn-active' : ''),
            'aria-pressed': scope === entry.id,
            onClick: () => setScope(entry.id),
          },
          t(entry.labelKey),
        ),
      )
      return h(
        'section',
        { className: 'ghp-activity' },
        h(
          'div',
          { className: 'ghp-activity-head' },
          h('span', { className: 'ghp-activity-title' }, t('activity.title')),
          h(
            'div',
            { className: 'ghp-activity-tools' },
            h('div', { className: 'ghp-seg', role: 'group', 'aria-label': t('activity.scopeAria') }, scopeButtons),
            h(
              'span',
              { className: 'ghp-act-filter', ref: filterRef },
              h(
                'button',
                {
                  type: 'button',
                  className: 'ghp-tool-btn',
                  'aria-haspopup': 'menu',
                  'aria-expanded': menu === 'filter',
                  title: t('activity.filter'),
                  'aria-label': t('activity.filter'),
                  onClick: () => setMenu((current) => (current === 'filter' ? '' : 'filter')),
                },
                h(IconFilter),
                hasFilters ? h('span', { className: 'ghp-tool-dot', 'aria-hidden': 'true' }) : null,
              ),
              menu === 'filter'
                ? h(
                    'span',
                    { className: 'ghp-menu ghp-menu-panel' + (filterDropUp ? ' ghp-menu-up' : ''), role: 'menu', 'aria-label': t('activity.filter') },
                    h('span', { className: 'ghp-menu-section' }, t('activity.filter.types')),
                    ACTIVITY_TYPES.map((entry) => {
                      const checked = !hiddenTypes[entry.id]
                      return h(
                        'button',
                        {
                          key: 'type:' + entry.id,
                          type: 'button',
                          className: 'ghp-menu-item' + (checked ? '' : ' ghp-menu-item-off'),
                          role: 'menuitemcheckbox',
                          'aria-checked': checked,
                          onClick: () => setHiddenTypes((current) => toggleHiddenId(current, entry.id)),
                        },
                        h('span', { className: 'ghp-menu-check-cell' }, checked ? '✓' : ''),
                        h('span', { className: 'ghp-menu-item-label' }, t(entry.labelKey)),
                        h('span', { className: 'ghp-menu-item-count' }, typeCounts[entry.id] || 0),
                      )
                    }),
                    authors.length > 0 ? h('span', { className: 'ghp-menu-section' }, t('activity.filter.authors')) : null,
                    authors.length > 0
                      ? h(
                          'button',
                          {
                            type: 'button',
                            className: 'ghp-menu-item' + (hiddenAuthorCount === 0 ? '' : ' ghp-menu-item-off'),
                            role: 'menuitemcheckbox',
                            'aria-checked': hiddenAuthorCount === 0,
                            onClick: toggleAllAuthors,
                          },
                          h('span', { className: 'ghp-menu-check-cell' }, hiddenAuthorCount === 0 ? '✓' : ''),
                          h('span', { className: 'ghp-menu-item-label' }, t('activity.filter.allAuthors')),
                        )
                      : null,
                    authors.map((author) => {
                      const checked = !hiddenAuthors[author.login]
                      return h(
                        'button',
                        {
                          key: 'author:' + author.login,
                          type: 'button',
                          className: 'ghp-menu-item' + (checked ? '' : ' ghp-menu-item-off'),
                          role: 'menuitemcheckbox',
                          'aria-checked': checked,
                          title: author.login,
                          onClick: () => setHiddenAuthors((current) => toggleHiddenId(current, author.login)),
                        },
                        h('span', { className: 'ghp-menu-check-cell' }, checked ? '✓' : ''),
                        h(Avatar, { author, size: 16 }),
                        h('span', { className: 'ghp-menu-item-label' }, author.login),
                      )
                    }),
                    hasFilters
                      ? h('button', { type: 'button', className: 'ghp-menu-item ghp-menu-reset', onClick: resetFilters }, h(IconRefresh, { size: 13 }), h('span', { className: 'ghp-menu-item-label' }, t('activity.filter.reset')))
                      : null,
                  )
                : null,
            ),
            h(
              'span',
              { className: 'ghp-act-filter', ref: sortRef },
              h(
                'button',
                {
                  type: 'button',
                  className: 'ghp-tool-btn',
                  'aria-haspopup': 'menu',
                  'aria-expanded': menu === 'sort',
                  title: t('activity.sort') + ' · ' + sortLabel,
                  'aria-label': t('activity.sort') + ' · ' + sortLabel,
                  onClick: () => setMenu((current) => (current === 'sort' ? '' : 'sort')),
                },
                h(IconSort),
              ),
              menu === 'sort'
                ? h(
                    'span',
                    { className: 'ghp-menu' + (sortDropUp ? ' ghp-menu-up' : ''), role: 'menu', 'aria-label': t('activity.sort') },
                    ACTIVITY_SORTS.map((entry) =>
                      h(
                        'button',
                        {
                          key: entry.id,
                          type: 'button',
                          className: 'ghp-menu-item' + (sort === entry.id ? ' ghp-menu-item-active' : ''),
                          role: 'menuitemradio',
                          'aria-checked': sort === entry.id,
                          onClick: () => {
                            setSort(entry.id)
                            setMenu('')
                          },
                        },
                        h('span', { className: 'ghp-menu-item-label' }, t(entry.labelKey)),
                        sort === entry.id ? h('span', { className: 'ghp-menu-check' }, '✓') : null,
                      ),
                    ),
                  )
                : null,
            ),
          ),
        ),
        events.length === 0
          ? h('div', { className: 'ghp-muted' }, t(emptyKey))
          : h('div', { className: 'ghp-activity-events' }, events.map((event, index) => h(ActivityEvent, { key: index, event, kind: props.kind, t }))),
      )
    }

    /** One collapsible sidebar section with a heading, optional count, and children. */
    function SideSection(props) {
      const [open, setOpen] = useState(props.defaultOpen !== false)
      const collapsible = props.collapsible !== false
      return h(
        'section',
        { className: 'ghp-side' + (open ? '' : ' ghp-side-closed') },
        h(
          'button',
          {
            type: 'button',
            className: 'ghp-side-head',
            'aria-expanded': open,
            'aria-label': props.title,
            onClick: () => collapsible && setOpen((value) => !value),
          },
          collapsible ? h(IconChevron, { open }) : null,
          h('span', { className: 'ghp-side-title' }, props.title),
          props.count !== undefined && props.count !== null ? h('span', { className: 'ghp-side-count' }, props.count) : null,
          props.action || null,
        ),
        open ? h('div', { className: 'ghp-side-body' }, props.children) : null,
      )
    }

    /** Reviewers with their latest states and outstanding requests. */
    function ReviewerList(props) {
      const item = props.item
      const reviewers = item.reviewers || []
      const requested = item.reviewRequests || []
      if (reviewers.length === 0 && requested.length === 0) return h('div', { className: 'ghp-muted' }, props.t('detail.noReviewers'))
      return h(
        'div',
        { className: 'ghp-people' },
        reviewers.map((person) =>
          h(
            'div',
            { key: 'r:' + person.login, className: 'ghp-person' },
            h(Avatar, { author: person, size: 18 }),
            h('span', { className: 'ghp-person-name' }, person.login),
            h('span', { className: 'ghp-review-state ghp-review-' + String(person.state || '').toLowerCase() }, props.t(reviewKey(person.state))),
          ),
        ),
        requested.map((person) =>
          h(
            'div',
            { key: 'q:' + (person.login || person.name), className: 'ghp-person' },
            h(Avatar, { author: person, size: 18 }),
            h('span', { className: 'ghp-person-name' }, person.login || person.name),
            h('span', { className: 'ghp-review-state ghp-review-requested' }, props.t('review.requested')),
          ),
        ),
      )
    }

    /** One checks row with its state, optional duration, and an external link. */
    function CheckRow(props) {
      const check = props.check
      const tone = checkTone(check.status, check.conclusion)
      const label = props.t(checkKey(check.status, check.conclusion))
      const duration = formatDuration(check.durationMs)
      return h(
        'div',
        { className: 'ghp-check' },
        h('span', { className: 'ghp-dot ghp-check-dot-' + tone, 'aria-hidden': 'true' }),
        h(
          'span',
          { className: 'ghp-check-name' },
          check.detailsUrl && isSafeUrl(check.detailsUrl)
            ? h('a', { className: 'ghp-link', href: check.detailsUrl, target: '_blank', rel: 'noreferrer noopener' }, check.name || 'check')
            : check.name || 'check',
        ),
        h('span', { className: 'ghp-check-state' }, duration || label),
      )
    }

    /** Sidebar checks section: roll-up summary plus every row. */
    function ChecksSide(props) {
      const item = props.item
      const checks = item.checks || []
      const summaryKey = checksSummaryKey(checksSummaryState(item))
      return h(
        SideSection,
        { title: props.t('side.checks'), count: checks.length > 0 ? checks.length : null },
        summaryKey ? h('div', { className: 'ghp-check-summary ghp-check-summary-' + (summaryKey === 'checks.failed' ? 'bad' : summaryKey === 'checks.running' ? 'wait' : 'ok') }, props.t(summaryKey)) : null,
        checks.length === 0
          ? h('div', { className: 'ghp-muted' }, props.t('detail.noChecks'))
          : h('div', { className: 'ghp-checks' }, checks.map((check, index) => h(CheckRow, { key: index, check, t: props.t }))),
      )
    }

    /** Sidebar comments preview: latest comments and reviews. */
    function CommentsSide(props) {
      const item = props.item
      const entries = []
      for (const comment of item.comments || []) entries.push({ at: comment.createdAt, author: comment.author, body: comment.body })
      for (const review of item.reviews || []) entries.push({ at: review.submittedAt, author: review.author, body: review.body })
      for (const thread of item.reviewThreads || []) {
        for (const comment of thread.comments || []) entries.push({ at: comment.createdAt, author: comment.author, body: comment.body })
      }
      entries.sort((left, right) => String(right.at || '').localeCompare(String(left.at || '')))
      const latest = entries.slice(0, 4)
      return h(
        SideSection,
        { title: props.t('side.comments'), count: entries.length },
        entries.length === 0
          ? h('div', { className: 'ghp-muted' }, props.t('detail.noComments'))
          : h(
              'div',
              { className: 'ghp-side-comments' },
              latest.map((entry, index) =>
                h(
                  'div',
                  { key: index, className: 'ghp-side-comment' },
                  h(Avatar, { author: entry.author, size: 16 }),
                  h('span', { className: 'ghp-side-comment-text' }, bodyExcerpt(entry.body, 64) || props.t('detail.noBody')),
                ),
              ),
            ),
      )
    }

    /** Sidebar files section: counts plus the first few paths. */
    function FilesSide(props) {
      const files = props.item.files || []
      if (files.length === 0) {
        return h(SideSection, { title: props.t('side.files'), count: 0 }, h('div', { className: 'ghp-muted' }, props.t('detail.noFiles')))
      }
      return h(
        SideSection,
        { title: props.t('side.files'), count: files.length },
        h(
          'div',
          { className: 'ghp-files' },
          files.slice(0, 5).map((file) => h('div', { key: file.path, className: 'ghp-file' }, h('span', { className: 'ghp-file-path' }, file.path), h('span', { className: 'ghp-add' }, '+' + (file.additions || 0)), h('span', { className: 'ghp-del' }, '−' + (file.deletions || 0)))),
        ),
        files.length > 5 ? h('div', { className: 'ghp-side-more' }, files.length - 5) : null,
      )
    }

    /** Sidebar commits section: counts plus the newest few subjects. */
    function CommitsSide(props) {
      const commits = props.item.commits || []
      if (commits.length === 0) {
        return h(SideSection, { title: props.t('side.commits'), count: 0 }, h('div', { className: 'ghp-muted' }, props.t('detail.noCommits')))
      }
      return h(
        SideSection,
        { title: props.t('side.commits'), count: commits.length },
        h(
          'div',
          { className: 'ghp-commits' },
          commits.slice(0, 4).map((commit) =>
            h(
              'div',
              { key: commit.oid, className: 'ghp-commit' },
              h('code', { className: 'ghp-commit-oid' }, String(commit.oid || '').slice(0, 7)),
              h('span', { className: 'ghp-commit-subject' }, commit.messageHeadline || ''),
            ),
          ),
        ),
      )
    }

    /** Labels + assignees + state reason for an issue or discussion. */
    function IssueSide(props) {
      const item = props.item
      return h(
        'div',
        null,
        (item.labels || []).length > 0
          ? h(SideSection, { title: props.t('side.labels') }, h('div', { className: 'ghp-labels' }, item.labels.map((label) => h(LabelChip, { key: label.name, label }))))
          : null,
        (item.assignees || []).length > 0
          ? h(
              SideSection,
              { title: props.t('side.assignees') },
              h('div', { className: 'ghp-people' }, item.assignees.map((person) => h('div', { key: person.login, className: 'ghp-person' }, h(Avatar, { author: person, size: 18 }), h('span', { className: 'ghp-person-name' }, person.login)))),
            )
          : null,
        props.kind === 'discussion'
          ? h(SideSection, { title: props.t('side.status') }, h('div', { className: 'ghp-side-state' }, props.t(item.answered ? 'detail.answer' : 'detail.unanswered')))
          : item.stateReason
            ? h(SideSection, { title: props.t('side.status') }, h('div', { className: 'ghp-side-state' }, String(item.stateReason).toLowerCase()))
            : null,
      )
    }

    /** Parse a unified diff patch into line rows with line numbers. */
    function parsePatch(patch) {
      const lines = String(patch || '').split('\n')
      const rows = []
      let oldLine = 0
      let newLine = 0
      for (const line of lines) {
        const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
        if (hunk) {
          oldLine = Number(hunk[1])
          newLine = Number(hunk[2])
          rows.push({ type: 'hunk', text: line })
          continue
        }
        if (line.startsWith('+')) {
          rows.push({ type: 'add', newLine: newLine++, text: line.slice(1) })
          continue
        }
        if (line.startsWith('-')) {
          rows.push({ type: 'del', oldLine: oldLine++, text: line.slice(1) })
          continue
        }
        if (line.startsWith('\\')) {
          rows.push({ type: 'meta', text: line })
          continue
        }
        rows.push({ type: 'ctx', oldLine: oldLine++, newLine: newLine++, text: line })
      }
      return rows
    }

    /** Build side-by-side rows from unified diff rows by pairing delete/add runs. */
    function splitDiffRows(rows) {
      const output = []
      let index = 0
      while (index < rows.length) {
        const row = rows[index]
        if (row.type === 'del' || row.type === 'add') {
          const dels = []
          const adds = []
          while (index < rows.length && rows[index].type === 'del') {
            dels.push(rows[index])
            index += 1
          }
          while (index < rows.length && rows[index].type === 'add') {
            adds.push(rows[index])
            index += 1
          }
          const count = Math.max(dels.length, adds.length)
          for (let pair = 0; pair < count; pair += 1) {
            output.push({ type: 'pair', left: dels[pair] || null, right: adds[pair] || null })
          }
          continue
        }
        output.push({ type: 'single', row })
        index += 1
      }
      return output
    }

    /** Review threads of one file, indexed by new-file and old-file line. */
    function diffThreads(threads, path) {
      const byLine = new Map()
      const byOldLine = new Map()
      const fileLevel = []
      for (const thread of threads || []) {
        if (thread.path !== path) continue
        const newLine = thread.line || thread.startLine || null
        const oldLine = thread.originalLine || thread.originalStartLine || null
        if (newLine) {
          const list = byLine.get(newLine) || []
          list.push(thread)
          byLine.set(newLine, list)
        } else if (oldLine) {
          const list = byOldLine.get(oldLine) || []
          list.push(thread)
          byOldLine.set(oldLine, list)
        } else {
          fileLevel.push(thread)
        }
      }
      return { byLine, byOldLine, fileLevel }
    }

    /** Unified diff line. */
    function DiffLine(props) {
      const row = props.row
      return h(
        'div',
        { className: 'ghp-diff-line ghp-diff-line-' + row.type },
        h('span', { className: 'ghp-diff-lineno' }, row.oldLine === undefined ? '' : row.oldLine),
        h('span', { className: 'ghp-diff-lineno' }, row.newLine === undefined ? '' : row.newLine),
        h('span', { className: 'ghp-diff-sign' }, row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '),
        h('span', { className: 'ghp-diff-code' }, row.text),
      )
    }

    /** One side of a split diff row. Tooltips keep long lines readable without horizontal scroll. */
    function SplitCell(props) {
      const row = props.row
      return h(
        'span',
        {
          className: 'ghp-diff-cell' + (props.side === 'old' ? ' ghp-diff-cell-old' : ' ghp-diff-cell-new') + (row ? ' ghp-diff-cell-' + row.type : ' ghp-diff-cell-empty'),
          title: row && row.text ? row.text : undefined,
        },
        h('span', { className: 'ghp-diff-lineno' }, row ? (props.side === 'old' ? row.oldLine === undefined ? '' : row.oldLine : row.newLine === undefined ? '' : row.newLine) : ''),
        h('span', { className: 'ghp-diff-code' }, row ? row.text : ''),
      )
    }

    /** One changed file with its diff and inline review threads. */
    function DiffFile(props) {
      const file = props.file
      const t = props.t
      const open = props.open !== false
      const rows = useMemo(() => parsePatch(file.patch), [file.patch])
      const threads = useMemo(() => diffThreads(props.threads, file.path), [props.threads, file.path])
      const visible = rows.slice(0, 400)
      const inlineFor = (line, oldLine) => {
        const list = []
        if (line) list.push(...(threads.byLine.get(line) || []))
        if (oldLine) list.push(...(threads.byOldLine.get(oldLine) || []))
        return list
      }
      const renderThreads = (list, prefix) => list.map((thread) => h(InlineThread, { key: prefix + thread.id, thread, t, actions: props.actions }))
      let body = null
      if (!file.patch) {
        body = h('div', { className: 'ghp-muted ghp-diff-empty' }, t('diff.noPatch'))
      } else if (props.mode === 'split') {
        body = h(
          'div',
          { className: 'ghp-diff-table ghp-diff-split' },
          renderThreads(threads.fileLevel, 'fl-'),
          splitDiffRows(visible).map((entry, index) => {
            if (entry.type === 'single') {
              const row = entry.row
              if (row.type === 'hunk' || row.type === 'meta') {
                return h('div', { key: index, className: 'ghp-diff-split-meta' }, row.text)
              }
              return h(
                'div',
                { key: index, className: 'ghp-diff-split-row' },
                h(SplitCell, { side: 'old', row }),
                h(SplitCell, { side: 'new', row }),
              )
            }
            const line = entry.right ? entry.right.newLine : null
            const oldLine = entry.left ? entry.left.oldLine : null
            return h(
              'div',
              { key: index, className: 'ghp-diff-split-wrap' },
              h('div', { className: 'ghp-diff-split-row' }, h(SplitCell, { side: 'old', row: entry.left }), h(SplitCell, { side: 'new', row: entry.right })),
              renderThreads(inlineFor(line, oldLine), 'th-'),
            )
          }),
          rows.length > visible.length ? h('div', { className: 'ghp-diff-more' }, t('diff.truncatedPrefix') + visible.length + t('detail.truncatedSuffix')) : null,
        )
      } else {
        body = h(
          'div',
          { className: 'ghp-diff-table' },
          renderThreads(threads.fileLevel, 'fl-'),
          visible.flatMap((row, index) => [
            h(DiffLine, { key: 'l' + index, row }),
            h('div', { key: 'i' + index, className: 'ghp-diff-inline' }, renderThreads(inlineFor(row.newLine, row.oldLine), 'th-' + index + '-')),
          ]),
          rows.length > visible.length ? h('div', { className: 'ghp-diff-more' }, t('diff.truncatedPrefix') + visible.length + t('detail.truncatedSuffix')) : null,
        )
      }
      const threadCount =
        threads.fileLevel.length +
        [...threads.byLine.values()].reduce((sum, list) => sum + list.length, 0) +
        [...threads.byOldLine.values()].reduce((sum, list) => sum + list.length, 0)
      return h(
        'div',
        { className: 'ghp-diff-file' },
        h(
          'button',
          {
            type: 'button',
            className: 'ghp-diff-file-head',
            onClick: () => {
              if (typeof props.onToggle === 'function') props.onToggle()
            },
            'aria-expanded': open,
            title: file.path,
          },
          h('span', { className: 'ghp-diff-chevron' + (open ? ' ghp-diff-chevron-open' : '') }, '▸'),
          h('span', { className: 'ghp-diff-path' }, file.path),
          file.previousPath ? h('span', { className: 'ghp-diff-renamed' }, '← ' + file.previousPath) : null,
          threadCount > 0 ? h('span', { className: 'ghp-diff-thread-count', title: t('diff.comments') }, h(IconComment, { size: 11 }), threadCount + ' ' + t('diff.comments')) : null,
          h('span', { className: 'ghp-diff-counts' }, h('span', { className: 'ghp-add' }, '+' + (file.additions || 0)), h('span', { className: 'ghp-del' }, '−' + (file.deletions || 0))),
        ),
        open ? h('div', { className: 'ghp-diff-body' }, body) : null,
      )
    }

    /** Changes view: changed files, unified/split diff, and inline review threads. */
    function ChangesView(props) {
      const diff = useDiff(props.repo, props.number, props.refreshToken || 0, props.t)
      const [mode, setMode] = useState('unified')
      const [closedFiles, setClosedFiles] = useState({})
      const state = diff.state
      if (state.status === 'loading') return h(StatusBlock, { loading: true, title: props.t('diff.loading') })
      if (state.status === 'failed') {
        const info = errorInfo({ reason: state.reason, message: state.message }, props.t)
        return h(StatusBlock, { title: props.t('diff.error'), detail: info.text, actionLabel: info.retryable ? props.t('list.retry') : undefined, onAction: diff.reload })
      }
      const files = (state.data && state.data.files) || []
      if (files.length === 0) return h(StatusBlock, { title: props.t('diff.empty') })
      const threads = (props.item && props.item.reviewThreads) || []
      const setAllOpen = (open) => setClosedFiles(open ? {} : Object.fromEntries(files.map((file) => [file.path, true])))
      const toggleFile = (file) => setClosedFiles((current) => ({ ...current, [file.path]: !current[file.path] }))
      return h(
        'div',
        { className: 'ghp-changes' },
        h(
          'div',
          { className: 'ghp-changes-head' },
          h('span', { className: 'ghp-changes-title' }, props.t('detail.changedFiles') + ' · ' + files.length),
          h('span', { className: 'ghp-changes-spacer' }),
          h(
            'div',
            { className: 'ghp-changes-actions' },
            h('button', { type: 'button', className: 'ghp-tool-btn', title: props.t('diff.expandAll'), 'aria-label': props.t('diff.expandAll'), onClick: () => setAllOpen(true) }, h(IconExpandAll)),
            h('button', { type: 'button', className: 'ghp-tool-btn', title: props.t('diff.collapseAll'), 'aria-label': props.t('diff.collapseAll'), onClick: () => setAllOpen(false) }, h(IconCollapseAll)),
            h(
              'span',
              { className: 'ghp-seg', role: 'group', 'aria-label': props.t('diff.viewMode') },
              h('button', { type: 'button', className: 'ghp-seg-btn' + (mode === 'unified' ? ' ghp-seg-btn-active' : ''), 'aria-pressed': mode === 'unified', onClick: () => setMode('unified'), title: props.t('diff.viewMode') }, props.t('diff.unified')),
              h('button', { type: 'button', className: 'ghp-seg-btn' + (mode === 'split' ? ' ghp-seg-btn-active' : ''), 'aria-pressed': mode === 'split', onClick: () => setMode('split'), title: props.t('diff.viewMode') }, props.t('diff.split')),
            ),
          ),
        ),
        h(
          'div',
          { className: 'ghp-changes-scroll' },
          state.data.truncated ? h('div', { className: 'ghp-truncated' }, props.t('diff.truncatedFiles')) : null,
          files.map((file) =>
            h(DiffFile, {
              key: file.path,
              file,
              mode,
              t: props.t,
              threads,
              actions: props.actions,
              open: !closedFiles[file.path],
              onToggle: () => toggleFile(file),
            }),
          ),
        ),
      )
    }

    /** Pull request state chips plus the review submission control. */
    function ReviewBar(props) {
      const t = props.t
      const item = props.item
      const [open, setOpen] = useState(false)
      const [event, setEvent] = useState('COMMENT')
      const [body, setBody] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [done, setDone] = useState(false)
      const wrapRef = useRef(null)
      useEffect(() => {
        if (!open) return undefined
        const close = (clicked) => {
          if (wrapRef.current && !wrapRef.current.contains(clicked.target)) setOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
      }, [open])
      const state = stateOf(item)
      const stateLabel = t(stateKey(item))
      const decisionKey = reviewDecisionKey(item.reviewDecision)
      const canReview = item.state === 'OPEN' && item.isDraft !== true
      const submit = () => {
        if ((event === 'REQUEST_CHANGES' || event === 'COMMENT') && body.trim() === '') {
          setError(t('review.requiresBody'))
          return
        }
        setBusy(true)
        setError('')
        postJson('/api/github-panel/review', { repo: props.repo, number: props.number, event, body }).then((payload) => {
          setBusy(false)
          if (payload && payload.ok) {
            setDone(true)
            setOpen(false)
            setBody('')
            if (props.onDone) props.onDone()
            setTimeout(() => setDone(false), 2500)
            return
          }
          const info = errorInfo(payload, t)
          setError(payload && payload.reason === 'not-found' ? t('review.permission') : info.text)
        }).catch(() => {
          setBusy(false)
          setError(t('error.failed'))
        })
      }
      return h(
        'span',
        { className: 'ghp-reviewbar', ref: wrapRef },
        h('span', { className: 'ghp-state-badge ghp-state-' + state }, h('span', { className: 'ghp-dot ghp-dot-' + state, 'aria-hidden': 'true' }), h('span', null, stateLabel)),
        decisionKey ? h('span', { className: 'ghp-fact ghp-fact-review' }, t('review.summary') + ' · ' + t(decisionKey)) : null,
        done ? h('span', { className: 'ghp-review-done', role: 'status' }, t('review.success')) : null,
        canReview
          ? h(
              'button',
              { type: 'button', className: 'ghp-btn ghp-btn-primary', 'aria-haspopup': 'dialog', 'aria-expanded': open, onClick: () => setOpen((value) => !value) },
              h(IconReview, { size: 14 }),
              h('span', null, t('review.action')),
            )
          : null,
        open
          ? h(
              'div',
              { className: 'ghp-review-pop', role: 'dialog', 'aria-label': t('review.action') },
              h(
                'div',
                { className: 'ghp-review-events', role: 'group' },
                [
                  { id: 'APPROVE', key: 'review.approve' },
                  { id: 'REQUEST_CHANGES', key: 'review.requestChanges' },
                  { id: 'COMMENT', key: 'review.comment' },
                ].map((entry) =>
                  h(
                    'button',
                    { key: entry.id, type: 'button', className: 'ghp-seg-btn' + (event === entry.id ? ' ghp-seg-btn-active' : ''), 'aria-pressed': event === entry.id, onClick: () => setEvent(entry.id) },
                    t(entry.key),
                  ),
                ),
              ),
              h('textarea', {
                className: 'ghp-review-body',
                rows: 4,
                placeholder: t('review.placeholder'),
                value: body,
                onChange: (changeEvent) => setBody(changeEvent.target.value),
                'aria-label': t('review.placeholder'),
              }),
              error ? h('div', { className: 'ghp-review-error', role: 'alert' }, error) : null,
              h(
                'div',
                { className: 'ghp-review-actions' },
                h('button', { type: 'button', className: 'ghp-btn', onClick: () => setOpen(false), disabled: busy }, t('review.cancel')),
                h('button', { type: 'button', className: 'ghp-btn ghp-btn-primary', onClick: submit, disabled: busy }, busy ? t('review.submitting') : t('review.submit')),
              ),
            )
          : null,
      )
    }

    /** One detail view for a PR, issue, or discussion: summary or changes. */
    function DetailView(props) {
      const { t, repo, kind, number, refreshToken, viewer } = props
      const [reviewToken, setReviewToken] = useState(0)
      const detail = useItemDetail(repo, kind, number, (refreshToken || 0) + reviewToken)
      const state = detail.state
      const backRef = useRef(null)
      const [view, setView] = useState('summary')
      useEffect(() => {
        if (backRef.current) backRef.current.focus()
      }, [])
      useEffect(() => {
        setView('summary')
      }, [kind, number])

      if (state.status === 'loading') return h(StatusBlock, { loading: true, title: t('list.loading') })
      if (state.status === 'failed') {
        const info = errorInfo({ reason: state.reason, message: state.message }, t)
        return h(StatusBlock, { title: t('list.error'), detail: info.text, actionLabel: info.retryable ? t('list.retry') : undefined, onAction: detail.reload })
      }
      const item = state.data && state.data.item
      if (!item) return h(StatusBlock, { title: t('list.error') })

      const isPr = kind === 'pr'
      const isIssue = kind === 'issue'
      const openUrl = isSafeUrl(item.url) ? item.url : ''
      const fetchedAt = state.data && state.data.fetchedAt
      const changedFiles = Number.isFinite(item.changedFiles) ? item.changedFiles : (item.files || []).length

      return h(
        'div',
        { className: 'ghp-detail' },
        h(
          'div',
          { className: 'ghp-detail-toolbar' },
          h('button', { type: 'button', ref: backRef, className: 'ghp-icon-btn', onClick: props.onBack, title: t('detail.back'), 'aria-label': t('detail.back') }, h(IconBack)),
          h('span', { className: 'ghp-detail-number' }, '#' + item.number),
          isPr
            ? h(
                'div',
                { className: 'ghp-view-tabs' },
                h('button', { type: 'button', className: 'ghp-view-tab' + (view === 'summary' ? ' ghp-view-tab-active' : ''), 'aria-pressed': view === 'summary', onClick: () => setView('summary') }, t('view.summary')),
                h(
                  'button',
                  { type: 'button', className: 'ghp-view-tab' + (view === 'changes' ? ' ghp-view-tab-active' : ''), 'aria-pressed': view === 'changes', onClick: () => setView('changes') },
                  t('view.changes'),
                  h('span', { className: 'ghp-view-count' }, h('span', { className: 'ghp-add' }, '+' + (item.additions || 0)), h('span', { className: 'ghp-del' }, '−' + (item.deletions || 0))),
                ),
              )
            : null,
          h('span', { className: 'ghp-toolbar-spacer' }),
          fetchedAt ? h('span', { className: 'ghp-toolbar-updated', title: shortDate(fetchedAt) }, shortTime(fetchedAt)) : null,
          openUrl ? h('a', { className: 'ghp-icon-btn', href: openUrl, target: '_blank', rel: 'noreferrer noopener', title: t('detail.open'), 'aria-label': t('detail.open') }, h(IconExternal)) : null,
        ),
        isPr
          ? h(
              'div',
              { className: 'ghp-detail-status' },
              h(ReviewBar, { item, t, repo, number, onDone: () => { setReviewToken((value) => value + 1); detail.reload() } }),
            )
          : null,
        view === 'changes' && isPr
          ? h(ChangesView, { repo, number, refreshToken, t, item, actions: props.actions })
          : h(
              'div',
              { className: 'ghp-detail-scroll' },
              h(
                'div',
                { className: 'ghp-summary-grid' },
                h(
                  'div',
                  { className: 'ghp-summary-main' },
                  h(
                    'div',
                    { className: 'ghp-detail-title-row' },
                    h('h2', { className: 'ghp-detail-title' }, item.title),
                    // Pull requests show their state in the top status row, so the
                    // title keeps only the issues / discussions badge.
                    isPr
                      ? null
                      : isIssue
                        ? h(StateBadge, { item, t })
                        : h(
                            'span',
                            { className: 'ghp-state-badge' },
                            h('span', { className: 'ghp-dot ghp-dot-' + (item.answered ? 'answered' : 'unanswered'), 'aria-hidden': 'true' }),
                            h('span', null, t(item.answered ? 'detail.answer' : 'detail.unanswered')),
                          ),
                  ),
                  h(
                    'div',
                    { className: 'ghp-detail-meta' },
                    item.author ? h(Avatar, { author: item.author, size: 20 }) : null,
                    h('span', { className: 'ghp-detail-author' }, (item.author && item.author.login) || 'ghost'),
                    h('span', { className: 'ghp-detail-sep' }, '·'),
                    h('span', { title: shortDate(item.createdAt) }, t('detail.created') + ' ' + relativeTime(item.createdAt, t)),
                    h('span', { className: 'ghp-detail-sep' }, '·'),
                    h('span', { title: shortDate(item.updatedAt) }, t('detail.updated') + ' ' + relativeTime(item.updatedAt, t)),
                    kind === 'discussion' && item.category ? h('span', { className: 'ghp-category' }, (item.category.emoji ? item.category.emoji + ' ' : '') + item.category.name) : null,
                  ),
                  (item.labels || []).length > 0 ? h('div', { className: 'ghp-labels' }, item.labels.map((label) => h(LabelChip, { key: label.name, label }))) : null,
                  isPr
                    ? h(
                        'div',
                        { className: 'ghp-facts' },
                        item.headRefName
                          ? h('span', { className: 'ghp-fact' }, h('code', { className: 'ghp-ref' }, item.headRefName), h('span', { className: 'ghp-arrow' }, '→'), h('code', { className: 'ghp-ref' }, item.baseRefName || 'base'))
                          : null,
                        checksSummaryKey(checksSummaryState(item))
                          ? h('span', { className: 'ghp-fact ghp-fact-' + (checksSummaryKey(checksSummaryState(item)) === 'checks.failed' ? 'bad' : checksSummaryKey(checksSummaryState(item)) === 'checks.running' ? 'wait' : 'ok') }, t('checks.summary') + ' · ' + t(checksSummaryKey(checksSummaryState(item))))
                          : null,
                        reviewDecisionKey(item.reviewDecision) ? h('span', { className: 'ghp-fact' }, t('review.summary') + ' · ' + t(reviewDecisionKey(item.reviewDecision))) : null,
                        mergeStateKey(item) ? h('span', { className: 'ghp-fact ghp-fact-' + (mergeStateKey(item) === 'merge.clean' ? 'ok' : mergeStateKey(item) === 'merge.dirty' ? 'bad' : '') }, t('merge.summary') + ' · ' + t(mergeStateKey(item))) : null,
                      )
                    : null,
                  h('div', { className: 'ghp-body-md' }, item.body || item.bodyHtml ? h(HtmlBody, { html: item.bodyHtml, text: item.body || '', t }) : h('div', { className: 'ghp-muted' }, t('detail.noBody'))),
                  h(ActivitySection, { item, kind, t, actions: props.actions, viewer }),
                ),
                h(
                  'div',
                  { className: 'ghp-summary-side' },
                  isPr
                    ? h(
                        'div',
                        null,
                        h(SideSection, { title: t('side.reviewers'), count: (item.reviewers || []).length + (item.reviewRequests || []).length }, h(ReviewerList, { item, t })),
                        h(ChecksSide, { item, t }),
                        h(FilesSide, { item, t }),
                        h(CommitsSide, { item, t }),
                        h(CommentsSide, { item, t }),
                      )
                    : h(IssueSide, { item, kind, t }),
                ),
              ),
            ),
      )
    }

    // ---------------------------------------------------------------- workbench

    /** Fallback translate: shows the key instead of crashing when the seat did not inject copy. */
    function fallbackTranslate(key) {
      return key
    }

    /** Fallback session selector hook for hosts that do not inject `useSessions`. */
    function fallbackUseSessions() {
      return undefined
    }

    /** Fallback tab-info hook for hosts that do not inject `useTabInfo`. */
    function fallbackUseTabInfo() {
      return null
    }

    /** The workbench panel: repository header, family tabs, list/detail. */
    function WorkbenchBody(props) {
      const { sessionId } = props
      const t = props.t || fallbackTranslate
      const useSessions = props.useSessions || fallbackUseSessions
      const useTabInfo = props.useTabInfo || fallbackUseTabInfo
      const cwd = useSessions((sessions) => {
        const entry = sessions && sessions.byId ? sessions.byId[sessionId] : undefined
        return entry ? entry.cwd : undefined
      })
      const repository = useRepository(cwd)
      const [kind, setKind] = useState('pr')
      const [stateFilter, setStateFilter] = useState('open')
      const [selected, setSelected] = useState(null)
      const [refreshToken, setRefreshToken] = useState(0)
      const [focusNumber, setFocusNumber] = useState(null)
      const listScrollRef = useRef(0)

      const reload = repository.reload
      const reloadAll = useCallback(() => {
        reload()
        setRefreshToken((value) => value + 1)
      }, [reload])
      const reloadRef = useRef(reloadAll)
      reloadRef.current = reloadAll

      // The right Sidebar's page-refresh command refreshes this page too.
      const tabInfo = useTabInfo()
      const tabId = tabInfo && tabInfo.tab ? tabInfo.tab.id : null
      useEffect(() => {
        if (!tabInfo || !tabInfo.tab || !tabInfo.tab.actions) return undefined
        return tabInfo.tab.actions.bindCommands({ refresh: () => reloadRef.current() })
      }, [tabId])

      const repo = repository.state.status === 'ready' ? repository.state.data.repo : null
      const repoLabel = repo ? repo.owner + '/' + repo.name : ''
      const viewer = repository.state.status === 'ready' ? repository.state.data.viewer : null
      const refreshing = refreshToken > 0

      if (repository.state.status === 'loading') {
        return h(StatusBlock, { loading: true, title: t('repo.loading') })
      }
      if (!cwd) {
        return h(StatusBlock, { title: t('repo.noWorkspace') })
      }
      if (repository.state.status === 'failed') {
        const info = errorInfo({ reason: repository.state.reason, message: repository.state.message }, t)
        return h(StatusBlock, { title: t('repo.error'), detail: info.text, actionLabel: info.retryable ? t('repo.retry') : undefined, onAction: repository.reload })
      }
      if (!repo) {
        return h(StatusBlock, { title: t('repo.error') })
      }

      const supportsFilter = kind !== 'discussion'
      const openItem = (item) => {
        setFocusNumber(null)
        setSelected({ kind, number: item.number })
      }
      const closeDetail = () => {
        setFocusNumber(selected ? selected.number : null)
        setSelected(null)
      }

      return h(
        'div',
        { className: 'ghp-root' },
        h(
          'div',
          { className: 'ghp-head' },
          h('div', { className: 'ghp-head-repo' }, h(GitHubGlyph, { size: 14 }), h('span', { className: 'ghp-head-name', title: repoLabel }, repoLabel)),
          viewer ? h('span', { className: 'ghp-head-viewer', title: t('list.viewer') + ' @' + viewer }, '@' + viewer) : null,
          h(
            'div',
            { className: 'ghp-head-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'ghp-icon-btn',
                title: t('repo.refresh'),
                'aria-label': t('repo.refresh'),
                'aria-busy': refreshing ? 'true' : undefined,
                onClick: reloadAll,
              },
              h(IconRefresh),
            ),
          ),
        ),
        h(
          'div',
          { className: 'ghp-tabs' },
          KINDS.map((entry) =>
            h(
              'button',
              {
                key: entry.id,
                type: 'button',
                'aria-pressed': entry.id === kind,
                className: 'ghp-tab' + (entry.id === kind ? ' ghp-tab-active' : ''),
                onClick: () => {
                  setKind(entry.id)
                  setSelected(null)
                  setFocusNumber(null)
                  listScrollRef.current = 0
                },
              },
              entry.id === 'pr' ? h(IconPullRequest, { size: 13 }) : entry.id === 'issue' ? h(IconIssue, { size: 13 }) : h(IconDiscussion, { size: 13 }),
              h('span', null, t(entry.labelKey)),
            ),
          ),
          h('span', { className: 'ghp-tabs-spacer' }),
          supportsFilter
            ? h(
                'select',
                {
                  className: 'ghp-select',
                  value: stateFilter,
                  'aria-label': t('filter.state'),
                  onChange: (event) => {
                    setStateFilter(event.target.value)
                    setSelected(null)
                    setFocusNumber(null)
                    listScrollRef.current = 0
                  },
                },
                STATE_FILTERS.map((filter) => h('option', { key: filter.id, value: filter.id }, t(filter.labelKey))),
              )
            : null,
        ),
        h(
          'div',
          { className: 'ghp-panel' },
          selected
            ? h(DetailView, { repo: repoLabel, kind: selected.kind, number: selected.number, refreshToken, t, viewer, actions: props.inputActions || null, onBack: closeDetail })
            : h(ListView, { repo: repoLabel, kind, stateFilter, refreshToken, focusNumber, t, onOpen: openItem, scrollRef: listScrollRef }),
        ),
      )
    }

    /** Conversation header trigger that opens (and focuses) the workbench tab. */
    function HeaderTrigger(props) {
      const t = props.t || fallbackTranslate
      const open = props.open || (() => {})
      return h(
        'button',
        {
          type: 'button',
          className: 'ghp-header-trigger',
          title: t('header.open'),
          'aria-label': t('header.open'),
          onClick: () => open(),
        },
        h(GitHubGlyph, { size: 15 }),
      )
    }

    // ---------------------------------------------------------------- styles

    /** Stylesheet: only theme tokens plus neutral fallbacks, scoped to `ghp-` classes. */
    const CSS = `
/* Bundled open-source fonts (SIL OFL 1.1, latin subsets only):
 * - Inter (c) The Inter Project Authors - https://github.com/rsms/inter
 * - JetBrains Mono (c) JetBrains s.r.o. - https://github.com/JetBrains/JetBrainsMono
 * CJK text falls back to the host UI font, which keeps the bundle small. */
@font-face{font-family:"Inter";font-style:normal;font-weight:400 600;font-display:swap;src:url(data:font/woff2;base64,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) format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:400 700;font-display:swap;src:url(data:font/woff2;base64,d09GMgABAAAAAHrIABMAAAABMsAAAHpaAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGoE4G4caHIGacgZgP1NUQVSBICceAIUiL0wRCAqB3DiBrC4LhhYAMIGcXgE2AiQDjBoEIAWHRgejDAwHW1AWcULR644IupPc+VytavGqkJtnyu2QqOHfX9FshNWVxRY42f//n7Z0jIGD3gdgpmZV/TpBzdyUSPfCQt9Ir2775hmlsUTSxUbRuslCDFIc05TjtKQgBSlI4wIDtYvaxD16FRuC4oAZj+oVVHMeW2m0505HxcjigW7E9kRYWCFC63oPDI04NL4riamk4OKb+isfSWG2tC3eT1znEOMX6NlmyljL5xcpKkVQ/n1INxh2cd9nQcNOYdjBamiaU3HQBIvvPvBGptL/1dRtFX65ZsZF7iqpcg03XJu2vHyi/cRUF4GNyxhZJ2nfI8jNZjf5DeELISBiDCHG8BhjBIyIASNGjDTGiJimiIh8Ip+IlCICUsRIET++WuQrIvXwoxw+pZYiRYtIkXIWqSJFRI4ipUgpQgJP/2t93qoHDVTdn7sXGIbtcgBAx47NqIAlF6MAlcyJ3OR4+r+cVr9QpZKlkm3JiQN2Ew4AnGbpSNc5HPfdI1eyy7cjcGZeeggzQEl3u8E9iRtMkqySVTxPf2+e+/54hBKQ0ikaDVi01PFgBCq2DhZuBWOxqn93349u9QWYjDBfXK8oOmBPSi1KLdq7UkzWWGUIkCAv8khCUbfbD1LozJAM2lnlgIf+ey2n3wCNOaVQCs7bQ5kT29NJjuw4LaQFABUAWgR+PvHrdb6/axlm9kjG8PQfoQIsmpfkgmw9sPQwxI7UWK3cAgW5+gx1ALvmJ4D//8Sa6yMVQsVLp+Y3k5m/2G3qpkPapRJ9a27bgA3RnP0PPThI60BpkUBISJAAMdusZJONk8kmQRaSIIESIFiFCvwrpU57VagYtD2hYlDzM6N+9N59Tsyo4u5bBkFx5EEQQwYp1v///OVOaxP9feOtmyuiKNAsxcAT70e792VN2u34QXejDjWGRdNKYl6d9nZbA8qxZZAtyyDHcVpOSv8uRzB9mGiY/zLU1cGfRnz7n4GgdFTAHFHmnasvXezMYinhQqBp07RD237G59eYO0mOhETh7p0wpADllweKSJ3+5/sztX1jAZI4ylWT0vuaZchLOjQ8HLp9X4Y4CUHXRKnbCfB2v2klJidm3bVXVNf6UG7W0DrtbtgtFSrGidjrcb/npbnzx/P+Yl5RLKVoQjIzyUQmJkC7RMDfm2qV/ocGqaao2wKkNeBa8Cw0cwazGyTO+PzM7+4PdPdvgGg0QKoJUhIAUqsmJN00QEoCODNXhOMAILlLcpzGeY73DVAGHAu5HZ6xLhtz3mbrKr8gnPDCy8Kr3LsgSC8Jry5Iz/8ytUy7/3Rr36DZcud4hb2VNeHFDvI+9UH2G9OzADGD5Se6ycV5nvWh7CzOcQkZkCsPOctNArlUSaYokN+3VGnvyIxIfqHgcjOrsW93dUprff+My6k8noSZhxAnAFYYACsBMAQE/v+9+d75slQuPuN4O5MCSSjA8EMQBkNIMfi3pkn1rmqvB4ZhHwUpyni09k9pPIj1Av+2080mifUw99+AIg002pVz8P1ZRF4VP5ffhxLRxohoo621x/Wb7PuXc4auAPrea4eLtEsqVoKEYZqGEIIsQba/n+/v91V9E5DSLvukDSVYioKKzuzj/bfDWOv7QbOao7ftNrc5ZUpKSIKISAjIOO75///Lzagi/gIWxdbm4cQT9OoAQcDKl9zzMDYQVPrpCIdTROR05edU2ORUUjkDBTrVgp06OqdeuDNajDNWovOQQ87DUuW/24mYdSDZnwYEiURROA+gOGcqSnNkoKwjgQCwdzIg10PATCW5dBYgOkAuHHzidPgk8MxfpQXmR3uT44AJEQC4zPifhmGgAoEGESSvXxfOGycD1mcwiG6sCBw9AgB+A+v5J4+3ip/B/mQ/iuVrkRQslglYLcL88tVnVXaMKHmeYU8p+kwEEQCuMRF/5yVw8OWGjAB6quE1vYDxe/CxozHiueL4OYFa1Kybugqg747nBYDgC1mlAZIogMvuwWJBhBNPkKcTmCv90Hc3AGnJ0yQrBAxRXkeE5SHuanh51rZinYiPVogZhFbxBh0AKyoRgffTgfsV8ZknNAMMKPJ9WMUtTgMYi7ZToKcYKrOcyRQyGxhfxp/ZzKiZ7YyO0TNhzD5GFSLTozABCJkQDJoVIWsjVAD8QQ6ydn9hfwAJ06sS8GF3jQDsMQKbgEcSpuzvW670WHTw4iR9Cod+DGVevq58Qmia2/zvyRWe+mq54Dj7uZULFh1q8+eGAClgiODsWJwA7Z785t7YZJDP7TuYAF4fE//3F88CknmzLxZcFYFrJQbMAYjTsYR3EgAMz7/1QoIGE0vWbNiys5gjHr7lRFy5k1hjrXV8+NlEaatt1HbYaRedEKHCRIh2wEEJDjksVboMmbLlOMEg32lnnFeszEWXVKtVp95V19zUpNkd3/lBm3YPderS7ak+/X730it/GDFq3IS/TPvHnIUAcoiMaIiBmMgSWSM24iB7tARxEQ/xkQAJkQtyQ2IkQVLkgbyQDHkjHyRHfkiB/JESBSAVCkRqpEFaFISCkQ7pUQgKRWGogC1bi+2I7VNbn63DFmyzyd1hbbYeEeZvDVB+bOm1pFuqLTPNv5tRcxZ1h2qm6iiH6WNTr6ndFGSykN1uHDY+Mvob5ewX2UbeJA+TSYZ/DQsM1cTPxKdEX7JziEVEPf4n/rW4Yb0VX4wn4k9js9habCkcjsnoZEsojcpRgf6cfq/+WeRz717vcITeE7ob66pkBXVK7YeyNpm3tvBHXHNNcwpuWOMarvqMert6kmpU2Zu4KlxFsyylUfmtR56yWTGh+HRN3xqNAkcF8ufl22V/y77d46vTZc2N9T0imZV+KMmXtkserWqRWCSF4hviBv2z4jzxXPJw8RZ1C8PCfiUMU0PBkDzw3Fnu5L6oz3mM9yw3rCwf5YO6qW74E+9UnQ94JFyXa+TroHY+K8bb/javTWmtVhCbmaa8KWyyGyvh03rGVthcyxbM1nl1ykiaYfPIscv4G2mWHtLdOkSrLpfqV/ctlV4FyjH5TIZJrSwkVFPXBctiq5DFjeUySmM5WeaXaaWQyyzuFfWFplAUHo49eXOuzGUDj6/FklHRJdJF3DDFjXz8zmGezmOuFbA5Nmo9mCmOBL1PGziqj73rmj5yj9Q7ZHbCLtyMa81ijqNtA7rYy0ISWw67Cp6HuZA9bWYza5NuJDBgfd8uWM+gsfwvZ23eemMtjqjxYNfaabDU8npbvpnbyiy5FtetaDPXFFBiPvjueqebh5nTmZOvzFcY08Js5qq5DJc9Y37X78Ltw+AvajyLTsUiEf3ZalmBdDHtxWybSbRgGpk63mWd2UIqk3LvqDp8KHxyz2geEWQVaa4GK4GkIQHxzwwgzHrWd1zoQqcTvAgiggMefO3zl9BBw0YHQeQUAqWOwTAhczJYf5RhZwCB+zmEzu2qQpZuHxTIIxg+OtsjWBDuazegjwEpjrtgH2QBw3ykXJgrdckGyJAYUm8vBTOBeb3eh7J1XDn6XLk6oTzzNgfgD7SCR/D9C1O+DliNBvQeYPCgBQB5ogXny29hu2Cba4ewoLbr8l88ASWiJHQIJaPDKMXLnogkCSbChGAbdPfT/Q5g0EYZ2G+zgrcV4mDIQBvaloBSgJLH9t4wLK5pEIpK3G4E3kwep0KQ/XGm2PPETGX6HPghJ2V9iSrHbj8S3Lw5YjLMDG4hnLzpE4sov2BP3zx+KALwgpiYSZ4F6W/PpwFsbmFAqOb1ogm3feXy9J9IhFDxwmcxfdO8ifDCHc9N9Ho5n37SHpCObOd4PpjQd/UAHJ57ahoQ5lO4xQmYmygNL38PvgpkfZ2c5I+bNWLu7kaO9CrmcX7EMK9iTpe7c6nRzumRd8dsdvm9wFsFXgjV6i7da14Whf2l+unLUOVyqSQ12gI9+lKejX0xyBkV5K7R6UXMivzVWfuiksjVEddoeXLc1b7ymeFRJd9dS0GKtzMd/bMmdG6eT6OF00Aj8zymbZszb0StQ904dk0FrrZGj545ZGlfDnAO01h33V4/y9ZXp1SYZzFVyrWZ1Datlx53bURs/+FfUYFDUTxRco/EPMFk4DRc3DzpZMICvxjxlZkduNlKTArcKJMeYdLlR3H2kYqRkT41Wp0eN1JlZp8ffslG84rC4oEOsxnmQTk2jmMTkccTyv92EYu3n7KUCXeo7uIQ3cN4xsfZd5sHZFh8SyKy9OrRvgHjihHxoaOAIjq5WGzK4MVgNzUokpoa0249JOpi81H+L6MUPBGAnO2LSBbdLHaaHXTeTW53cNWhpwMu7PLUIEDgCUmH6qVR6EmYByRNBS4eDVAM7nIuXU2xsrsuBmYC14sLTkTmMj3aKWHJAYrB5Y7DaEDJ96w2AzhN2Me1zTRGDnMXaxywGOzap0nJfupQXAcNOGugToqLDsc0haYDTe5To6RaEYle6AmTqEoC4aJyBpgDZTjLpgaFyFuiaUA6MVOujdoAOdoMiXUMMAfycmRFFfIWT2AqEEtwwrVNS5Tj8IVY54BzwPY+VojVVCAPAOY7w6dCcg8z3liYAmjYx3DRv0QkTNWTMGpEX6PgD/AeMO70dRJIm9flRgAdovMdkaFZjtbpsNYB3gN6HGQSQYI9xBkCNAjoXdtMy+UwlVjbgO8BoX1gFvYQgIeRzTnVQiDcbcaregMA/n7W415E7aOx0r8/KbvvniPTmqw/pTEqhUjhUial4BCfzJsUEVeSsUTkygQsNE39+MUoINaUgl8ywIiGkOGuimjElXF/lWNG7I+evkq+Ss77z7hyZQZloNchi9Jjv84NM8VG5flh2G5Ujgw9qdEm68rQihLEDRKqFK63KFaK773RrhRX/LhrtBZytB+okA1bw4S0VbDXx0quVaAFLjdir9X5AhrkckUz3qeZAXtlbOkRikx7eVT4uK59uRT31qg2aexDX+b2VORx2dXvyYxHn7K5J3SZrkMdMeYkMvdBurJHRdrNaZum3PA/k0GSUIFkUEM87Uzuv2/rJfUu1OLSzbx7X8Ol3RxfKu9wTK96Me1Txing3RLd38IBUA9OclGBq+nSOd5N9qJutim6eoA1XPDu++wOztmeFB+Hc+Nk5aLRjHfPjMUF2Pf+ro2INE3oSdhLRTedWN6ARkwN/Y2HKIkMLuaUG14RUphxggM2wBhMSfvrOedBDR2qQr/UetTxmdaFDws4S+qv6yYuKVyYwfq8mxik5MIQjB9njSrPPOax4zAR6YyvzKfWjT0FOmA1NsN992w8W1QqCq7NjRlFNdY6YGNMhU3dvrs4BhGRNkX6N9gZRgWu5Z0ALyE2x6pENmGpQDmmkbwJ1AAVMvWY8RuZybHSzzYCRKRVgM7xhqUOe03zh4G7aHtlPUiFgqnwvO7UQMHHajN+3WwY2pLZugYRqc3VOV6fVZeFR3GH9fQIQfx5XDYepm30QqQch862oSFPaV1ha+2VOMOW7bQOL1phWK45mmE4uZnXo9fUptC6Yp02DbCF1aN+kFC9CWEMRKB3VkhIRlkz3g6SZbZwvmBfpMuBuiY6XaV/nvAEEzyVvORE8EcxZ09pMkMM0AYutXq6zTpoYe4fMAChbmDaBsG52RnliNijAIsGMdp9SQJXPs41OLRN50RLrZ/pcM5wBnH/fD6Xdi+u0cToiO8nuLdHcwlaXRMcrpGjglWBDBebcNTKHS6kRi5WhfGH002Dw1FyZMysyHTY0ArSOa6fuVOAUnSPJeM5VQKG6+oqOsJG6utCcwQ9/6o6Y1GHenwct0bQA+OQVOBqO3W1DvSglXrt4iJAl7FS7QA6wPoqdK6rqTSXdUkH7LSZQ4ewxQyqtm5UVHjFdC0luT+YTHOu4LgOFKEWKaLzHcX+mG3G+0azDzXAFl+hyKQeUeGDvhkd8VlCRaiivtepItrFqg7e36ls2pHV+TBexdkdpRPvuFg1tVIpxTPUgcP3BhCheyaK5QpFoASlggKKrbEVjJfjJkB3cSafISJ1Bp1j2a4uC9lSBaMQOi27ka0/AxO3li2dnJ5M74FRlgUJRxvFDTCi4/AUnta1fUOmwln6bdDPwE0zq1LcmM3YC3bb3SPXTxdFywca8bmIu5dUzZ6YfEhULqm6NtVWV1kJ83O8mHJ4erQQoKrzUXwYDygcdzUBmIYJHxLDjoswqqroLnkHnW87jQ5WjeMy9QAedCPiHNYQPfgXixg4aq/r6cGsLIIcjraFGzCLrl7awcWuS6ZLVIm0XeqYu8p7EFyFiwymAs1gGC2lolDTexl6E7De9r0SinQwq6ZmK7ZIujpwdnQACVqOuDQqFH+riC03U0tEMTXWNOObSTOFZkCcz2JFpuaRzrFz9ffyRDR4wYM7Ux74wvRgEv34xmC1Ae8wwOkBBtjrJ7HoplK0L5H/ph8mqteIe/An+kw0jnETAaOQhpGIbKT6o3Yel4GCMJgVEYGKxVWR/o/eIQdeDNCY9FQzPuCbtwgs2ENGJmCkjovfWW5z7vBL5K9mgNaeVfTgDfx5WEncRACUn7FcRz1AgViLRGSQoSsW8v5tEOFYsFYwxjuEFhgXrxX7ZeAlwxgNAiOMcAM6ymeXAJ7euVHZ99T5HgyhuwqVHTcRKGdEJSQilyN6nAptnaJvgHMoG5yZVIPxYt01L2AGURrEdKa2adN0xdwD9tk7oHcsrhpKpaPn6QVcv6fZ5gVK/iZNMBF1qFnj0NSGLVFXqLpqn1eMg5kvWbwAfrl4hAANwOl90Wyeo6hluCL3iiJ2jP4okQGsXlMQESyuivQb2pksNAzQM2mHzHjhY/4HIWIPGZkEh2qLFQkbsC/IgCDWCsvxcx8fA5bl/iBJW+a9EqBf0UZ43mp6wa8zXNFgj1ewk/yPsn6APixmK+K9AKAnvcLecswvsGQmW8BOnUkxU9cY9QgTRjza7mOnifXUUrzGQl3jlCs9QZPulb15gjpTFDUjQ5VwnZyl0jZUV+So/DGJCF4yUxLHUovHiu5ZhH2smGeYlvTAGIUpEpHNhB7NpN26zb0Cn8vNHqaRPZPe6MHPsAaYip4U9uCR2JQOx+0sAFMUmFSeXLsSPDQRVASpJtTxUcau2vE52GvxFWL7lKJDk5WDo2H0k9RTYjwNND9BT/NkZSpj0kNUBKFCdVgGxCX4FyR0g8NJ9AB1rseh5gG0QXCgaos2TVexj+iKrWXjuXQ1tD87YTroR9QO0BKHZqh1s6bWVI+GTCs0nRHUVZGQAVCzrIzuIakRKHw0qm8Cu9SamF+QIWYMhapjuBKKJd2HSYc6y0ooCPS9mAiHp/CckFx0y60Eo5Zw3iUCMA1TssbEyQXEql023lTbrBVb8IkdZfASD5sEaQnPVBSA7kEPIM1xRRrdFd3RjC8izF2kerYUGkWmNIAKH1vI34o5/PxlFHQuE1L67aQF9g3dhg4EqTeQbouWJRxnaW4j6XoTyYYAU3JPT8IkIZt45dKjysfi6wNJpiNS+i9Uuyc8818k+k1iYVNQh1q1B8S69dZVPHlhrcGHy3kjYbK4KtK3UJoczzFAjaJ8zPh4xNxC3MMeMjLF96kw60Jj1I3n3hM53Xh/+eg9vv4KcPqvUSyB/4M1+HCp2DlmaoAaILU+mjf/QTTG7PFBIOpnuCL3okfs1NpFwYd2ZYmozOU6+gbVoM+V5htEKZJ7pE7fRuhKLoALq27+sfJwSVRxRaX7JMheUVaSKFyjxbKS8COFI3OJzsLBut3Q3lxeFNsPjeYy7KoMVYnIdlHzcDYsh+xJ/rqgU7xWLGFsWwzKvmkcJX2NfUUwHzdIqUb2ZYfxA9fUYGCIsRcrMvVzOsdGdIf39oO4G/8XCrmShVHzJvQOEn07z7bPnqqwj5X7m7gXgErzVwKX78tNBXoDw3V/2w5sdOokFdFPuUusIniyaoeNlgqzulxDBm7VyT1fAlSOvcm+tzJfoQdmz3LKw/7OJGCyHZe9nUF04OLZWJZHqRik/Vb2WwLILsN+1k4dyIZJX2LP7P3WA2zi8UM5YLufka1KFru+IspdAyo8W0VYWqHWmsK8o9Bdy4zVHlp6IMGnk/QlRA2EHdxv23cwKVQpcjWimw5PUMlm7u3o7XG/KQFul8iweEQm3KhzHKW628o0dwnoMUek6ONMnEkXILpKHFvEUpGIOwnYYHMBEXWGFYhIpzM6DyzR9/Kv0ekAmA1+aRfYcGHk0zsaoHMQ/v60zpzFaRETRrTazuWCF13xy6dxJiNOVQ7lUSH4M49STCFOhYLCOxqVSNtw1mjcUnUVKe4+v6gRDP3GOvvnUpdHZ/CcPk3mOVQAHgAa6ngCfSHcI+GY6mm+AFcK9VrsUQMOdb5FBb7wMHJQ+YsxAyQ72IsrRo7q6VTJ7qked1REp4TVhfFH2eZUiebn9UfNRCQ0pswnlBxVlAF3SfV4C9Qo2VgqUB6YV876NEAnhfHN+KzV5AGlStbA/YdfA2x0xOQiRlUc6hxnBnUclcCgd8WSfIJeABCXnWyCQLmgNUAMl/k1n2+3CvefcQcwJTiiCu9lDm4AexnJ6HXhpt0OvGktxQ0XsMilnXQc1MGnd8xxwCRJ69bIbBI28PJIAPy0Gj2f5s1bfr9+cSqanK107apMVy0Okh2qpyyQPI9KTBYO1IJyE+2RRaQDecfFUMdqsY3QSZprg3SqtjD+5QFouLiHX7tGFyy6ZDDvcGERHQMe8GGOOYZ5jYRJicjz83p0GIZzHrX6sHowD3aJgzoaL9XdhA5zFHPpZjybttah5l8zOudr1vhZai8tUX807sBloNk4ePczZn0sror0GdBonrUyQGmCes34WYP5FLMy9pCRaZZHhVld47XjsLY58kwjgeaIuY6YyjFJ2ZSJduKukYiG0swRU3B+zgTMHr0wRGhkzp9shZ7YmriGuAuFL6Rz7Wgd19LNPjEXurCWkgHvIDz/PZscjxX/fJjt68B0syAtd7Ph6GOYedO7xgI2bcq78SuTWd14QOLTgYalmq5IzIjOTHY6jKAkbFogi3XJGCXKxnwzPukzicgUbKG0qnbTSKjwLuX6osPnXMD8KKV8+fsoycHwqi1uL1V9x0Xa10+0FO25uN7XCc+KFC8bmmZ84mrikJbNEg4iUpqnc5yQtYjFfz+N6lgjVbk1MsVi/YXvpk0sUqF0Q9QtqPhIOWfvmTml6mrX2lJEztpkGOpAO2BDrissYnSUzTAxpbVcGZsRZ2vQozv9m6FP66T8YWn9TmglpEisGXPHQoCiZG2sGd+BiYT5SDvOJNQ+brTrpJ+1n8Ze57jt0KL7Em2+RIE3Q2gGZq2BFWgf1kLQJvNkVaT9sqYkPE1CtBIKn61JJHiqpNmHJie3EkakJkFvJbSOXPRe5qUbfmvZAIDG/d7II1aA9qK7ich0Pp/2SlduxvtUsxf11H4YyXAiUj2oJ+HQmxonVjOgEXVFv+xLq2KP4qNsdc5Y7BlbmPFuzO5R4ftlmfuooTVK8/llntsuB9VeEGyseDzZFekTtLW5ZjJAemnPmvHVnPkY1Qh7yMhU9VJhVof96g47/xuFVFGCKXkRYCVoK+QeAHajbAVnfwF6Gnw8Twfs+xfdBEIduxV7xWFh6Gui1xiWXt6oED1te+OCbX3Od5j4kAFURIeCgmAGj8QErZSD745y2S0jXKzAzGoHMKE865RYaBXHy5TVqrjrZFCDbQiPk+7Ws1uvKFG9uHNROr5DE06wIljRdjQVaAJF5zPamePGwD0gHdGKSsPqNcmhz5pPt4+Ez2yH2DDwHamr1NzUhwj1bNSqe8Fq7VLrfwEARbpogipQIBrIqtcAfST1uBmvShOIQj5TKWr7xl3nWHnqmJf0WO+TqJTIGx3UtJNRUqFO89I3VR2/dTdY2vCrQ33/msYdp6+Pa9YI314BQc7DYdUsjYnT9IOHssGSkno0bJKWn0MSgd+X6+Bkg9kgXb24mMhF7IQcQQGoGpCzndBpi1RlzXhmzBZkE8HjIUWmbIAad9rv7yOajDSj9Rv4DLL8dyBXpkzyR8UECX1ixJD/Zjm7ZzNaBmjzrByaGY+P8UcmvQd3QtS+G64+RMAeS3Xxi+qLnxk+iral8ssJr+h7BbWPFCh18GKXttJGKf3N+LTBbISn8hRqmSKTm6HCK52HddwAv40Lrp3FNWQPfFEMZHeTTA/kUnSY2XDlG7ABzsAesjZuUqkwq8ufDYGFYA01eIxh2ck0QOtRaLwTGm84NnM/pQ4INXlM7ih7OiOLhsDpg9+kcrPnoC0OBcmQ93kkRraiZdd1VoOMcOrcZaD4DLdSI7ayuCqSF/LYHBsYIE/Jg834WGY8EHPZQ0ammEyFWR3+dtTB6eCXqsA12xy9NEBSZMM+CsxqRBYTRrQ6R2Rn/u3Qx1SwRgfyrBFusrkq0ipkSTmUM0BiyULM+GAwKxFS2ENGphBOhVndKhc1S/42MiC4ugDkhnTC+wnjhkA94weKCj8rvlMRGvhR7++pq8k/W2M47dCLXhTPyB3FSt19owxxQgTChzhvKFy0yqYal9LLtiOabpq/o/lj9Rp51qyxPLUnLdbEVszspnXFcyv525oGp16tmvdpnGS0dI1XaLCGhGVSoX0KH1ohSX4CVmSEpUudsBGRXIQyY6IX3G4+LP4PJ2Yn1AUSIHHYciS5A3LeTKgUqpda4wydZkRnK9pDMksdun1ImZK0WxQ+RnHo8eaSKH2jDD3vREJOiNleuMYJmnBamIgJjNDQDYxZ1VxhAuuoF/y2yqy84aQCLUNkNqoViLsZ5mrOy5xZChlhho/IJL1UmPU9rEr60sng9qts9zEceDqZl1JUFNGSMuTYHOMASeI5amFjhOiZMKKHbRUvWPxzDm8ij4315QYnco5P9gjYO6uX2r86qu+6uLnJ4rtPfSnWqs1pC3Hgi7xetRxVIVqWGtNCPcxgU9y/ojLw/1Cpcla6COqRMlYncRHEhud5DIYNuX6e1OLaUlV2nrAd+17nnFLZYh13ysPOHQh+DSZR6giHSDa2ZXHhIHQnmcSCCx51W8vCCiMNkenTRbCLB6iAsBwKsoKOeyTGCkwyo1/Y14M3HLxBxe+lVcqg6vm+qWzKiOvnSKCj4F7C3spPk4vGPGlT6WaqG1dtAllcqwqsOKUj85m6f/29MOaGG7hrDKfsqSqJ9fOllzp6rRwCBmxILM/hoyKZQeogQSxWRWJUl+ptSOQyJC2aSfrMeBEZOoTFjoxMAlSEIbv3gzWGbbn8QFdw0wWiQhiZOwgQJf5FgbvUwpDBWfbwEZnIpMYXy/wNJDf+6z1REvH9yXnPCRcraWprc+Xl0KqxZoQSdRFAqMTKejWoytOTUQcFlpp9Q3ZzefnHNCBqMCqEBODVJ9Bunf89egUkkQNggMaX12aCSIhRUvmfBUwDwH1m/z2E8u4FhH/kygX07W8BwEdwPwBcJFBeVX9r8r/jw59ERiUjAPiXRZTI/JujaMm5cminLTTusgAo4BbsBA4iKuzA3wPuBpQQuOgpvsUtjUdR/Nyej46ApqPoV3CIaaLoFfYCMtFJPxOAPVqwHhSD88o5yMX3EK4rYXUStYD/IUT6cQVmrLRWBhPCaBXage9Fe/THgBGBSKARnLgsrj3XkcvjCriruTKu4uDqft6yM/vPHbDi2RhNpgFmcInJVJxeoekGgiNQP8+ay+E6vC4Jdy39o2J/kgIAE7JHAuN+/6ms0iJ7UcA483kWABhcH4wZfDl4ZFAxGPDyz5cpLw+/ePtiGP0NAsAHgM4QAEBf8UVB5y4n+kznwb8vvXPGTSXeh4zocMtXyhWb84Vq+UoVOB0AIxN8GRog6CzCDHNYbLDZcrCEo6W4eERcuXG3ktgaHjx5kalUpipEuJxEWGcjBX9K2wT6iNouu+l8TC9EhCjRYsQ6KMkhyQ5LdSnWUBEMk8762z+mzYaFGCgBmcGnGkKAmjBRCrJACHKdSBIioUVwIUfgc2muMTjplPPIYIhQIUGBBgNrFixZWYzDjj0mywg44RNyNm85qVUkVlvLxQEbeFvPlw85P5uobBFgqyAaO2ht9okwe4QKt9eCfRLFiZcgRaQjVtif/eggXPUfdep94woEgAUMgoUIva9QIZ6+vtgKCORDFyoQSeiGwRKRe2kYVYgSpaH6q+T/ViMaWn2whPWDwjmAYwuwYhSAtAeA8BWwzMX/f4nSvl0Qr7JTyNcYypSc3s895Gs7mr5lyAmKc0hjA36wbM6y3/UThtAGfCdZydfOVkJPYImixJNEdkAueCOrE17S5MOEKrbzRN/6lx0CJ4lc3Lch83XuTqT8mBuawa5d1Lrkvki+RRg5p4WJX5e1cGx/odMxo3GcQRtpFNk9M4wAGyCHfEDRioolbWZevBFTOAWuYZVMzPo3iBH2429DNqtkG2RrN/MmO7Bjt8ucxKylpEi6qWLVDhrsCSXZG4Jb83dse13P671uy+TKhvZOJRx2KiC3JujRWkIeO3N3dpaTbCSqSyopWbFfbPJOx3ZRvaUfK9YUyuDasGBZRTYWWpVfM5i+bM6Hh0RoNzZYBQqBvafNQxzz91J9hUUv8iXFS51jUl9lK+VWPmoxYa8a1cQ99PSi8np+6LfcbRXruIppfEY0bn2n2SW6PMAjkJYNiDTrRiY+dKfcdVd66D3empRqQvKWtpjP51O1Xb/DzZY6gTJ5fPUjlp9Z8cYFUakTV/CdEzH6KhXJ4IZKmGhjtkZNCNLwRUz6Ki8iTsbAKX4buCB6JpwYFSzscHVUZgyMGdOcp37dZxr9cbu++WN8H34ZxHTOiIHAOQ5olO1ngn8JCcKVfY+v4xIWxIgKYC7NTH/UYckjIZDkQC4fvSdHUEBvguX4mc3/Te8qNpsdF5TOWBjkhtn8jZx0+anDVs7XGdkI2p2yZJxnRUZ69hVbvHP1cgSEp3ICASe2Ib0YdaLLDtgjP5VFIeySotyEuORKbWVhEJb9y8FBXhzJgVEQ9kjyoHtRhHzIYb28sDAF8JvSAm5Y5LlXjp64/IzX2tvcr4LFQ+tL6+xE4bS2ML04lw8vTpBPCqk+lZYiSVckI0HHZleIWdvSJR7ML4b0sbFbCTu0hXVww0J+sUFyTmNxhSCtsFlB1zI0mzMA454nV0dieYpAhSpHAIIGZuFUjZgmgBAERapjEw1rMvwM5pcDBeSB8I6p7iKaFyd+thgDzC8WWZiQQzCiR5RLSzvdyrwsTqlhpk8McvMIWtATsxizlZYvuplanWFwCo7RmhNoVRmgcQ68z2WPNjzSWaVGCDjtHxGVkDcaVFi2dtkscZNsYdnB+CJkdRUgaeZlicfMfoA2EOqWkdaiiinnuqyQsXErpZQhubJccwsqoR0t9qqQFEAKr6S4guAhdOGsIBYis5hLCkw5EUZ0n9Jz8/gCfJlH+QQMIy8srwPSjg5rjsbQ8xjF1uALS0r/8RjEDhv6DApUb+gLcDF1NNqeGnSjPDjCoJlETSSBvkTTTKMkW3n5XiQpfASG21S3fvFi2UMM6lMROQ2MNOnlQIhEeVRwRBo9JuRVjqQmSwIqJ4lt6bCIXcAr76Q8ZFUagKvJx8b0eTUVeFUouiLxfdiw2UR8iovMW8uVuNCbVqt2OaSJIogVLESnocliUBmb8sXr3GzldfbbThTIITDCriJIGgEe7xpMHmRTg9KqawMx9DLNsEVFW4qwnx75WmOucERYzHpPQS1GQUuJdt/U7oCD3Ip/JyqBPet2+lq8YCcsyyvFYJF5aU05ps9wvjJgB+gqnGWH2IdBKKXtorRhbOtoxbHOcjAZzhJOzjek9wBU9kRp036TCnRTweXmkfG5I+s7NFxjB3TbYn6VpdZ1OauemTXpldAtdExCsYXZBrYPn1J4Xf6UYTFBeQwQbz8koJbYXsUtwZzOLq9jhTRG0+gSzhpfPnd2V0kQcNsB89TX0XcKBvA33w5J5yYL4DzZ51KvHOfznZTtTxwq2rbOfGXYmFDsQqj/vuixYMuN/1h4/G2fHyA/X8Nwrto6RjkURK/btOMBGWKkYgq0ftMlShUf8FfsFIawiZN92Og32J/qs+yX0fpeaBQT0FEG9xVqDr3sn60ODvqbLJEqdmnkljQxqaxdFKUof24ZVFaG3FsoBvDXg1qV6fYlEiVwmGks6b2qgp2rpCWek+zY0mKQrwrazEzNAZq0eAi5La2y3YhwcZ5MOsffs2/KYRBvawFBYPk2KNTu+0c2dlafsFuuRdcWY/XVdI/eOuXGEYO6zCi3eZQfWK1WV/abpk2D8ojXykytnqt/kcNfE9l1QnWSsGLlIHtcnaATxjgdKsohmf4e1Uz8K0vzUhBX/TubIbbSIaO9XNVra20wlxZNci93tX78CHNvEtSZB7kJxBuNedJJVL1JtueflBjSqQvlg1Ho9cWRwrq0UIpPcumQFg1IfjficIV0SIUBfJeXhcDoZWOhtLs88rI10MolaYqNjXXDIAghCXikwSpyOSbAg11C0xc7gtmYkyHEaKfMFQfFY84q16h5WF3nBlccB3tbZ4eaIwwvm+ocC/X5Tm1NJfkcRCv4OiabPS5XbinayYmG4SNBPq6M5PDwVqDmYiih2C555Ba92E+tYEw92dvyOwoVJIASmjp4vMgvk3n5eswOI0vEIXWkoUZLNsoU5PUtrpxPFpXVsSyWFZcUwiC+10tVqKz2JzmN1iy9+ENMzqqqGYav6yxdwYg96mD+eEUdoypkQHVZSkg1ORWDKU5LRwn5n61cImePcdZ5DNE/ky4qD2/wRBOXpNJm0ivhYRtkRvkqs5QzqrHceCYH4WuWsyo/MBrCmfQlao65uIU2Hsky4TmtBLsoiuAioaiMOIWwZp0d4lvRoiEXiCicnnVFMGWMqnyU5aMWQ16xQLssfmjtICwhu79CcfP8dk6g8WNbFM5IRVyjg9KYnqATc0IqxFIbm9URags73ciFd5iaXOb6Ha6UUKzQfm5QOE3fWDDxFnNlv/kBO1rULjv1UOorzW59/UR6H3anmrDQdTgd9ZoLlG6fcXY/heXmqYmfzBK6XZbzkvmSZNBj+3Ooj9CHTyMC8X8DpSJbjPO1URPIMvIHhLHztb4ePSEDIAl8BEkXrAXh28MFSr315UaERClvIsXMpbXFtleTR2sagLZ3BRzRdZYHu43J7rJmt7Y7lZ4zeatVq65uJfxlVVl1oh6K6CFT+0pADUJzCAZaCY7YHrGjpTnrcYBBlmrseHl+WJukZXYrmBGgKa2pNX1OzteFQbfgJow7ZqSHDtF64OWzKUXHgjPYcGaq/zRiEn9dSCGlWel/K14OydzSGBmQkA8j1jfdTYVy+Q2CwuivL2Q+C/Zq6O6oGA/oYSg0j0IsBAW93fDb52jpOVvuhQkjPtQa1mcsQte1a529iJhHptd4zRUjf4/j4NOituMvvl6Dsw7Oqmf2thzOrueODhLhie7tjyRdvZy9/eoGV/MNlG4j5lqyCt1NeNkyFCI+Il2pQmZZMK+DOKJQrCg/3ChcXJMcawSbQSzkIdiiYQkc7wrv1dL0oM1lsRY54ZSO2WOGUmKGnKKkDYGhTXALTdYzDPVndzWDoFxdQjFwkJvXGbebZ8X2jV+jo/aDZeeXV8/alycN+Ys6Lh/YGzcSUNPi8u0VVMj1Hz2S14pTK+UNS8hVqJyLC6DEIBSHkCcHKbMXuaaiYq/karhYnv3l8QB1hENU2+MROszr13N2mFnWTlPa+fNM0wv4igUa66114uT1Aetp7Yjb+Yup5MGrU/xGYZMv2NqPV0v/HIx6tKDXqy0Qdik+zEsTdgSWhFXLPaVgQnIKB6e5akrmw8gHaKrYKjOOcoM6IJrPpwF3tTamAH7zTKHW9PQfcsyDLzS2zg0OBY19zZojfI4CZj4tm7MTTVmohaIiVH+tiPerGgIj1U8JbG7MQ8kS8QE6zIco9pP4m26WssQoOpVHLLsR75FcEpVk5X2HNCKnvw9QFfoApKt9+6sTipX1EcdYrCUU0gMJjkAMFWiMzATqiYY3FGqg2nXEFfJoWozWx5tzWtXWj1J082y+PThRVB1oVVb6KB9D0RRWriQ7WmpWl1OVvxY5FlLykeAj1CkHaU1Xc19tyP/O+QcveLL9MA1rZtA+t+cb6bPFL+/RWwKHbjiPXJ1wY8iZZ9pUR3QvcrQYGxPLB/lQ0RAo6olWyiWBA8IiCBPuNpmEYyBRlLUngShaeLfXmsgv1uJhntBRI10xxdGwhLa7Bb/gcUoDoxyESlC96UZ81r+vqA5ADmn0sjPQ0xcOHsyrM7Ry8mBqbVg8vI13FGZnd006St0IJCZaecVLFL9ADHGCwkjEuHwCi4NKQUpj2h6tAqHUpYT70Nn/pZAVkGay6/Hx/v9+5DqFSDnyqvKW++neGVsMPH7LV0p6vpVHIfr0oDU/2zwDpDpgZFxX2V7L5uenr0aZa1sCPdi9OSy0pZwnv2EukBy8doV+5RNRekytgqyuBT7lkWumY9qDnAqN99n+Pu1ViePn6Ek30EsWShdqMWrfwK+vvDeiqnbL0rpsvtZo4CkS6eFkmtsG9mjf7sVQuhIucc7756Oixb6lmk5SKWPAQCdnoiqpCCQKDCN+4FtStZ7fARh4XPLVc320XP3iyn/du2989Nn/Hb5B7/3y6vv5VbPWWCtv/j5Y+JpdUI2bkC8tTX92TYD0ze/30uc+3UfvA+foqW9+kf3GGptn2tXAP/ZuKKGmTJprdWTDGZu9BYU+HSorD4rJVbATsxi0iMWGdRYt0hr0CgWh13aAlSxDqEQeIGwGub9SYjAEpTI/waC4QaczEKgdNUS8MFAGlwXyf3ADo2+o/JOenzYrWsoNaBxb53tSuIRYGXejuHXF2FVznUJdRfJIdTXXMVe7agw2q4FH+Nu/BtD2rXPtLxdl/34ZPnaYtn+csz3nKbsG7Hl8gi7+BaG1xnoAicjh7fT3x8gw+8cYr6+9dK/F1F9DiKb7lH306jtrYHYIH1lYx5CUBcf1Rzl57iTNiqtLXQj0Y8zapkF19Ujg2tJ5Q+4wDQ6NMXk2GqjGFm395mS6GJ/YbP56UX8pLZ/UQltAb/Bc2BRc1ESx6ijtpLZVLKAbW/yilRNtwZC/u2Rs8e+ttk/N4513AyHLECKREu6U+gPcJ4ZqJzaYsgioQw2oDfUxnRZ7x0gDy1M/YWv15Gtkn2PZyhJvKsjyadt1WV7+Bot5H5TwYiCNvvH5TnrnxGmaBUnc0g9YLtHfsnbZ33lLa1Ax9o1xn1wZNBDKSvs9Z9yS37VFR1n0KGXWbQHMGFO0y1ApUZQh5QubanaNRO/SErhKbcA0u8Bzww2n+qJvUMkwuaKyoBsUQY6Txio5tWLASU2NZcGNj/7SUVY9jlIWHeIWFNcnI0A/9jFx/P+i+zGbI0wk7MQaehULlWvWqklKqyNN6rVAxLJEiFRl0xhPG0ZilF6VX0hcqU63JcFGq05eHBQTlfMbQDCjxBGdFldJC0TE2zVLLUmuiA1RlYUk4Mmnr9FjdMc6IGTVHWitimfiEa1Jj+hMSDwTX93QAiYuv+//7Ifbs4KVypmlt5e+K7/3Poh43i/2SJ2N5k5nryjik6l+fSq/yDptWm7gbHUq7Xu/bT0/ya6YMsW0TmDgg5zRxPZ5Ua0PlwsYm2B5+8Oa9qpfOiI7v1gusNv5y7u+BE/axx3+QuGFO3NsP27eKPQ/fm0W+BhLgZE+wFgKPDT4wPrbV+pw1pT4jqhkr3itInIMTBx1yFMSjFR5l5aGZ3zvrTcpKdyNSYteLJAICz+FIRaqtOMISlsomy3/D15aJtuHWRxItuYwJ5pznsVXOHy2LR+GnZ3pHDfbh7kcBD95JSea0xvNdnC6+GFLRnw6ws48F7XOLnBkZiACYGcZt1uwxPgwM8ZURHWyElHaSnpqIsHBQE2k1akhSLwfJ0iNCjeh/ShuAitZhjCJIkD0GxT+aokhOL92UokuC1erdSYDugM1kTo1ruExk0oO1YLu3gSxJqfw133RgQ6PBAaDNRGP0W1FExOjOiuYMSY6PhFzW/hONUYQ9j1qEr+XgYhljFSpa0lSXh1QYuzRfxuna6ZHcOagHXaozNX117cZYVjsbL0u34hTmvo6jcmFO1xEPhf/ROgTJUKtgQuLCJXJA1g/LveDEnuGH68qVjx+jBr18l9DTJwxGWYb+ARuQvWEiWDHgIF9A/RAkHDbLIP0YMZU9p6P6Ff7wMAwfTKvNoeKqrGajnxkIn1VzYEFgaqIj3SZkOmzosu0NsbnzsqqARNGqBrGPa+C/s+oMZyQRTgpk6eqtrSdqdehuFKNm/AA2EnfXnGEjr53mwbaYU83ajToz35Oy2OrjrTVgj1jTHHDgY/nNcdczggf+LXxN9AhNvOzTaLvbtMJGLeYc5IGfgKXIf6hOynPXUKiz+VlF/Lz5GonftBziPuyw+JPeTWWQ7xPHRxGuIdBhYCpgvy9ATLpEmvYo4hhqy3ISuTqNmKDYxbh0hEEvhX3MZ3WADCODdzONZafbzyRoMieo9++w+RCDEZ9v9FJBFEd7dcnLYJbLHJbsfVvm9NH5uRuB9H3nNwc0nztbP0fhgRIRopL49tnt6hzclfOjAbnc9mODETwdzbMqRiNigtPgNPInO0gKB8WlvukLUZPdVNwEMsvhxI16RGl5OI/NLjgYB/TqIgA404JgoY+Y173HZCLaOVwnm631eip3BysaqLPnzX6h6DaUIQebLygNDw7DS9zMI6SuiZ/JpNMoEathsc/pexj1RruDLuugsjPU2izeF/2WRdBsyIlZfPDgMAVtO5nyiZyBbLPBLxnnrdOKTWDWy2OyuJqoE9CZRUBKY4H8+Q0Is1zFgkNhR8teoU/KCcMtBoxUVqtkdDnF+WpUZNC++SCiiC0SaDeXGQ3kXvoPXuYPR/QA+QGpJ8GIlYwsbUqwARQzKhS40b03UrV/Fbw7jy/YknbQJoYT9u8qK08aQ6WlfChchW/eubMFXxkVTEC24q/QNSrHOX8Gu0y3Y6MjA67fhmQ3LJvmtwQO9Twumr56zEHh8Lnpty0i1k43PCWxevbtJRhcHoY3n/zqdAxT+U1DLsGOzxV098HhpEtyae3MJolJhokv6IibJiTl56iyJSaXpes+X/Rj2eiC0Kys7sktTm1Ka/asJPTsoczphQs2iMCwivyr1aqRV9JX0c8l8jYUAk4XSBk3bwkYmOulhsciMXRqXpL8Ec5uu8Xo7TFIHX4tkyLAjr6Ff2Dc6HDS5etPUgDfcWH326QBfL1BpMWt5gxJorwqgzJSEPlQOVuUGKJzTl80UkDLssQpv0sGL3RqEdJs1buv9dI1M6MnMyhe5hbV6aEDrdVyjGlv0YOdg/YNnKOVedcz/nxDHMY5LLKEstZTp1tQoWhJGpGP36SZO+8yRC3LadzJ/2ML4psCqwUhDXXmKvaWoEri4rSasKUKj08fk4QescuERLsXKREJaqlKE24Tku5cKeXopxe/G1RcDt6TWITc+3V0vluunxPFipKdATld2RVFo6IyFzxFx4eX4qFhWRPZYEryxwwlC2qD7n0FKoQFpgOBwtdAnMZppa4y4UYpphMasxcSueUjtuTb8xTUhi4jJ/VlY6rM5k19fO0JvJW1ZvnneqvzM+Ksu14T96SYlclFQzX4+Dr7SWDi4MbkgS7ebzdAmoS8ZETNzodBC/XbHsmMIbD4vVGlx038Xbxeet4vMW8dLKi9Dz+o2tBc5rBaUZxlx3oQu9j4e8DHd5h5OUksaXswYQkGPVKtX4DpRlv5lbIJg/2JUWkqduli75VsobuU5sQX0KjdPz8WdXstEOokp7YTp2EXSdMq6/MnF+GjLZCVI//ss7apDVpREiyMyPdmfw6NHa6BqJ7pQ89Y+h4FakRiUyaxZuKLFvIEvzsvPxtgeDt5c5vwuEDLuWKbiUQ7uI/4vEeOQtew66vOVfvRWHodG62JnNXJucIJ1G5qS74ipX0XTKVfDVpzvHH3OPbEs/5QhaY8mMZFjcsfo4UPra3TGn0dPY4Z8engN+HuxJX4/h004XOY0tSUzF2IhtNTZOwwZ23RqS4jdLpbBTR5eui6uTqoEEjYryK9jAyWsLdeobMdVJVANcUlnhlK8JMoW5Cp7UZ5umuQJkt/FVOknIFadBlGAwKuYEEjX6zROG8JZc/Fiz7dfLtrgw2rXHqtd3fHC95asGcYGlwzoJTNPnP+teo4DwmK+XkXzPVN3L+aaXzEkZrpyMF7li3W+Qm8GS9utO3ivdqmG/zJPm3tOKl8Ne4mDrA69OBLZIkOxbUdeD45kfbpx1fcPe93TdSbdm/OlKe5Jvwe2VdrhGntCtAT4D2jjJ8ul8j7XKOuGRdfu+EryJpVcSyv3qkb9/b4H5knVcgtPFYh7ICRDNsJgJZVhVaM2ZdASwQpaQk2U/hmxx4DObvjLjDK0lU2gi0kXTchbGYXTGgBageZ83qwJudPKFtcfBW5OpvcM/UPRBciLyZfzsGejMhDumjJ7qwWx4shWBdjX3cDjKxUZRAB+L3jATfSn2Ay8/x3j7fy3747rUfGh5/9/ZP9IcKYgvJyTe+D38J0UEYVNRhN67u5+/e+Qn0Zb/S8Jc9gabjU0Z1e5nJozZvKkRt6vf1V/VP7gP5mfAA3KkqYE6pqzAIYMNXdem7rQ2fC94Ioq9+zyvNDOBAzQ9v9REjMHo7DsFDnQyZuVgkbz1cL19iBPHchPMcPBe5+PUD+nE7wZek8ZplUwfWcV81vgwfvDZxTX2QVggD/+pJP8GflFsoSfzZIqh5LPLnZb6hNovh7stIacrr3ZAnMvIEeD7iQzg+TmqTtrcTrGvk1z0fzseluxs5xhwDxsixbpg9NVt9MtETaLb1C5eDppTrWf5aeSF2ZBEb37AbxNW+k2jz/3YSJYodOVPbstLiFCXM8QehHW1cZTE34dD+x2qFdC/h2gUFUEZ0MPHvGv4dPcSd7yqXES/QXXS3/84/N46aASqS+LzSDp+vOzAN+raeYFhfCIdInwmNOWugl5T0LqWeL+r8jcr0eiu1dym5W8cy6oUVv//GBHrfylq7UJcDz/8Am6F084+Va2UfZpZYG29lyb8RLPuNdZuSy6ZV7EFWd5V2sYa/fcdVJQs2NWtrxMwDFHdeFbfON1CwF0hPu+7zbeGDI9137Wu5Slw4o/KfrQ+llON4QPzy2uaJuN5JmIjBi6vt0L51f1ae1debqHl5yWK8Dca2mNMat4D14tPkkdmnRHuQ2S7HuTibJ+TvWaaAK9SpefSBypDU0TBYV60ve5xSabV2J6ezl48X1YqUMSKKUq7h00nHAj9tsFFutTYqtNWkvtDvUW0LMSelhNlqIIpsJsplxpCneT8l+nahOnbnfbZPWqqEnaiFThh8QUZoMi71lIhOurnCL3VyFnhSp8agp2bG5efLvwiazjJFhYLzB+FWgGZmHDD554hVQXNZztpSgxzgugmb4fm//FmGv/daoyclNSphWDr86NzxObt2MLI+8+qBUHQrDt3FyjLnG47I5G6OOCTLKjw/2D8eRbR3xRDkwHd/gN1w/da4AUE97Y16WFYJ1N7KH3UzUIcOHle+MhqWhR9DE0PHHzBr+nMmt2VNnjs0GjMCdg3BVigF5zdyIIEmyH37gxPQj4dvXRXLUFbZweIau9oObHtRBOV1j5t8z020BhX7m9MzmiNe7//oHb+z9rlz//D5vi/ZFfGnYxMez1u05os/MjLivtBqwQb+wVSBIPUgn39GiIMQngHxvT3+2IaoKJ9Ocrz46Rf8bgcFq+d5YlciPXRsTSTYzogmvzLb6XFrQNc3lsT13IstF3vp9jyss047FyOUYtQFgNlVIzluwh3SQI59tV+ov1Bd3MT4jIgKMZmxnOeI50Iw5WBGs16V0X1M0x7ebwnYQ+2JOclC9PYTtUAjo4P5BgN/K8m8U4ISQqfS/qnIQN/8IcFPLORasrra4ZtidT0E66bZB+0v++wJOXSMvx3jySsX1+H126UvBtizhrdBzBu5Gzds3sxzeJRki1sENQL7ZvvoqDKYm7BokwO8u+AJePwHf5pAi+uCMC5f+DHx2NGAoi59hLPFjy5RQD5B6cyUlq+hHvyVOGdZKuVbDFJmXZJN6v2eB/feWtEB37oDXJ4zq7ynVrlboua35a69d7w9CuweHmPCETWOYhocCTGhynBjUITPJV3RUUvDZ0x+Hkz//2MbMkNEbKsZI1b+93TUSBgIkqDTMYy7MnCO//07hAO4BBcAU8p4T528/5UL+8Lc3zm/hS/uo4+aJqe5JsUBESvpvqyYPBWRmKpVrmn/VAWKYV8XZVxR6mXw7sUmryOi1UYcJ8yqNJ5gv5gwFjkWO4xFhHh/9j0OzUTSODst2UqmZn69N9TQ7qfs0bkrquQtosbcnE7RYlEneM2i9SXOLoXSUhj+KnVzljjfDAVKrTe3wK5g2EvOZqT2eFOSrblHv6UyAq2vLKioQYutlQEX99tdZ9/49IvMoznfwsTw174ovwM66yt88FnmWfgsSNulLBWojV3B5Y/yHDXXsrMKk8vjjdM8wVqN1R2KTS37P4WtvjiQ7mpysfA9TT3Z6bJeAafw/d1W1HT3Tr3W4kJib7w7KSuKMNXT6V/fXMvjjQis0+8/WsUVPJ8EhBFHuw5rtPRbsMZ2ncPZ9gu1NZMgZYUSn6ZfI/GWiRBEceADyVfIwr1qIypfIfe6Wk3GHCIVpKSC1BVqpIBUQr4uGeXtN60X26k37Py/srKXlpQF2pVfisVfenhsuKZM+cB++B7zAO1typA0WhquXFMPM2ud69nsBientqhe9T9rjnyKpydnSZ2MMy9ndMfirJyE/4Hw5kaNiyC0nzS6A8Y9GaW5CXnChNycp4Sip0CNtVDQatAmIsPV9ImbnbrOMpEfBFY1LaQ9+vUVaMsGdlsSFrbotyKyfxL1wv/pOZaeDM4fnR/x3i/2HFdOfhjCfXZaW2F0/FfcjtUxVrjpGRQzrzk7I7vs/nq4UzQLfrJrNp8MW0+z1A0oDz/tCnwMIdhLMp2H4KEO4DfOC2Se6FVgdYlOGbe+zk8YETjfnpXml0oDtLv9RHQRxwjPdP2KHsdlvALbO6hhhARem32G/5Qm0T3SbSG6qf7KNH/4tu11FVdmwUG0PKDKE9iVkoGpvIGtNHEIHhqgwJN6DK/5p2H1NeAQ/2fNQw8C2TbkdfzFMwCAAsE0M7Xn73srf7HPIZ2K0P4HjKA/99+2blbcz9LXxu5baQ9Hc0lbVfzYDOSc4H3+cd+p0fm//QR/+q30ZV48QVPlcHbBTFi3/EeEOT+YSLzCwFeyjP18+w19j5YVhKX85zOiwAvGjqTYs66ZkAD4ZQD/qHH/WxLQaPfqt87lt/cF7nIbVpdyAKzgsDRRMRPAtY/mQuaGPNjwsCEM81Kh5YnFsN/ZB4uL2/nZbdzw6hrIR13fOh+GZp9FX3XCul/MGBnaD+/UXdLAiHXqGIT3nQhsnf0LtzTfiMEwML7HS+l8W3Mag/KwsMsHT7Qm7mO+eiHms1BK5euYr+pLq8ZDe28wL8oUvJkx57HlMeHVA6IlDSYbXnxwEIwZRF1AMjPPuFcnfoY/vzbRtydAiqn4fAzC+KtyxEP3xJOz+NxqPKRlcKlsqfzi10A17pRiCnCAPVCJ8N7iYnJZ25OW1A6Pgtcn1pE3JvKSz83FleBR2rmKIXh4InPwtYnw5/yRKsoD2T5/5QV+TxHEyGXPWi9+DSZgJtwMr0Om1S4ofxq2WOjzYzHDL+VcuWej8Hn34rmL5/2krDsd6JhX0xSi2xiybF7rlVkVddu3hfzgiLdvKnaUcS3lRJNCX+OVGbrwbdtrdVdmz7NpIfWWFrr5DM496ESh7/Bhb96VWZGupcxSQPj03Gyxo1K+I+zXTPaUOW0/nqlIrIp9wZrkbrCZ7i/eZH8NEXFs+sYSnbPdjajullYhq3iuuQZGzpTLimX9uLwN+Yvjx8U28hvaGxNhWP/6hOyG6T0I66K4FmHVB8pt/p0JzV5VkgX7ymo8Tdwnn3RcYrvvJ1Di7uuaqo9a+lFbF28BAUYnhIcefO004DkFkKJTYl+Gt+v0sB8TrxR/RlrG+zVxjy8jvaMb4EUEHPN/q3g+F31+2UmrOa5aDzIHwqvDX/DfqAF6ANCB37IGkSIgfPNdaODc4f602TmkaZRIlsR5r1mOzt1N4HvmAjeX9qPO2fv1x2ekaC/5j3lrj5JSLQb1i2jgDfULsLAhWY6/zajdtPZvjQ9sej91ZDk7r/Vo/4dl8/ZbjxVzMzt27Y+RbToT7mxk/g91KSJLcRl91y9wXlGzWxurJ+/ddj784R9g+DlXsk8JFpFGg+CjD98nJ5di/4x5QNLPJMuruhF1ScUf1Sy7KWW3lQho71dr89tHbDvnOI/k4pfKBwL8LFpd9DRpr94+btvygy6hsfYXCS/v8HL41uvF72z6aTCOnwupuux4HZ/V/PSO+p30QM3j3PT1uqbUjFoO4kPyBbiJV5i3Yb2wKYVTkh4Trx7lbMoCC5Xu1IFILflKq6iksFRttebL+F8F9Q3Rdw3lo4Tkw+fbhVZhsbSYtAaEhJNWI2BcN7jLPfvpQsHFHe/G0yjDTsDXKB/Qga192kpmNmtzfDmpvUmJKfdXSUKZhUXX8gXR6S33ZtOf/k4gvGcHBD7jcz1wl/uds7X4YXX8nDMi24OCuLwKvZgguYgIjGW/3ya//fwd8lp8Zderfu3uaSfhZ4sGtx1PSnq7etk4710SgpaN1e617Ex2OpfN5qbHyn9iAwjXZrrZRWdm0k3dQLiyvTcU6QV3V4Z7q5rD4S5aub7X09tb43a6nMAlqCRQmYxAlXfZ3lSQlhaVujiqOQgAEtele/csmDUNWKUT6QWzcoLO6T/+cUSBU/vsuB2gd/ods0QuJMKCz524MfPB5R7mqTt/eHOBQPKwhPDB+G15lR2c1oiis71jX6Lo0+q2s7LERZiznzS5M7I3E/M0cPmvBtO2PFF0UL/K6GTB47zzdKpdZyegaCc3LY73Z+YWPgIIALKkOcaWDvyMqfbpkB0FZcjc0iT2GYup9dOZ3ZaSfcewpC1tM9cm886RRx555FFMMcUUZy9o3SPK6WnRJO63yDcWQ9IBKS3K0aKB+2vkkLZbhPkS5dbY9hpumMfWyL+2YJadWe+FIRHSMRAhF+hAPnguDnYM8GA+HOvKDR0+diSQr6Ma7s+70JMDdGkIR6h+oC9YMDfKJzjy/oUoi9QPOBGWq+z+cN4NF/tgudadC55M/jm2bRJ27Fdg66kBk19HW4wovd1tEUwdnMNCRY5/j5VGAwXd2f1IwTmi7eSOEC1RGKyhTGsO8HSuJJ5OY81QBMlkipT+oM0UrIuz1Q0JmJLPB0+bMKcHznSHZeWZ2zXnesyXyD/rLLjDf5k4tz0PFbepVk56BTKBj8DV//VZWSpQ6hw/eNQusgnQDVACfx/MbjsiuPd0swI9edXAb52xbnuKWC8Mj5iMDDB/E626CxTp4ijg6WTqPQKmhV83rZvnRLOAO0zw4gFO0YX/impPgf2wJ+zYT5Q7DUPaSfhgophoJoY5wMQy8Uwq8ymTxnzGHGUy0LGv84aNvydDNjr37qd+Xxj1jwAQt6n5wPdf5EiFoP5efYDx2QfiEjDBXW4XkAB8hNA01boRhob2IBzSfE4Eip4f/YXQDYBO/m93B9cZDIUoUiTSschYgBPZ7QTwZca3liVq0dCmcDBgJ4sJhVBBQxzgkzuhCFGKHCWqSh0gvS+1fTZ/rUVjkJFDLUuGaDzas8KxDJjs30JEx1D9Y0eHaRulsuC4LPLDQ51Kgq9rqI5AsZF0q9kUqMgvvV8EqvH7WZfsY3z6DFoJFzungcWQ0L0J7zBmNc6N/ntefSGgsft+jAuL5x+G4SXHVXBLVkQab0FOd7jEE44YVYdqldKMD/6A1v2SBwTdBbbJ4RP6ru7fTEgxI+CFf9NZnD4LfyMCa/RhtXbMW6MLpEXwW39OqvEPWEtY494Ou1s7yS3HcKRRROT5X+yYP8i3EG5xT9q8s+kLf3gv9N1+wNFyUs9Ng6byufJsCb3h4AMuwRF4tVRjCUU1VkB+MajTjA9U/rWKtzyua5Rh72izCj33DZoaEcpzE70fcAmOwCtzYzGqxkN32GYlruEIlL7/DIV/4rjfADA9Ffy3JrA54BFyJyUjt1u2Wi/NhYOWIze0Gq1FG9A2dAhl64yK9ZWqdUU/6KleyIRjvBj74s14G96Bd+OsOBFN8STGbUuQEvYTEgknfdoX/KUrfdPP/W8yiSyiEzGQqCXqiKHECGIsMYnYkm+KTpKTokmX6mE9qV/reb2qD8ONvJkcSNaT95FjyInkVPIxcu4oG1fHD+PPg0Ixo0gpMoqc4k9RUZIpaZTvjjfNoq6n7qKe6u/6af+//+p/emESaCyaJ20nLYoWR0umHZ8Ns3P+u+h0F/p2ehj91Lqx7q+F03HRykWBi+IXHVlUf3ae05vMYDJcGX6MRMapXbsf7/d7/qLS8nsdPdOaqMSq3gY7RHRIVjRGtXrtOq1G4FhKi9MftpXkHoiFW2duf+fff87uurBNO2pn7ardsZnZDFqJBey4Xa3b+mzAhmznPB8ttRRYullKLaOi+KglaosWYlWcFt+O/07kybGkL92UJqSl6a/p83Q8nc8sbWxtRDZim3U2G3//9orKLmXPoBmUsbVQB6NhPMyGtfAmbIf9cBxZ2NrbuthuQUfv/oHdgmYwwlocj/NxM27DnbgPv8CjRGh3mjrZ76UHaQ5tpK20g/bRdwyY7WLBYgXbzcrZLdbFJriNg4+Dkmt5HM/jDfxn/prPCbsl3CWCJbIlOhEqksUX4py4LO6KTvG7mBDv82WOiXln/iqfLSyXSpemFu3FbMnhbip3l/FldllaXi9/Kl+Vb8rZilmxlumqG5LH8+LpZbb8n1ripFM/qn41pOY0TVvy7fh8vgc/SO/Ryfq4/kpX6yv6mv5W39U/6J/0Y/1a/6nfGzCWzk7OG43KhJp4c9h8ZrLMCfOFOWdKTenNt4gFAFRw2uYgId0d9J+2XJCN2GIwRp5uzDUElNrf//XT21++4OCA8GeotRUj0Ra/BghvEUrHqNZvZ9f4YGbzljYbk/DL3Npj3HffgfyPOjQK6F9e5kkj6EF8bhVjivDS7Uyti0mVRIS4grk22KKv1+jaK3mUCjvlkw6pIIk+UyHDFicfFE1kSL4yWiBrB8YkjOlnovmEYbaifRGTG7ePpGa/PzR5gzNXphKTsITdciQfVAWtB4o2w3IMhHDygg+49BsR3RAAKEMGi20/9KHlnA5TecvZuBYHfblPo33ipjDaUXV8ZbCXUNM8laHH7EaRXJ8ZE6tS0E1s4J7ehtBCkFdYOw+cxBkwaRQtWc3LQRyvsUQ/A3cJRv/uK1wBkE6rji4nTWOZFkPsKGdNlWDD7Knvm8AG+zy38QTnkXWE0UWcDpjjNGbEfnHuf5CONs4b5zlCmYDUjh6rspHdJB46XFdtYYIflRs7a2trO0vkCAs3M35RGCBSiJHwwM/g0wfqg4R6zQOyYc5+fdBGmB4UqX0gCKSANOu57M7MxPLbQMAiB2uwN5Sd7PmvCx3w2SguzirokJrgBK6hN7ORmUYwcdsNHxI24KkaIVlT6BXFO7JAlRmGZjfviyevLYu5exvUN0BXgmOvrmGmo+3vnl5d8nH6W71ePfobJeLnQAph4RF010ZdI5tZzz/nV5g9c7mytbnHX/rjye27Tf3Qxl0AO206HGHphjJMbXUFUDsSNXT7RTCuMDDELoOWK7TjDhwfHwoFNl+HEepHJuAO/70nHORVnLW6bgEUlFpb4zACa2GMEMX9BCFHVonVvTCl9J7ZFp2M7cjQstObYJerpiJ3PJWh1+GXC5uPcVzUh5N0ywFPEoUYrYj6NaT8/TeMIFy7GS7OQG16K7//Xyfs6UmJRBDlD4VTUtCqOLRT2sUlvwnFAZwzjgPS8dTsh1iVK3cg4B/Bko5Lh+ncVyPYVmfMUAaFJaZlWMs3hAbRWn5AuOnfXR6EDy3D0EicTY4ZM6NL2ypE6ggHVj/rr9SiBElPe5e6CEFi7lAUe+hF5IEp/M87EjnQKmPeZjW3un+YGWv2RaDIVVRyWeE2sNty+loylRRpY9CsI4Hp5GS0RE4qlrx/20bC20iY5PYkGtii9hNUSLnW21lpttxvNqATlp7cBmCntJeeNVAxLRJLV4PIQqNEPo5N+p7qDL81+mIFy+MYZjmjzUGbu/NuJWsPTpAItd7BTSEGCQTupiiCvdleIfebnOB+K1gvUFaJ46detRdh/GvaagyMyl5rpA0dGMXThXWOIAQL4x6z1nfO250KR289FPVIb3GMji32ZuvPPTC1/e4X/Up7/1eZBemBd1DRflQUFBaU/v1uDv8cFtYRRs7y0jIRT3TnX5nvLtYEzWM/rFZKlcpZMeAt6fqQPvZIE8xc+WWekPNo4vkLS6ZVdhnWmki7qB4RQmi36cd/LV6dHB76Enz81B0KjLRXtDDZidJDieT8T5zlffeeb70QbXBsdzcm/kq40YRz+8v5+FKIheuaw0ZDIkFPG0VG9LT3SIbmBSrkGhPRHaJ2W8bF1G3Y93tkvI7eNgbYVAZ0FFzwHHK91tOgJW5VObMN5LDMvu4MyHGW9rEjATE4vJxJlmsh6nFMGaO4Z6k0CGGELFNK3uupxqVjdEQfShG5HuIgEpisrkRvpDzAFtNoAcXx5DByR93NkxAN0NbJj9e7fKSOLQdoDzzYIjKBMabZHJYcpM8larp9LttQLNdnZRN8RvpGqiLItlLrr+J1yR3l49ANy+e+9UghI2lKcyE2S8SbFFIHwwlQgucQ3oze48amU8UwUKcWxzgptoKy+ACmdDxi/QeJSrY5CNVkUVwNA24TZMQ3qMu1wfEDMLWn3Et1CqZNiNxKgvqjGHaQ3N6FfcZ8JltBtCwJbckI0joYbVvR7J/umpWmpdEl4g40NMndRoL8zjMbupDSr7twuToyOMBiMjuiJB0tfUIurMfYNeTjCxQqhZBNNKILeGDr4EhmzhKjj9wmIkS8TTJeF5YM0lfC0lu6zXlOHJkqm3YuFHRdvNSCd6hKB4j5qn1xaDHluhBcTDkh0ewA7D2PhgNOVfPUkiF/8984ze099Smpl8IbL33qDfRpsy7/vwvZs4qQglXMeUmZcauKa7zuWc54+QgwdExOwWu09RDxODWHQdhMp5AxDo7ZdXT/VCA0goOtTPELcKXtbZqN5+MJiULmUemLo8dgsBaM5VVzKhIx7J4CXyGCAGQdge0VNAzjI+Z15k2PfQceAyLU8Z1ok7DUFBm8JAzFOTQP3E2G4smHQM23D1lw6RYx1vhamYe+XJxzfweRI7bpPNscLftqcIrNyrGkBCjtmbdefXc26mem5sTHB1C3NqFpjIoty3UsM1hSmg70IALadYULGqK+a6RBazFW0XE72pQX+JYFBCciYz2EzTgyJcEOLufbpqobtH/2RuBYMb0Hm/qwI9YsCE66HRn+Wu/yQB03gB6o3BcrcikE/sySc4dUL6bjlbpboasMp2J92sB7O+M2Vjb/eRgdkmfUvAQZ4nl1UAYL2FwbDAs4upAQDMZ0OsB4UkChjPsuHKZXI9pZ1aLLzeqENnSA3T2alhBTtY+gK1Fp9GUsoGSvr3c4VfaXTKNIcjawdc2YqkqB2BAeZT/dkOQ5g8PBMaYmr+7NpCwfYkF6wIIkTlX/c8thuz5pmudVQlTqGvzuf7BVhGhMtk4xy7sSHrVueMgQMplqFWK+pImiXJPlXugp8IjnS60htBoqiQdB0gQC1qOOnKkUinYt6qXtUBRNfFVf9qs2nuRlIRzH6Y3XBQeMcb3QKkbjvtPrD2CP9eyg7vDNvEmLkR+Q203JwffZZpIdPRmtKXZQaQNuBT7Enbpamc1WbtpAiFCp5xlk1jW2E5lQuqeFjgQLI8GypkLTRecqM9UoSeRB/DmNE0/sqFItEy9PWiw9nO6nhdh6PI1xNw98YK4f3AlMGhUgB+0sPD0CU9o87/LVRYMY17yS6uug7XZt8SQg5NRylL2hJzmkcBPYh6KSIKLfsfSD4pz5Gk8zo31Cuy4TjTfQao8F1G4XNAEvCg529dkVXBRwjy3Mxnpu4s+e1ctUQiAaFab+HmEAizdhTh7P0bpR/t7Foh91nrBvXsj6tauQP/kq0x2tiwqcJl9neuK/3/ulv+InmKwZhYb0B14MdXND/M1SHPyXgUV/AqcIYc9njs12Zo/1EPniH1f5S75aAkdzdKig3QeyNg1msr9ROTS/nV9nEGnvndDq2uWbrg9peGznT0LhzM/gmwccJc0Mt1YxOE34UCc9RIojleBpyXAIZPRkFd4zT9PVtcwYGxrvlNhMIYwpKlyEevWo8scASZMhg5ANuRIhFmOqCqmzEbNcyhJpoVjoPqTpWYuOOj9wnVAMaZ6yUhjC4mDa9yIRcbT7TJmyB8OTTTgD/6iVWQKV7SFmkLilKIY1K4I5PDvThmx5rthT8jnqcBP93jFPD8OpuQPFBz49HwcxALDW1G0YwbWmNKQ3YVnuaDQB5vdtTcznLIth9GABpnzzBFK324dfpLJyPq0jfQYb6w5MV31tPzLqiWlOi0Xc4D/B5Lw/QntSQXBNlU/8eILcDU5M/vca/7LOqm9bc5tcMDk0YJ9t9gRCmtsIBaz7ZBjcVB+pg6bnXTMfGwxnbvdIMTXhz+58j/Zo2Um39ZUgSWmSRGjrrWmfhIRUHXcksHt/NfMoTeCDM1YhMPkqzMzGm36nXTiM70kTYvfdGg2aQnfvrW83oI+R7/t+f5M5usRoXW9HtR2LQWtjA3Ab/ebDJKiPqmTrjKrZY9K3D09OWPLhJoAkAx/NSixuA13fReSmZtjyUYLhMmByy6167wk9DxKDXErc9LgdpU0t5lepIzyPSjIuhKp8l4lGQCVmTFBwfyKzhXlLpp3g0lubccHbYKJpPZ1knqNo447qiWJWOxkbU33doTpuR8/Ufb9h0V/WSaA8h1syNtFAeZxeZjcjRKqC4bgnAY/3jBuIAawxdQadN0rGuYkMrUc92l5JW3dX1WWWlRxXbqhIisaH4nu8sgbUaeeKb6sReobzWHKYB/2ea8Z9f6RWbxjsTbXvxIy5TZfi0MrLMjryM0ejDgmAOpoOx6KX2WESPjHND/HU8Iis3Fy10TMdCE+Jw6en1SyIknNtMYIW1rnoaGZZd9mo20WkkjmjZklCqjTkLnP5KsZI1Fpq1jZB2JxOYAq8RzJ4V/WVYoThrhkJOo1DZNYtsV5qL3C2VIiMKdtnDQhAnDDJA+X4RnFF6eGmONIwNUQwhD8EHmlLuyXhpnF29jHLoDuJ1wCSl2kRpHECskxCdz4W+BGZO8KYAIvjKPNatBSon6Vor7wIF1iAobZJGPW0ASkgWB3HVt7AlYJTny1BfACa9aHp5SnNRQlZ5arWrbEHeFDAiWo0lLOXDJ0wR0kv3yzQkTHRTwU7k1MjLXKt9lyVnMjQPuQSKKVSmKbXu/cRAS655paqroYBl7sulXC2pLAZ6txgob9ZayZDKOuBSzQFclMhP69qKy78DEyXHKlcUjKN2fENucgdHroz40XPOz5XcMayaRgKTL5OXokakMlajDxdnbFZpbqtaGYmHos+09GCC3G33rtub7FCKjyDH5TGcNwWEN7ES+Ei2RvveA4P81BEpTt0Qjc0uRbzHZjNJFewIT2BSwXtFyVuxvUmzNi8F08i64i0CRrIyUQOEeFI/u4RQRsiF0IRpZzXCMxmo/TWYSV30OjoiRl10eRT3ie+sRbbUtDij1aTU0KDNnkyv9jyZcrdpdaY05/THkMYVSbrmB45dOfelkZJzRZS4kiU8mZe1cmZ3BEpE02SOnv9TJkxcYVg89PfWub16c1li+fY2XggKL0Rryj1D27FuyygQgdCs1XCkJzPJXIMZR9OMoPXSA1AEs84xVuVFUzB0apMuJ1CgYrJp/2g7gZAWkBSriHL9nYQJZDfhbK2FiVSxORBe/ImpoJYYg2S7TeeOsCecDt5ikEnvZOtoiOY/UR4y2qDIf78yQnLeTW7//xNjLHRSADQjkxAQtQhhSdToAY2N6fBrATrokgwsjF1FJCz0Kn1PGgMVttAG17uoO0xzS7FedGM8maEZDObOY7KAdqRGMhwDxIFuUlKIOrXQvSNbUb8LJbmygemBGGZvWU9kzkqQtbPSpHfF6+91PStj5egje2M0Skmt2ipud/VBnSvRxyES6+BkEWaNJAFxaXgmc95cORD0t8kNzggBBsWI7ow3NENRXtFIUlSh+1kKFIQMX7BApnCg+rvZlbq44f5KPJjsLgn8/3YPvMoeN/76N6Jl9npNBv7UND+2GPg4aMfvJMvbzEkdg2sGIHZeP5t+O3sOU3XYMIylf4RntJM3Sj6PQCH+iYbhgdV+W+zOee55b5/J3+ENgkYze9QupXE9hUmkgYM7bjDmAnMAYvoae8wL4SlB+jeywnhNx/dvXf3b/Pe7XsP6kZflWGOBXEUMsJLBknA4Hj1WAsUZT+oW+sD1kRXvun85I8nONhxkLQ5sP/27fPnzn7AQu5C8bfzYv58RuPdO3e//eZh9vHXHo+ds/fJe3gWaJtlYG9J/+qPD+aPHbqLnZBeRwnrrVlbbPi7trD8V8mq5JMP2Ky8hIn/Lu90PZK8QgSKjKW//zw48Nd2/JtrVDdWDa8gRJkTAz5DDzXmChnjroZVvxSvuz4SCUatJ3XXcEN1wjwIVmeEGlke1B4ohsnliXNpwiQzxzoigciGxJEAIxiqkyKhzOuVrGnIve16aiSeLsGl15adxYGaB+lkQz36cY6Sl5EleObzvbpK5tVqG4HGPBGUy/5RpSUpUGVzeyKLVJG2mZ3IM699vv+2enwq+X+tBZSrCQ5GZ44fJJ+CyAZ5vrbynNLKA+hzAkGbmNpDKLIoKT2tXnRK5dM4nJVmaEw1lDIPMgmjVFf4m/ACyy4/FpPci7hmUMHyrjuuXOQfCF9k9t7NIQoIVf7ysXiH1UMaEgUTo4Vx5dy8fdNkyZABPHQL0olDjB0Sk7HZyP77A3wdD4p9H5vKvpgoWvTrBccdXA8Y9o9YuFNi6XRjdboGea4GssJQtj++QdVaKg68BULkB9ab4ZbMwiRndbZ7x5U2Kwnrd1S5ipQbsp6UmVkjcVylcAYaTDjgGaf4iUuzY82ZqEC8JMCmxPTPkRL2NAleDzUTIBs2zzy+EIZqbOOlwa543Wsd2PNNnHpiR6+VfeUOyzHwfj1TkxVRqzz1Okx0fIdJN5iAvNWDzX4nHKLxYk/ZvvMCB64UE3wMRk/PrjqNi5YV0WwowybJ85ZtlDs4NSY9YKjJu0fNdsW2qtoc/yAmEJs4WPyAreHF6nQKzvAoTU7bu0oyTOBCzRIbOzb2YkUxdINoxAzpHNJVqgb37RiYSongxKo0Ito6fSqQTL0SYJfbjEjLaOETqhnvYAX3H1vYlmn6bZfSS/uv9XQBHNbwsQ6oJbCarUBcnpkZGTzsqlStaOmQqG4sV4JitSDmJ8T+/rRiS+oqJFwuuh4n1G00gLBYi7oqM+sNeoXFlGf5nPnwzyvRGTq9WzYCUg5gfBeLKzCT6ByWAxRW/ahU4WFO3zOezms1rRFr8sh4vYxgXo8kyvfgCrmbl+ZDQ0KGEi28am+2NL7Fh5obtS5ae7IjpPhBwUrUBhoEIQi6ixMg8gFqa5aYyyUgnxAKorKrVLxq+TvUTgHIByIHoe/hccdSRlFS8upmGzz5eX8+KYHg5Er6YgBPvTUqWZpEm1sj6ARwPZV34su+FB9VqzWY1JqIQc3+GhWvGQTO8NDO60mM2ZkDoYct4SH9YkmlRlS5DAfb10rqSLPZtrhA/LRXkSW+5DGVtX0rZSOpLmTmmsEFDqsjX9X/zzqUyfdOhb7c4W2AcRb31Sdh2ic74sruRu6tBCtkN998JwBOAh6YrmnhcpC+0jspzgBJJRRuktt5Kz9VFUutlZkzrJKLsztuh0f2BMhuQJeA2IHB7j5XXm0sxBPKneID0w2Yih+S918l20MJzhv4XZGhVFk7v2BmrbkEEGFlKms9RIwRE6x6/gIxxBjBvPDTdKMyQjn8Oxpj9MFphhR3JB1US65KqqweUQqvBaN0gHR3rtHoCGacVoTkAkgQkiE6eyUaGoUUqR6EHzNJOmLGLDaSCWEmk6SAGoe7/+D7v4+F8aCGGiOEhJTdudmVnzXF0i27jF1crM9nspZsoh6aijRZlve/3G7rWX2/LQAQZiyMZCFJNMl2TSQ9Bf9Ik9zQUqitIapKoGK9puEh3GwmhvYREdJ84Ydx/AwEc09WQNg4EQq/aBCfUDsLtLVNSKAwEbabDtYKvteDtZYAU218W3YXR1bEFWfNKh4pPbjW8qton+lmEDbkCoTgKu3Ka0o7JaRadmhdRW9Ku70eNwzBPfLBpfbhz4+oJgJYgZ8h5bviReZqPvJX46tbalfobwqdG0MotKQVMMu3ynhl6MeNuXR/TJsfmCLZfgJuDNQPR6SAPFKvjvKtAqxBg7o63dskK4Q4foaiy7Z65uuxQrPPntVQQ8nxzcIKLG1gR+KnSkfq1srG9HzaDgUnwFCVlfngdDMtJmdARpE3967LqcQ5tuu3iyK81R2zbx/SfeCE4JxdKXBt4eH6qH2ELELgnicYq0DQxQY6zA2DQgyksdZvVbSN+7AByJObxI5K4tKp4wXRZxxkzDq9Ovg+CQbFG7PdWhnKW/CvQWFdQNkZ1ohP+TrP4itTfILNEaOQF3p+Vl9zLqQnGXNViFglYtoVE3VriPSFzmohZqnYSchZQ5n1AWqOLo126lxg1TF0nYwViELoFFjmpLVmStctgr3zGaRKKIbvUKURjSRE/RVmhfqgEfgYiNLSAC/knHHSK4jDR30vHi8GDI0GqmYoa8Zp1EnBjdAtapuxrhC86AA1zRACU7AVLBzV4PGeEhIszWyGkt4FvbclwO0BCk548S1PBhP0WyWRQUtxQFRCs6yEChr3mvfGWBAFSVE8ki6OQlph6anu0435JbN/QwN2V+t769K6z7yJqv6i4/3V0t2pSeNCVJbSvpJDb4oIK+IDNSkS+wM481DjeYF170yrwqUw59IwzrA4bi7yCcqty1GT96RlKFk/WbE7sVUte0iWZUAh2xqaUyS+oydBnTTh5tMozj0yhKI49bQGvLHmhx7+bF5reJrOZtClLVyIVRdhV9vNcKe87fd6zjqm09kMmmsmkRdNUWgDj38D6nrNZYRi61tstRjayjKMEFER2mQj90Tgn+ShkHn5aRRj3wAsJzKlUpYQb1j+NgwpgNldIpW732qD52A0K1Em/VIqVUdkSoiUBOgGblkAY1oZg0iaSAEAfaQCrJKJY0zUtKCUP5OvdJKnomp8Wy10OI8q6zyhSNMII5HoomvEpmDXyP8/+u0vt/qW5FW/RP7Xwf4M1V9Fn2BKChEoEszFdNqluG8SqMJtNC/b793zgY93qkC/z+2Pf3wu9PX04jL3Dvbc9uK5tT+/ZfoxNFwe7c5I1xjSrDsSYAyborwa7y4ual6DVJNwsSc3wXNm7szJQPwLQT83V1Ra5kNHavIxWJDOieFzzjBFiZDP99Bjv9aTz6IOOJRoy4uFONRwtaM5vvwyDjVWJn3++amyfyEASkUxbU12uyL327TdXZA6J8+yT/jOqOoHB1IK2pWHoWFnpCoTVAn/4kqrwHPLrzXYa6MVbs73F9/kOm8EnRvgnMpieKUzQi36q/FykFVszFlh48+z3iQ+3cmYGCGyNimTIyR8dmukrtPF3xj0zOdGfSULhvuzCCHumT1Y0dMu69/IvniK0MTEloogVPXH2THT2gFPzwmCLfRfIK22NxJS/U2+wyMThiVkA8627Fd3jz4EYVXdlEVBkPFD7ABVLTZhCFCGhgGwmjpmK++v1U+X5ZPCPf3kmPPNe++9e70qHmIVHKdXoj0BtAsf/27y1e03vhhwZK5kwfo8zwplb4H9GLi5jQMBGLwH/967i2iPtto9Weq2BKtvcOgtm8iDz/3xH4Bp0tTeLdo74wAlXdYj6vbonLUyyvkrf5VKA3FGPhLWPHN4H5sGfvfpo9JFOKCuGcqvsFJlw6/IimiuOQhvFR/St8IODN9KXCFPE8BVmaXq2kpqlzcWKU500FQUpgSmJPLvay1i3IQIQj5orOMxvEmyNtdOgDgWHdsEcUNi3sEDN1bAI403ohOdDQPCQRvVlPE0DXZCPVUfFOmmbPrfSptgJ5NW/jx5wG8HDHtKjQC4pth7n/6DwtTm4yTw0UTSrm5PaE9nT5Feh7cp2L9dRIH5AF3dvXvnRLzGuI3O4LvfYBU/v9AkFqxydHz4nv7m3TP+6j659AdhRPrfVFFVkHJFCk9Wgas5R+eUBrvq1b+2NQchuP/Eyl1vPvA+Affh529/9OFH7zz9wfoeZZPTDInRatpGCBSs+SV2Df5RqElJd/Bi9fW93rFv6MUz0KKokgTy6YFqT98A9xvnnTf22xh39v/5AJP7eYSAgKz/lCx5P/q8S5mABK/tzJ+XxYuyl1jN833aRppq+hZ1qqyeoog3ApZSJppURdpd5vuuTb4FSV2lLPL5QmCFYo3Pk7SrGqpdNjEnJTpSiETofA8GLD1Ayn846Rl8XsZ075TPYp/q+Js09hJHDNE/3vDMR4gf5t1iWOgqxdT38jUAe4PxrItOV+1jFWyGjoLoocMBe/EoZipRauDwVC2uyTheQ4dcWRdaf+RPdrJtdQeJUzHt/4BaGSDLcBgpk/2huU1Y/SfMmARj+zXW9Yqg7BD42ooBIYSSlstbh5cNNco17NcrMb2MnbQwqtEE3T1gjSBAXit6SM8VUECER0VlHUwidzYJHqWzGxJRuRMs9uh5qXxbmQBouFEu5w4adfz9D9Of74oXsOBv+PbpkUM9gEo+35OFem5RkhvsEsIzapdfDr+ZlwLcCxwsLaunvwhTj4nwoHoE2rsg5PNsQGRrLwr9PI/Aeqmvkf4Rue1wbKDKfpzm8MFWGSg3zKBvTBd6YXolHFri16BljB0scW9OJsYSzp+SJDhmsW+aAWltkkl2LyvywqLVBNlaHwxqIonBy73na94nZUnPBwHYirN5Tf/94Z9lebjaURJddeY1yyTH4y6Xnc5Ks4F0t6J9Zx3n51OT27UPwPmM3iFGzXIczDQ/N9psd19qIq1pPC9essPOSWI6EUs9m4Gsm4SPZ5InzJ4bH+tnvxEnL9MTETrEQOs4COsOwuKdZr0Wld//u1Kq2NPLw6k1cca5wqT5DuuW36iyhhjzhK+s05mDVQnmRL5oFwBF/U5ouwnGTDMr1fVwW5WlyYZYEtNfcmsXNcc3sHFeQJwxbvZOr13SW8vc50lIGCaMPfB0e+boHTjRlEGBN3tP/fV0pdefON/zHDpOmdAV6zaJ78+nHo/6Zky4/6KYxH45oaf3QYCAyX26CCMu/uW3X04L6DqvSDqISoN8AX/3/Hgnu6TuwI+w8pOfmudfbufA9TN5S+Wf/se3+f//yTw2V6bl3DzTQ2MRujtLPEaJRuQgYz14N2ZTAg0cVfS15pjwW/slUxdVx2t64wm8H4ATzTNNjQVuZ0tJr7ybp/oCS6Z4X/tBjq1c3nhgHJ3pTI5OjLdoDIELc9AKXpsa6rV4QXH8ACLslq87UUVdX4UwIK2JzomLTrcbeHJ1336+aPCWenD5oeNudCwjNus06Um7Fi5eGdouhuUClVogDIKvLcYmufD8phcRoGcNQ6liHxoOKmCoiokaKu4JyNkbz0SlYdxd0JIg0lJ7yotcZzstx6lbtY8IGEJZP6FNT+d4BP3WG890Z+cWT5zh8c4gMsHL3Ml22SwoIZlvhnwfhci1HdcB0uHkzShaqLY2SWpvsQDzV1TjRHg+WBXmNlxE0pRgoreAE1qNT01P39KzjpcImbZAhK5doReFZw5qOM50FIRKFxSj16MB3Td7RcNeLQYGhBfA/9okEPvjE1ZnKkHJVOfe33nC0Lo/5s0r9wT52Q/n+qQVnQeuSRKQBY/XCz5oiDmzx88Ch3nj/OwOU5WPAZnPlVnEtuYw5rPiPfXjLOGqFeJ4nMEs5SmaMcWabo1ln9OkuRrp1lypjoJKCFVTlWNj94a548paoFTDDUIUYDBFkefaVmZnXo02oMS7Jp+wNcAoWqX3mtm7TBLWnSCVmChg4phkaIRKQ+ZXa0vDELg35oaSmuBZEyVwWSffPH/13uddfAtq1PHGEkOv7scEYxKogi6qrWz6tOjaFggkh38EQ0Lrkq/XLsqiN6ic5ASw4HDnjm2Z3YtsrqGXAWK+0ItgLANcz+1VxwYSLdbyrh/ivDk6IUi92zoiRUmxZymMIjBZe5ytqcTg3jgsyK5TbuKp0GajP6fD8LQSg1RIV0014EYb1OKxJk1c2gko8p2ET5qUhwxo7be33v3okx/++3//4PCkVGu0Wo16o6mt1ptdGSsKVommGbafGa2MLwZBx1pwHbpQveC149i7uyqSoGut2+6KYrfBVy8bV7VKpXx+/P9f7yPwjnN3XUp02/ZzKwXFY7Uada7b7FTTjKVtgWsp4vfaJ5eO8Lrck14geh3SYmyQxMp4bO389OzsvOYeF/cTI+GcmudZOCSPmKgZOfuKdcMWy2kUWsPTl8IenO3zKhVNmWWIiJ/al3awL/kEeScC5j7FLbwR3HdL3ZD8rxYkXIGIpBDDiMxw290VlcX1l3PHTpwAPE1IKmtdXvixTQYmBG/SGTes7tFq42dGVO/E0nHSGl53kOyoScLzvFnBC4Z5PuobyPqICwFgvVSZhGGNUQPQ4nKhBcJafY80HAphGLgMZZ5A1ZcCmAp/RswJO+qfaK/iJiMfe3HZHB0zIr4Pf70cTzwjf30nAH/98NfmBk8P84+rgmiQeMtcRbj659dk6hcTYgi561RDuhRjFAg+KxWJWxEEhf7zQZS9oKzo2xFF4OljkScHD4An4oMzv7lnxjPvQ0cYBQB4fqe27O3Qx7qn5mtNXZyXPgCQAQYAAAjA/5EoLuGDT+jGwoHubM/Qm8yeqfNXJIojn4yD0UNvCmePgmM/iobcznIIlXRoCpbTKmE8OqkF5cDzIUEiuzNyAju39ZVTytc7gX/TTrxPgmOfCPbgiN9I/zBGTq0P7bIgvuq2j80XT5x6ybNVdFzjttQhyrE/O6XgWM2XFCsvVo6CPb/p65V6vPUKnFDc/uvGstet3AUmO6X6eH0oZx5T1OUzCMjbhp3aujLyusKPzilFNuORFg5YrUfvXvjFr3kWS9hod/3NlxTgY0+LTltCSRZ6+6XoYSq+3DLXEo2yQJU9cM86K5a5wF7b5fyy+igX2OZne3vOM915i4WHur99RsqO7W/nnHNYJw8bvgaoAxyVBheUWLMVJ3TyLSvRr8LLfrcnXvu3B0zRFTd5HrNNbsD8dVF9ehOu/Gupxz/m5S89ukv7w1Vz+R+u/6nvGGvjVqap/fmHRonv1jKY+STj1q2y50n0JKwihF7qYEn3/id3GLFnb6NyYqfRSlxHys9gJCl6r+X4+MnZ2GvTpFSvN6fWe7thY3jp35fkwm8ZbZJFqtM0a8t4A+Do5DVN9HKExnG+eo4OeoajNNHLkfClsYekAKcUz/w0CZVq/vTGnAxtaMUZ1ONGfmn8EcAAWBtDAHkaANwr3CcIh0IEw5QZCHjnDkRcUwAJ+yRDRpSAzsQjrAEBMIRaiOkWIj015iEDlWkoYGWIRSDVAAMk0jEDd4EwwQu7OtmcNrps8fnkB9CId9BecbZItlesaPsE2C+ZnyR7RYtzyDbx4sTHGm42SX0hPGS/h7MgVviZyYzEp7y/9WiHezKiQSNHlhy7T5HkUFzzksIufKUiRUlWrjwTHCKzkrtH9kkSfcjJQ3af/dFiLcc/yJG/LudH/Kl8FXYjB21ykpnoES4J9ymvqiLnQ9zpuXAnnpDXjbPKzzrz/KB0Q3nj1BN8+iwWhveqiKWfS3vA/jI896sl3XLM5443EL+P94SvwwLeWzqy1Vko7BORok2PHRY2+33Z2m2lD72ujG9c8ZJ4Bkz7pXXG1U9EKwD4HgbDT8L8xz4NCjkTCLfcW0L7dXjkZyuIuHDV6bEuT6QX/v5VIkh0+0Wkp8645rrV/iSVa3i3Xr+K0mct2eNeb/+3noL9Bz4vRpyDKmziL95mY5QSxBETZQZ+VuV/kqU4wluHbQtRGuLdtkul8anPpM8/VumoG3aYoLVTkJN2CZYhU5ZjchPfGHfHJ3Ibl9ZSGbNEw/8vFnMICZERBe6Z9t4MS+Ys4egbRKrxVPnRCWaQsbIhVESDRTAIEcqHnEXocNMtfto80OhbTf7rinotvvf9xBRbhBjIDDGRObKI4iTNIMKEMi7yoqyk0qa2Tes63w+L5Wq9ORunCxcvXb5y9dr1GzcRDEhGpgj8mVnKcVWsLX2uP7aYNbgER6XwlqpqEOxRqThzMusNq/XKJ4aABuEq6MtAbjQPL59iJUqVYZSr4BcQVKlKtRohterMUy+s4evnO7QMD+n4gvoPWKZT13fU/3sAGByBRKExWByeQCSRKVQancFksTlcHl8gFIklUlkUyEa/aztejiqUKrVGq9MbjCazxWqzO1Y0iWCu1zrfr41MOPr+fMquJv1Gy6fH5UZ9Ntw62Ha0ERFDJVQQy/Gri++/DdEDh5nt7uoa93bTHoI6ZP2lfte3cANcxXY6paD+MDgY+Gg3Yt7BIREehrnaJWhRyxJgmH/CX4T9/rI/inR/Pw70NpHrSkI8Lyj+7lAvh6ud8pZJUrcE2ahj4m2bO49KtRPZzEIJWMBBHQgftgxwFSGuRzprqIOCRsOIFGXByUTqpMsM7TlBGNswLWUdIuhBB4dUMkVl7sea+RCQWNyUCz3uk3Jmvof1Nhz5Y3WgdkDX1PE2QaRQk4YNEjISCsZayMZJsZa619r3m0LrNKOz6pLZCMO4lgRoLUbv0MvqJD8EpUnsPO/oIOVSadc6Lm/JfJRhtBIAErAqpxjfij1Xi2vH07ltY08btuVaJiLGMKBGs1dCM9fdT+ia+DxJZCVbPCRTD6p8kdKGsKSesMlC2htxTbVZ3QtjX6DGpmKjKt01uecbiavPy/Xbm9vblALT8uGlVsvG9XkWWv48c2Gzmubba1F7cJLRx0fIKKXjvdhfOntO+uNpuOYXSnWmZf2RbTxK04ivgx8X1P0VgSoVodGAVvXAblRDqbkFFsX5Aem2OB3EGaAuMO30VyDr5BZtDEAMPitSXHMm1+ZHoXZszLdIDiBkCNwjtbkMgqbXc1VYTIFX7dZJFImB19tIH6Tq45Qpar6PhAnSpoND4jJaN0aGRwyyQBCHxgHbSpDNeEg4rDCKO4YXw+4GXkBIKJDfUwygYYqvO1W5QCdrWSLyApxTcfg9lPOH5d0gxtqv3caxM1CWUDURIsQIswFTIFQ5IJJWefFHbWnKzddHXzGWylPyW3RkAEBOTFAloHol6VgF0M0BYc1rqaTOAEIrA5X09VRujWJhB15hHaDqc2wnl4J+d9o3UBkHQPqIqghUaaASHsxf4GpYcm8kFD3aAeh+RLf8RhWnpwnEnziT9dWptsmOrfRw72l/rUMzDvJ+tV+eHRzdbH+V9wHAl8OlZ8zQDwzXhVJklkpZScZLLj377COprPjAt+SNtGPJL5jVJYNVWQkCwIOhxIERsyYKkRA7y1Ff/5YN6vhCePiSh4XbAQit8RP+CC3ymnehsy94TdNDxfH/K6f+x5Jf71f/T1pObgQAAA==) format("woff2")}
.ghp-header-trigger{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;transition:background .12s ease,color .12s ease}
.ghp-header-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#111827)}
.ghp-header-trigger:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}

.ghp-root{--ghp-font-ui:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans","PingFang SC","Microsoft YaHei",sans-serif;--ghp-font-code:"JetBrains Mono","Cascadia Code","Fira Code",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--ds-font-family-code:var(--ghp-font-code);display:flex;flex-direction:column;flex:1 1 auto;height:100%;min-width:0;min-height:0;color:var(--dsw-alias-label-primary,#111827);font-family:var(--ghp-font-ui);font-size:var(--dsh-content-font-size-secondary,13px);line-height:1.5;-webkit-font-smoothing:antialiased}
.ghp-head{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;flex:none;min-width:0}
.ghp-head-repo{display:flex;align-items:center;gap:6px;min-width:0;color:var(--dsw-alias-label-secondary,#6b7280);flex:1}
.ghp-head-name{font-weight:600;color:var(--dsw-alias-label-primary,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ghp-head-viewer{flex:none;max-width:140px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ghp-head-actions{display:flex;align-items:center;gap:2px;margin-left:auto;flex:none}
.ghp-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;text-decoration:none;flex:none}
.ghp-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#111827)}
.ghp-icon-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}

.ghp-tabs{display:flex;align-items:center;gap:2px;padding:0 8px 8px;flex:none;min-width:0;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2))}
.ghp-tabs-spacer{flex:1;min-width:4px}
.ghp-tab{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
.ghp-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-primary,#111827)}
.ghp-tab[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#111827);font-weight:600}
.ghp-tab svg{opacity:.75}
.ghp-tab:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-select{flex:none;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.28));border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary,#111827);font-size:12px}
.ghp-select:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}

.ghp-panel{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.ghp-updated{display:flex;align-items:center;gap:6px;padding:6px 12px 2px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;flex:none;min-height:24px}
.ghp-list{flex:1;min-height:0;overflow:auto;padding:0 6px 12px;scrollbar-gutter:stable}
.ghp-row{display:flex;align-items:flex-start;gap:8px;width:100%;padding:9px 8px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}
.ghp-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}
.ghp-row:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:-2px}
.ghp-row-icon{display:inline-flex;margin-top:2px;color:var(--dsw-alias-label-secondary,#6b7280);flex:none}
.ghp-row-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.ghp-row-title{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.45}
.ghp-row-meta{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;white-space:nowrap;overflow:hidden}
.ghp-row-comments{display:inline-flex;align-items:center;gap:2px}
.ghp-row-tail{flex:none;margin-top:2px}
.ghp-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:36px 16px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12.5px;text-align:center}

.ghp-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none}
.ghp-dot-open{background:var(--dsw-alias-state-success-primary,#22c55e)}
.ghp-dot-merged{background:var(--dsw-alias-state-business-primary,#8b5cf6)}
.ghp-dot-closed{background:var(--dsw-alias-state-error-primary,#ef4444)}
.ghp-dot-draft{background:var(--dsw-alias-label-secondary,#94a3b8)}
.ghp-dot-unknown{background:var(--dsw-alias-label-secondary,#94a3b8)}
.ghp-dot-answered{background:var(--dsw-alias-state-success-primary,#22c55e)}
.ghp-dot-unanswered{background:var(--dsw-alias-label-secondary,#94a3b8)}
.ghp-check-dot-ok,.ghp-ci-dot-ok{background:var(--dsw-alias-state-success-primary,#22c55e)}
.ghp-check-dot-bad,.ghp-ci-dot-bad{background:var(--dsw-alias-state-error-primary,#ef4444)}
.ghp-check-dot-wait,.ghp-ci-dot-wait{background:var(--dsw-alias-state-warn-primary,#f59e0b)}
.ghp-check-dot-idle,.ghp-ci-dot-idle{background:var(--dsw-alias-label-secondary,#94a3b8)}
.ghp-state-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap}
.ghp-state-answered{color:var(--dsw-alias-state-success-primary,#16a34a)}

.ghp-avatar{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:600;flex:none;user-select:none}
.ghp-label{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border:1px solid;border-radius:10px;font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary,#111827);white-space:nowrap}
.ghp-label-dot{width:6px;height:6px;border-radius:50%}

.ghp-status{display:flex;flex-direction:column;align-items:flex-start;gap:9px;padding:22px 16px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12.5px}
.ghp-status-title{color:var(--dsw-alias-label-primary,#111827);font-weight:600;font-size:13px}
.ghp-status-detail{word-break:break-word;line-height:1.5;font-size:12.5px}
.ghp-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:var(--dsw-radius-sm,8px);border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.3));background:transparent;color:var(--dsw-alias-label-primary,#111827);font-size:12px;cursor:pointer}
.ghp-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.ghp-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-spinner{display:inline-block;width:13px;height:13px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));border-top-color:var(--dsw-alias-state-business-primary,#2563eb);animation:ghp-spin .8s linear infinite;flex:none}
@keyframes ghp-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.ghp-spinner{animation-duration:2.4s}}

.ghp-detail{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;container-type:inline-size}
.ghp-detail-toolbar{display:flex;align-items:center;gap:8px;padding:4px 10px 2px;flex:none;min-width:0}
.ghp-detail-status{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:4px 8px;padding:2px 10px 4px;flex:none;min-width:0}
.ghp-detail-number{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);font-weight:600;flex:none}
.ghp-toolbar-spacer{flex:1;min-width:4px}
.ghp-toolbar-updated{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);flex:none}
.ghp-view-tabs{display:flex;align-items:center;gap:2px;margin-left:4px;min-width:0}
.ghp-view-tab{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
.ghp-view-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-primary,#111827)}
.ghp-view-tab[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#111827);font-weight:600}
.ghp-view-tab:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-view-count{display:inline-flex;gap:5px;font-size:12px}
.ghp-detail-scroll{flex:1;min-height:0;overflow:auto;padding:8px 20px 32px;scrollbar-gutter:stable}
.ghp-summary-grid{display:flex;flex-direction:column;gap:24px;max-width:1100px;margin:0 auto}
.ghp-summary-main{min-width:0;max-width:840px}
.ghp-summary-side{min-width:0}
@container (min-width: 780px){.ghp-summary-grid{display:grid;grid-template-columns:minmax(0,1fr) 252px;gap:32px;align-items:start}.ghp-summary-side{position:sticky;top:0;max-height:calc(100vh - 180px);overflow:auto;overscroll-behavior:contain;padding-right:6px;scrollbar-gutter:stable}}

.ghp-detail-title-row{display:flex;align-items:flex-start;gap:10px;padding-top:4px}
.ghp-detail-title{margin:0;font-size:22px;line-height:1.3;font-weight:600;flex:1;word-break:break-word}
.ghp-detail-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:13px}
.ghp-detail-author{font-weight:600;color:var(--dsw-alias-label-primary,#111827)}
.ghp-detail-sep{opacity:.5}
.ghp-category{margin-left:4px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));font-size:12px}
.ghp-labels{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.ghp-facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-fact{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));line-height:1.4}
.ghp-fact-ok{color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-fact-bad{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-fact-wait{color:var(--dsw-alias-state-warn-primary,#d97706)}
.ghp-ref{padding:1px 5px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));font-size:12px;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)}
.ghp-arrow{opacity:.55}
.ghp-add{color:var(--dsw-alias-state-success-primary,#16a34a);font-weight:600}
.ghp-del{color:var(--dsw-alias-state-error-primary,#dc2626);font-weight:600}
.ghp-warn{color:var(--dsw-alias-state-warn-primary,#d97706);font-weight:600}
.ghp-muted{color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px}
.ghp-body-md{margin-top:18px}

.ghp-activity{margin-top:26px}
.ghp-activity-head{display:flex;align-items:center;justify-content:space-between;gap:10px 12px;flex-wrap:wrap;font-size:15px;font-weight:600;padding:0 0 10px;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2));margin-bottom:10px}
.ghp-activity-tools{display:flex;align-items:center;gap:6px;flex:none;font-weight:400}
.ghp-act-row{display:flex;align-items:center;gap:8px;margin:0 -8px;padding:6px 8px;border-radius:var(--dsw-radius-sm,8px);color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;min-width:0}
.ghp-act-text{color:var(--dsw-alias-label-primary,#111827);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-act-text strong{font-weight:600}
.ghp-act-time{margin-left:auto;flex:none;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px}
.ghp-act-card-head .ghp-act-time,.ghp-thread-comment-head .ghp-act-time,.ghp-inline-comment-head .ghp-act-time{margin-left:0}
.ghp-act-commit-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary,#111827)}
.ghp-act-commit .ghp-commit-oid{margin:0}
.ghp-act-card{border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.24));border-radius:var(--dsw-radius-md,12px);margin:0}
.ghp-act-card-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06));border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18));border-radius:var(--dsw-radius-md,12px) var(--dsw-radius-md,12px) 0 0;min-width:0}
.ghp-act-author{font-weight:600;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-act-card-body{padding:10px 12px}
.ghp-review-badge{padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-review-badge.ghp-review-approved{color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-review-badge.ghp-review-changes_requested{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-thread-meta{display:flex;align-items:center;gap:6px;margin-bottom:8px;min-width:0}
.ghp-thread-file{padding:1px 6px;border-radius:5px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ghp-thread-resolved{flex:none;white-space:nowrap;padding:1px 7px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 14%,transparent);color:var(--dsw-alias-state-success-primary,#16a34a);font-size:11px;font-weight:600}
.ghp-thread-comment + .ghp-thread-comment{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18))}

.ghp-side{border-top:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2));padding-top:14px;margin-top:14px}
.ghp-side:first-child{border-top:0;padding-top:0;margin-top:0}
.ghp-side-head{display:flex;align-items:center;gap:6px;width:100%;margin:0 0 8px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.ghp-side-head:hover .ghp-side-title{color:var(--dsw-alias-label-primary,#111827)}
.ghp-side-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-side-count{min-width:18px;margin-left:2px;padding:0 5px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-secondary,#6b7280);font-size:11px;text-align:center}
.ghp-side-body{min-width:0}
.ghp-side-comments{display:flex;flex-direction:column;gap:7px}
.ghp-side-comment{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);min-width:0}
.ghp-side-comment-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-side-more{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);padding-top:4px}
.ghp-side-state{font-size:12px;color:var(--dsw-alias-label-primary,#111827)}
.ghp-check-summary{font-size:12px;font-weight:600;margin-bottom:6px}
.ghp-check-summary-ok{color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-check-summary-bad{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-check-summary-wait{color:var(--dsw-alias-state-warn-primary,#d97706)}

.ghp-people{display:flex;flex-direction:column;gap:5px}
.ghp-person{display:flex;align-items:center;gap:6px;font-size:12px;min-width:0}
.ghp-person-name{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-review-state{margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);flex:none}
.ghp-review-approved{color:var(--dsw-alias-state-success-primary,#16a34a);font-weight:600}
.ghp-review-changes_requested{color:var(--dsw-alias-state-error-primary,#dc2626);font-weight:600}
.ghp-checks{display:flex;flex-direction:column;gap:4px}
.ghp-check{display:flex;align-items:center;gap:7px;font-size:12px;min-width:0}
.ghp-check-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ghp-check-state{margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);flex:none}
.ghp-link{color:inherit;text-decoration:none}
.ghp-link:hover{text-decoration:underline}
.ghp-files{display:flex;flex-direction:column;gap:3px}
.ghp-file{display:flex;align-items:center;gap:8px;font-size:12px;min-width:0}
.ghp-file-path{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px}
.ghp-commits{display:flex;flex-direction:column;gap:3px}
.ghp-commit{display:flex;align-items:baseline;gap:8px;font-size:12px;min-width:0}
.ghp-commit-oid{flex:none;padding:1px 5px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-commit-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.ghp-changes{flex:1;min-height:0;display:flex;flex-direction:column}
.ghp-changes-scroll{flex:1;min-height:0;overflow:auto;padding:0 16px 24px;scrollbar-gutter:stable}
.ghp-changes-scroll > :first-child{margin-top:12px}
.ghp-diff-file{border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.24));border-radius:var(--dsw-radius-md,12px);margin:0 0 12px}
.ghp-diff-file-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:var(--dsw-radius-md,12px) var(--dsw-radius-md,12px) 0 0;background-color:var(--dsw-specific-sidebar-fill,#f9fafb);background-image:linear-gradient(var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06)),var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06)));color:var(--dsw-alias-label-primary,#111827);font:inherit;text-align:left;cursor:pointer}
.ghp-diff-file-head:hover{background-image:linear-gradient(var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.12)),var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.12)))}
.ghp-diff-file-head:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:-2px}
.ghp-diff-chevron{display:inline-block;width:12px;flex:none;color:var(--dsw-alias-label-secondary,#6b7280);transition:transform .12s ease}
.ghp-diff-chevron-open{transform:rotate(90deg)}
.ghp-diff-path{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-diff-renamed{font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%}
.ghp-diff-counts{display:flex;gap:8px;font-size:12px;flex:none}
/* Every file keeps its own horizontal scroll; vertical scrolling stays on the page. */
.ghp-diff-body{overflow:auto;border-radius:0 0 calc(var(--dsw-radius-md,12px) - 1px) calc(var(--dsw-radius-md,12px) - 1px)}
.ghp-diff-table{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;line-height:1.55}
.ghp-diff-line{display:flex;width:100%;min-width:max-content}
.ghp-diff-lineno{flex:none;width:44px;padding:0 6px;text-align:right;color:var(--dsw-alias-label-secondary,#6b7280);opacity:.7;user-select:none;font-size:11px}
.ghp-diff-sign{flex:none;width:14px;text-align:center;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-diff-code{flex:1;white-space:pre;padding-right:14px}
.ghp-diff-line-add{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 12%,transparent)}
.ghp-diff-line-add .ghp-diff-sign{color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-diff-line-del{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent)}
.ghp-diff-line-del .ghp-diff-sign{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-diff-line-hunk{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 8%,transparent);color:var(--dsw-alias-state-business-primary,#2563eb);font-size:11.5px}
.ghp-diff-line-hunk .ghp-diff-lineno{display:none}
.ghp-diff-line-meta{color:var(--dsw-alias-label-secondary,#6b7280);font-style:italic}
.ghp-diff-more,.ghp-diff-empty{padding:8px 12px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);border-top:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18))}


.ghp-code{margin:0 0 14px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.24));border-radius:var(--dsw-radius-md,12px);overflow:hidden}
.ghp-code-head{display:flex;align-items:center;gap:8px;padding:4px 10px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06));border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18))}
.ghp-code-lang{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280);text-transform:lowercase}
.ghp-code-copy{margin-left:auto;height:22px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;cursor:pointer}
.ghp-code-copy:hover{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,#111827)}
.ghp-code-copy:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-code-pre{margin:0;padding:12px 14px;overflow:auto;font-size:12.5px;line-height:1.6;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);scrollbar-gutter:stable}
.ghp-code-pre code{font-family:inherit;white-space:pre}
.ghp-tok-comment{color:var(--dsw-alias-label-secondary,#6b7280);font-style:italic}
.ghp-tok-string{color:var(--dsw-alias-state-success-primary,#0f7a3d)}
.ghp-tok-keyword{color:var(--dsw-alias-state-business-primary,#1d4ed8);font-weight:600}
.ghp-tok-number{color:var(--dsw-alias-state-warn-primary,#b45309)}
.ghp-tok-function{color:var(--dsw-alias-state-business-primary,#7c3aed)}
.ghp-diff-add{color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-diff-del{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-diff-hunk{color:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-diff-ctx{color:var(--dsw-alias-label-secondary,#6b7280)}


.ghp-mermaid{margin:0 0 14px;padding:12px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.24));border-radius:var(--dsw-radius-md,12px);overflow:auto}
.ghp-mermaid svg{display:block;margin:0 auto;height:auto;max-width:none}
.ghp-mermaid-node{fill:var(--dsw-alias-interactive-bg-hover,rgba(37,99,235,.08));stroke:var(--dsw-alias-state-business-primary,#2563eb);stroke-width:1.2}
.ghp-mermaid-label{fill:var(--dsw-alias-label-primary,#111827);font-size:12px;font-family:var(--ghp-font-ui)}
.ghp-mermaid-edge{stroke:var(--dsw-alias-label-secondary,#94a3b8);stroke-width:1.3}
.ghp-mermaid-edge-dashed{stroke-dasharray:4 3}
.ghp-mermaid-arrow{fill:var(--dsw-alias-label-secondary,#94a3b8)}
.ghp-mermaid-edge-label{fill:var(--dsw-alias-label-secondary,#6b7280);font-size:11px}
.ghp-mermaid-subgraph{fill:color-mix(in srgb,var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12)) 55%,transparent);stroke:var(--dsw-alias-border-l3,rgba(127,127,127,.32));stroke-width:1;stroke-dasharray:5 3}
.ghp-mermaid-subgraph-label{fill:var(--dsw-alias-label-secondary,#6b7280);font-size:11px;font-weight:600}
.ghp-mermaid-note{margin-top:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-mermaid-fallback .ghp-code{margin:0}



.ghp-avatar-img{object-fit:cover;border-radius:50%;flex:none;display:inline-block;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.ghp-act-menu{position:relative;display:inline-flex;margin-left:auto;flex:none}
.ghp-icon-btn-sm{width:22px;height:22px;font-size:14px;line-height:1}
.ghp-menu{position:absolute;top:calc(100% + 4px);right:0;left:auto;z-index:20;min-width:172px;padding:4px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.26));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-layer-2,#fff);box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:2px}
.ghp-menu-up{top:auto;bottom:calc(100% + 4px)}
.ghp-menu-panel{width:252px;max-height:min(420px,62vh);overflow:auto;scrollbar-gutter:stable}
.ghp-menu-section{padding:6px 9px 4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280);text-transform:none}
.ghp-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:12.5px;text-align:left;text-decoration:none;cursor:pointer}
.ghp-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.ghp-menu-item svg{flex:none;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-menu-item-active{color:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-menu-item-off{color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-menu-item-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ghp-menu-item-count{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}
.ghp-menu-check{margin-left:auto;color:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-menu-check-cell{display:inline-flex;align-items:center;justify-content:center;width:14px;flex:none;color:var(--dsw-alias-state-business-primary,#2563eb);font-size:12px}
.ghp-menu-reset{position:sticky;bottom:0;margin-top:2px;padding-top:8px;background:var(--dsw-alias-bg-layer-2,#fff);border-top:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18));border-radius:0 0 6px 6px}
.ghp-act-feedback{position:absolute;top:calc(100% + 4px);right:0;z-index:21;padding:4px 8px;border-radius:6px;background:var(--dsw-alias-label-primary,#111827);color:var(--dsw-alias-bg-layer-2,#fff);font-size:11.5px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.2)}
.ghp-activity-title{font-size:15px;font-weight:600}
.ghp-act-filter{position:relative}
.ghp-tool-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.24));border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;flex:none}
.ghp-tool-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-primary,#111827)}
.ghp-tool-btn[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#111827)}
.ghp-tool-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-tool-dot{position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-activity-events{display:flex;flex-direction:column;gap:10px}
.ghp-act-link-row{text-decoration:none}
.ghp-act-link-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}
.ghp-act-chip{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;flex:none;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-act-chip-open{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 13%,transparent);color:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-act-chip-comment{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 11%,transparent);color:var(--dsw-alias-state-business-primary,#2563eb)}
.ghp-act-chip-approved{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 14%,transparent);color:var(--dsw-alias-state-success-primary,#16a34a)}
.ghp-act-chip-changes{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 12%,transparent);color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-act-chip-thread{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 15%,transparent);color:var(--dsw-alias-state-warn-primary,#b45309)}
.ghp-thread-comment-head{display:flex;align-items:center;gap:6px;margin-bottom:4px}
/* Inline threads sit on top of tinted diff rows, so they get a card surface and a tinted head. */
.ghp-inline-thread{margin:8px 0;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.28));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-2,#fff);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ghp-inline-thread:not(.ghp-inline-resolved){border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 38%,var(--dsw-alias-border-l3,rgba(127,127,127,.28)))}
.ghp-inline-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:calc(var(--dsw-radius-md,12px) - 1px) calc(var(--dsw-radius-md,12px) - 1px) 0 0;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 7%,var(--dsw-alias-bg-layer-2,#fff));border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18))}
.ghp-inline-resolved .ghp-inline-head{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 8%,var(--dsw-alias-bg-layer-2,#fff))}
.ghp-inline-toggle{display:inline-flex;align-items:center;gap:7px;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.ghp-inline-head .ghp-act-author{font-size:13px}
.ghp-inline-count{flex:none;white-space:nowrap;padding:1px 7px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-secondary,#6b7280);font-size:11px;font-weight:600}
.ghp-inline-head .ghp-act-menu{margin-left:auto}
.ghp-inline-body{padding:8px 12px 10px}
.ghp-inline-preview{display:-webkit-box;width:100%;padding:8px 12px 10px;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:12px;line-height:1.55;text-align:left;cursor:pointer;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ghp-inline-preview:hover{color:var(--dsw-alias-label-primary,#111827);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.ghp-inline-comment{padding:6px 0}
.ghp-inline-body .ghp-inline-comment:first-child{padding-top:2px}
.ghp-inline-comment + .ghp-inline-comment{border-top:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.16))}
.ghp-inline-comment-head{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.ghp-inline-comment-head .ghp-act-menu{margin-left:auto}
.ghp-inline-comment-body{font-size:13px}
.ghp-thread-open{flex:none;white-space:nowrap;padding:1px 7px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 14%,transparent);color:var(--dsw-alias-state-warn-primary,#b45309);font-size:11px;font-weight:600}
.ghp-changes-head{display:flex;align-items:center;gap:8px;flex:none;margin:0;padding:8px 16px;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2))}
.ghp-changes-actions{display:flex;align-items:center;gap:6px;flex:none}
.ghp-changes-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280)}
.ghp-changes-spacer{flex:1}
.ghp-seg{display:inline-flex;padding:2px;border-radius:7px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}
.ghp-seg-btn{height:24px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:12px;cursor:pointer}
.ghp-seg-btn-active{background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#111827);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.ghp-diff-split{display:flex;flex-direction:column}
.ghp-diff-split-row{display:grid;grid-template-columns:1fr 1fr;min-width:0}
.ghp-diff-split-meta{padding:2px 8px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 8%,transparent);color:var(--dsw-alias-state-business-primary,#2563eb);font-size:11.5px}
.ghp-diff-cell{display:flex;min-width:0;overflow:hidden;border-right:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.16))}
.ghp-diff-cell-empty{background:color-mix(in srgb,var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08)) 40%,transparent)}
.ghp-diff-cell-add{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 12%,transparent)}
.ghp-diff-cell-del{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent)}
.ghp-diff-split .ghp-diff-lineno{flex:none;width:38px}
.ghp-diff-split .ghp-diff-code{flex:1;white-space:pre;overflow:hidden;text-overflow:ellipsis;padding-right:8px;font-size:11.5px}
.ghp-diff-thread-count{display:inline-flex;align-items:center;gap:4px;flex:none;padding:1px 7px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 12%,transparent);color:var(--dsw-alias-state-business-primary,#2563eb);font-size:11px;font-weight:600}
.ghp-reviewbar{display:inline-flex;align-items:center;gap:8px;position:relative;flex-wrap:wrap}
.ghp-review-done{font-size:12px;color:var(--dsw-alias-state-success-primary,#16a34a);font-weight:600}
.ghp-btn-primary{background:var(--dsw-alias-state-business-primary,#2563eb);color:#fff;border-color:transparent}
.ghp-btn-primary:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#2563eb) 86%,#000)}
.ghp-btn:disabled{opacity:.6;cursor:default}
.ghp-review-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:30;width:320px;max-width:min(360px,80vw);padding:10px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.26));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-layer-2,#fff);box-shadow:0 10px 28px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:8px}
.ghp-review-events{display:flex;gap:2px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));padding:2px;border-radius:7px}
.ghp-review-events .ghp-seg-btn{flex:1}
.ghp-review-body{box-sizing:border-box;width:100%;min-height:80px;resize:vertical;padding:8px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.26));border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:12.5px}
.ghp-review-body:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#2563eb));outline-offset:1px}
.ghp-review-error{font-size:12px;color:var(--dsw-alias-state-error-primary,#dc2626)}
.ghp-review-actions{display:flex;justify-content:flex-end;gap:6px}

.ghp-truncated{margin-top:6px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px}

/* ============================================================================
 * GitHub markdown stylesheet
 * Vendored from github-markdown-css 5.8.1 (MIT, https://github.com/sindresorhus/github-markdown-css),
 * the standalone build of GitHub's own comment / README styles. Rules are kept
 * verbatim; GitHub's light/dark palette blocks are replaced below by bindings to
 * the DSH theme tokens so the body follows the surrounding panel theme.
 * ========================================================================== */
.markdown-body {
  --base-size-4: 0.25rem;
  --base-size-8: 0.5rem;
  --base-size-16: 1rem;
  --base-size-24: 1.5rem;
  --base-size-40: 2.5rem;
  --base-text-weight-normal: 400;
  --base-text-weight-medium: 500;
  --base-text-weight-semibold: 600;
  --fontStack-monospace: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  --fgColor-accent: Highlight;
}

.markdown-body {
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  margin: 0;
  color: var(--fgColor-default);
  background-color: var(--bgColor-default);
  font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.5;
  word-wrap: break-word;
}

.markdown-body .octicon {
  display: inline-block;
  fill: currentColor;
  vertical-align: text-bottom;
}

.markdown-body h1:hover .anchor .octicon-link:before,
.markdown-body h2:hover .anchor .octicon-link:before,
.markdown-body h3:hover .anchor .octicon-link:before,
.markdown-body h4:hover .anchor .octicon-link:before,
.markdown-body h5:hover .anchor .octicon-link:before,
.markdown-body h6:hover .anchor .octicon-link:before {
  width: 16px;
  height: 16px;
  content: ' ';
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' aria-hidden='true'><path fill-rule='evenodd' d='M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z'></path></svg>");
  mask-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' aria-hidden='true'><path fill-rule='evenodd' d='M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z'></path></svg>");
}

.markdown-body details,
.markdown-body figcaption,
.markdown-body figure {
  display: block;
}

.markdown-body summary {
  display: list-item;
}

.markdown-body [hidden] {
  display: none !important;
}

.markdown-body a {
  background-color: transparent;
  color: var(--fgColor-accent);
  text-decoration: none;
}

.markdown-body abbr[title] {
  border-bottom: none;
  -webkit-text-decoration: underline dotted;
  text-decoration: underline dotted;
}

.markdown-body b,
.markdown-body strong {
  font-weight: var(--base-text-weight-semibold, 600);
}

.markdown-body dfn {
  font-style: italic;
}

.markdown-body h1 {
  margin: .67em 0;
  font-weight: var(--base-text-weight-semibold, 600);
  padding-bottom: .3em;
  font-size: 2em;
  border-bottom: 1px solid var(--borderColor-muted);
}

.markdown-body mark {
  background-color: var(--bgColor-attention-muted);
  color: var(--fgColor-default);
}

.markdown-body small {
  font-size: 90%;
}

.markdown-body sub,
.markdown-body sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

.markdown-body sub {
  bottom: -0.25em;
}

.markdown-body sup {
  top: -0.5em;
}

.markdown-body img {
  border-style: none;
  max-width: 100%;
  box-sizing: content-box;
}

.markdown-body code,
.markdown-body kbd,
.markdown-body pre,
.markdown-body samp {
  font-family: monospace;
  font-size: 1em;
}

.markdown-body figure {
  margin: 1em var(--base-size-40);
}

.markdown-body hr {
  box-sizing: content-box;
  overflow: hidden;
  background: transparent;
  border-bottom: 1px solid var(--borderColor-muted);
  height: .25em;
  padding: 0;
  margin: var(--base-size-24) 0;
  background-color: var(--borderColor-default);
  border: 0;
}

.markdown-body input {
  font: inherit;
  margin: 0;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.markdown-body [type=button],
.markdown-body [type=reset],
.markdown-body [type=submit] {
  -webkit-appearance: button;
  appearance: button;
}

.markdown-body [type=checkbox],
.markdown-body [type=radio] {
  box-sizing: border-box;
  padding: 0;
}

.markdown-body [type=number]::-webkit-inner-spin-button,
.markdown-body [type=number]::-webkit-outer-spin-button {
  height: auto;
}

.markdown-body [type=search]::-webkit-search-cancel-button,
.markdown-body [type=search]::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.markdown-body ::-webkit-input-placeholder {
  color: inherit;
  opacity: .54;
}

.markdown-body ::-webkit-file-upload-button {
  -webkit-appearance: button;
  appearance: button;
  font: inherit;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body ::placeholder {
  color: var(--fgColor-muted);
  opacity: 1;
}

.markdown-body hr::before {
  display: table;
  content: "";
}

.markdown-body hr::after {
  display: table;
  clear: both;
  content: "";
}

.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  font-variant: tabular-nums;
}

.markdown-body td,
.markdown-body th {
  padding: 0;
}

.markdown-body details summary {
  cursor: pointer;
}

.markdown-body a:focus,
.markdown-body [role=button]:focus,
.markdown-body input[type=radio]:focus,
.markdown-body input[type=checkbox]:focus {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
  box-shadow: none;
}

.markdown-body a:focus:not(:focus-visible),
.markdown-body [role=button]:focus:not(:focus-visible),
.markdown-body input[type=radio]:focus:not(:focus-visible),
.markdown-body input[type=checkbox]:focus:not(:focus-visible) {
  outline: solid 1px transparent;
}

.markdown-body a:focus-visible,
.markdown-body [role=button]:focus-visible,
.markdown-body input[type=radio]:focus-visible,
.markdown-body input[type=checkbox]:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
  box-shadow: none;
}

.markdown-body a:not([class]):focus,
.markdown-body a:not([class]):focus-visible,
.markdown-body input[type=radio]:focus,
.markdown-body input[type=radio]:focus-visible,
.markdown-body input[type=checkbox]:focus,
.markdown-body input[type=checkbox]:focus-visible {
  outline-offset: 0;
}

.markdown-body kbd {
  display: inline-block;
  padding: var(--base-size-4);
  font: 11px var(--fontStack-monospace, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace);
  line-height: 10px;
  color: var(--fgColor-default);
  vertical-align: middle;
  background-color: var(--bgColor-muted);
  border: solid 1px var(--borderColor-neutral-muted);
  border-bottom-color: var(--borderColor-neutral-muted);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 var(--borderColor-neutral-muted);
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: var(--base-size-24);
  margin-bottom: var(--base-size-16);
  font-weight: var(--base-text-weight-semibold, 600);
  line-height: 1.25;
}

.markdown-body h2 {
  font-weight: var(--base-text-weight-semibold, 600);
  padding-bottom: .3em;
  font-size: 1.5em;
  border-bottom: 1px solid var(--borderColor-muted);
}

.markdown-body h3 {
  font-weight: var(--base-text-weight-semibold, 600);
  font-size: 1.25em;
}

.markdown-body h4 {
  font-weight: var(--base-text-weight-semibold, 600);
  font-size: 1em;
}

.markdown-body h5 {
  font-weight: var(--base-text-weight-semibold, 600);
  font-size: .875em;
}

.markdown-body h6 {
  font-weight: var(--base-text-weight-semibold, 600);
  font-size: .85em;
  color: var(--fgColor-muted);
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: var(--fgColor-muted);
  border-left: .25em solid var(--borderColor-default);
}

.markdown-body ul,
.markdown-body ol {
  margin-top: 0;
  margin-bottom: 0;
  padding-left: 2em;
}

.markdown-body ol ol,
.markdown-body ul ol {
  list-style-type: lower-roman;
}

.markdown-body ul ul ol,
.markdown-body ul ol ol,
.markdown-body ol ul ol,
.markdown-body ol ol ol {
  list-style-type: lower-alpha;
}

.markdown-body dd {
  margin-left: 0;
}

.markdown-body tt,
.markdown-body code,
.markdown-body samp {
  font-family: var(--fontStack-monospace, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace);
  font-size: 12px;
}

.markdown-body pre {
  margin-top: 0;
  margin-bottom: 0;
  font-family: var(--fontStack-monospace, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace);
  font-size: 12px;
  word-wrap: normal;
}

.markdown-body .octicon {
  display: inline-block;
  overflow: visible !important;
  vertical-align: text-bottom;
  fill: currentColor;
}

.markdown-body input::-webkit-outer-spin-button,
.markdown-body input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.markdown-body .mr-2 {
  margin-right: var(--base-size-8, 8px) !important;
}

.markdown-body::before {
  display: table;
  content: "";
}

.markdown-body::after {
  display: table;
  clear: both;
  content: "";
}

.markdown-body>*:first-child {
  margin-top: 0 !important;
}

.markdown-body>*:last-child {
  margin-bottom: 0 !important;
}

.markdown-body a:not([href]) {
  color: inherit;
  text-decoration: none;
}

.markdown-body .absent {
  color: var(--fgColor-danger);
}

.markdown-body .anchor {
  float: left;
  padding-right: var(--base-size-4);
  margin-left: -20px;
  line-height: 1;
}

.markdown-body .anchor:focus {
  outline: none;
}

.markdown-body p,
.markdown-body blockquote,
.markdown-body ul,
.markdown-body ol,
.markdown-body dl,
.markdown-body table,
.markdown-body pre,
.markdown-body details {
  margin-top: 0;
  margin-bottom: var(--base-size-16);
}

.markdown-body blockquote>:first-child {
  margin-top: 0;
}

.markdown-body blockquote>:last-child {
  margin-bottom: 0;
}

.markdown-body h1 .octicon-link,
.markdown-body h2 .octicon-link,
.markdown-body h3 .octicon-link,
.markdown-body h4 .octicon-link,
.markdown-body h5 .octicon-link,
.markdown-body h6 .octicon-link {
  color: var(--fgColor-default);
  vertical-align: middle;
  visibility: hidden;
}

.markdown-body h1:hover .anchor,
.markdown-body h2:hover .anchor,
.markdown-body h3:hover .anchor,
.markdown-body h4:hover .anchor,
.markdown-body h5:hover .anchor,
.markdown-body h6:hover .anchor {
  text-decoration: none;
}

.markdown-body h1:hover .anchor .octicon-link,
.markdown-body h2:hover .anchor .octicon-link,
.markdown-body h3:hover .anchor .octicon-link,
.markdown-body h4:hover .anchor .octicon-link,
.markdown-body h5:hover .anchor .octicon-link,
.markdown-body h6:hover .anchor .octicon-link {
  visibility: visible;
}

.markdown-body h1 tt,
.markdown-body h1 code,
.markdown-body h2 tt,
.markdown-body h2 code,
.markdown-body h3 tt,
.markdown-body h3 code,
.markdown-body h4 tt,
.markdown-body h4 code,
.markdown-body h5 tt,
.markdown-body h5 code,
.markdown-body h6 tt,
.markdown-body h6 code {
  padding: 0 .2em;
  font-size: inherit;
}

.markdown-body summary h1,
.markdown-body summary h2,
.markdown-body summary h3,
.markdown-body summary h4,
.markdown-body summary h5,
.markdown-body summary h6 {
  display: inline-block;
}

.markdown-body summary h1 .anchor,
.markdown-body summary h2 .anchor,
.markdown-body summary h3 .anchor,
.markdown-body summary h4 .anchor,
.markdown-body summary h5 .anchor,
.markdown-body summary h6 .anchor {
  margin-left: -40px;
}

.markdown-body summary h1,
.markdown-body summary h2 {
  padding-bottom: 0;
  border-bottom: 0;
}

.markdown-body ul.no-list,
.markdown-body ol.no-list {
  padding: 0;
  list-style-type: none;
}

.markdown-body ol[type="a s"] {
  list-style-type: lower-alpha;
}

.markdown-body ol[type="A s"] {
  list-style-type: upper-alpha;
}

.markdown-body ol[type="i s"] {
  list-style-type: lower-roman;
}

.markdown-body ol[type="I s"] {
  list-style-type: upper-roman;
}

.markdown-body ol[type="1"] {
  list-style-type: decimal;
}

.markdown-body div>ol:not([type]) {
  list-style-type: decimal;
}

.markdown-body ul ul,
.markdown-body ul ol,
.markdown-body ol ol,
.markdown-body ol ul {
  margin-top: 0;
  margin-bottom: 0;
}

.markdown-body li>p {
  margin-top: var(--base-size-16);
}

.markdown-body li+li {
  margin-top: .25em;
}

.markdown-body dl {
  padding: 0;
}

.markdown-body dl dt {
  padding: 0;
  margin-top: var(--base-size-16);
  font-size: 1em;
  font-style: italic;
  font-weight: var(--base-text-weight-semibold, 600);
}

.markdown-body dl dd {
  padding: 0 var(--base-size-16);
  margin-bottom: var(--base-size-16);
}

.markdown-body table th {
  font-weight: var(--base-text-weight-semibold, 600);
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid var(--borderColor-default);
}

.markdown-body table td>:last-child {
  margin-bottom: 0;
}

.markdown-body table tr {
  background-color: var(--bgColor-default);
  border-top: 1px solid var(--borderColor-muted);
}

.markdown-body table tr:nth-child(2n) {
  background-color: var(--bgColor-muted);
}

.markdown-body table img {
  background-color: transparent;
}

.markdown-body img[align=right] {
  padding-left: 20px;
}

.markdown-body img[align=left] {
  padding-right: 20px;
}

.markdown-body .emoji {
  max-width: none;
  vertical-align: text-top;
  background-color: transparent;
}

.markdown-body span.frame {
  display: block;
  overflow: hidden;
}

.markdown-body span.frame>span {
  display: block;
  float: left;
  width: auto;
  padding: 7px;
  margin: 13px 0 0;
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
}

.markdown-body span.frame span img {
  display: block;
  float: left;
}

.markdown-body span.frame span span {
  display: block;
  padding: 5px 0 0;
  clear: both;
  color: var(--fgColor-default);
}

.markdown-body span.align-center {
  display: block;
  overflow: hidden;
  clear: both;
}

.markdown-body span.align-center>span {
  display: block;
  margin: 13px auto 0;
  overflow: hidden;
  text-align: center;
}

.markdown-body span.align-center span img {
  margin: 0 auto;
  text-align: center;
}

.markdown-body span.align-right {
  display: block;
  overflow: hidden;
  clear: both;
}

.markdown-body span.align-right>span {
  display: block;
  margin: 13px 0 0;
  overflow: hidden;
  text-align: right;
}

.markdown-body span.align-right span img {
  margin: 0;
  text-align: right;
}

.markdown-body span.float-left {
  display: block;
  float: left;
  margin-right: 13px;
  overflow: hidden;
}

.markdown-body span.float-left span {
  margin: 13px 0 0;
}

.markdown-body span.float-right {
  display: block;
  float: right;
  margin-left: 13px;
  overflow: hidden;
}

.markdown-body span.float-right>span {
  display: block;
  margin: 13px auto 0;
  overflow: hidden;
  text-align: right;
}

.markdown-body code,
.markdown-body tt {
  padding: .2em .4em;
  margin: 0;
  font-size: 85%;
  white-space: break-spaces;
  background-color: var(--bgColor-neutral-muted);
  border-radius: 6px;
}

.markdown-body code br,
.markdown-body tt br {
  display: none;
}

.markdown-body del code {
  text-decoration: inherit;
}

.markdown-body samp {
  font-size: 85%;
}

.markdown-body pre code {
  font-size: 100%;
}

.markdown-body pre>code {
  padding: 0;
  margin: 0;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

.markdown-body .highlight {
  margin-bottom: var(--base-size-16);
}

.markdown-body .highlight pre {
  margin-bottom: 0;
  word-break: normal;
}

.markdown-body .highlight pre,
.markdown-body pre {
  padding: var(--base-size-16);
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  color: var(--fgColor-default);
  background-color: var(--bgColor-muted);
  border-radius: 6px;
}

.markdown-body pre code,
.markdown-body pre tt {
  display: inline;
  max-width: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

.markdown-body .csv-data td,
.markdown-body .csv-data th {
  padding: 5px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1;
  text-align: left;
  white-space: nowrap;
}

.markdown-body .csv-data .blob-num {
  padding: 10px var(--base-size-8) 9px;
  text-align: right;
  background: var(--bgColor-default);
  border: 0;
}

.markdown-body .csv-data tr {
  border-top: 0;
}

.markdown-body .csv-data th {
  font-weight: var(--base-text-weight-semibold, 600);
  background: var(--bgColor-muted);
  border-top: 0;
}

.markdown-body [data-footnote-ref]::before {
  content: "[";
}

.markdown-body [data-footnote-ref]::after {
  content: "]";
}

.markdown-body .footnotes {
  font-size: 12px;
  color: var(--fgColor-muted);
  border-top: 1px solid var(--borderColor-default);
}

.markdown-body .footnotes ol {
  padding-left: var(--base-size-16);
}

.markdown-body .footnotes ol ul {
  display: inline-block;
  padding-left: var(--base-size-16);
  margin-top: var(--base-size-16);
}

.markdown-body .footnotes li {
  position: relative;
}

.markdown-body .footnotes li:target::before {
  position: absolute;
  top: calc(var(--base-size-8)*-1);
  right: calc(var(--base-size-8)*-1);
  bottom: calc(var(--base-size-8)*-1);
  left: calc(var(--base-size-24)*-1);
  pointer-events: none;
  content: "";
  border: 2px solid var(--borderColor-accent-emphasis);
  border-radius: 6px;
}

.markdown-body .footnotes li:target {
  color: var(--fgColor-default);
}

.markdown-body .footnotes .data-footnote-backref g-emoji {
  font-family: monospace;
}

.markdown-body body:has(:modal) {
  padding-right: var(--dialog-scrollgutter) !important;
}

.markdown-body .pl-c {
  color: var(--color-prettylights-syntax-comment);
}

.markdown-body .pl-c1,
.markdown-body .pl-s .pl-v {
  color: var(--color-prettylights-syntax-constant);
}

.markdown-body .pl-e,
.markdown-body .pl-en {
  color: var(--color-prettylights-syntax-entity);
}

.markdown-body .pl-smi,
.markdown-body .pl-s .pl-s1 {
  color: var(--color-prettylights-syntax-storage-modifier-import);
}

.markdown-body .pl-ent {
  color: var(--color-prettylights-syntax-entity-tag);
}

.markdown-body .pl-k {
  color: var(--color-prettylights-syntax-keyword);
}

.markdown-body .pl-s,
.markdown-body .pl-pds,
.markdown-body .pl-s .pl-pse .pl-s1,
.markdown-body .pl-sr,
.markdown-body .pl-sr .pl-cce,
.markdown-body .pl-sr .pl-sre,
.markdown-body .pl-sr .pl-sra {
  color: var(--color-prettylights-syntax-string);
}

.markdown-body .pl-v,
.markdown-body .pl-smw {
  color: var(--color-prettylights-syntax-variable);
}

.markdown-body .pl-bu {
  color: var(--color-prettylights-syntax-brackethighlighter-unmatched);
}

.markdown-body .pl-ii {
  color: var(--color-prettylights-syntax-invalid-illegal-text);
  background-color: var(--color-prettylights-syntax-invalid-illegal-bg);
}

.markdown-body .pl-c2 {
  color: var(--color-prettylights-syntax-carriage-return-text);
  background-color: var(--color-prettylights-syntax-carriage-return-bg);
}

.markdown-body .pl-sr .pl-cce {
  font-weight: bold;
  color: var(--color-prettylights-syntax-string-regexp);
}

.markdown-body .pl-ml {
  color: var(--color-prettylights-syntax-markup-list);
}

.markdown-body .pl-mh,
.markdown-body .pl-mh .pl-en,
.markdown-body .pl-ms {
  font-weight: bold;
  color: var(--color-prettylights-syntax-markup-heading);
}

.markdown-body .pl-mi {
  font-style: italic;
  color: var(--color-prettylights-syntax-markup-italic);
}

.markdown-body .pl-mb {
  font-weight: bold;
  color: var(--color-prettylights-syntax-markup-bold);
}

.markdown-body .pl-md {
  color: var(--color-prettylights-syntax-markup-deleted-text);
  background-color: var(--color-prettylights-syntax-markup-deleted-bg);
}

.markdown-body .pl-mi1 {
  color: var(--color-prettylights-syntax-markup-inserted-text);
  background-color: var(--color-prettylights-syntax-markup-inserted-bg);
}

.markdown-body .pl-mc {
  color: var(--color-prettylights-syntax-markup-changed-text);
  background-color: var(--color-prettylights-syntax-markup-changed-bg);
}

.markdown-body .pl-mi2 {
  color: var(--color-prettylights-syntax-markup-ignored-text);
  background-color: var(--color-prettylights-syntax-markup-ignored-bg);
}

.markdown-body .pl-mdr {
  font-weight: bold;
  color: var(--color-prettylights-syntax-meta-diff-range);
}

.markdown-body .pl-ba {
  color: var(--color-prettylights-syntax-brackethighlighter-angle);
}

.markdown-body .pl-sg {
  color: var(--color-prettylights-syntax-sublimelinter-gutter-mark);
}

.markdown-body .pl-corl {
  text-decoration: underline;
  color: var(--color-prettylights-syntax-constant-other-reference-link);
}

.markdown-body [role=button]:focus:not(:focus-visible),
.markdown-body [role=tabpanel][tabindex="0"]:focus:not(:focus-visible),
.markdown-body button:focus:not(:focus-visible),
.markdown-body summary:focus:not(:focus-visible),
.markdown-body a:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}

.markdown-body [tabindex="0"]:focus:not(:focus-visible),
.markdown-body details-dialog:focus:not(:focus-visible) {
  outline: none;
}

.markdown-body g-emoji {
  display: inline-block;
  min-width: 1ch;
  font-family: "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
  font-size: 1em;
  font-style: normal !important;
  font-weight: var(--base-text-weight-normal, 400);
  line-height: 1;
  vertical-align: -0.075em;
}

.markdown-body g-emoji img {
  width: 1em;
  height: 1em;
}

.markdown-body .task-list-item {
  list-style-type: none;
}

.markdown-body .task-list-item label {
  font-weight: var(--base-text-weight-normal, 400);
}

.markdown-body .task-list-item.enabled label {
  cursor: pointer;
}

.markdown-body .task-list-item+.task-list-item {
  margin-top: var(--base-size-4);
}

.markdown-body .task-list-item .handle {
  display: none;
}

.markdown-body .task-list-item-checkbox {
  margin: 0 .2em .25em -1.4em;
  vertical-align: middle;
}

.markdown-body ul:dir(rtl) .task-list-item-checkbox {
  margin: 0 -1.6em .25em .2em;
}

.markdown-body ol:dir(rtl) .task-list-item-checkbox {
  margin: 0 -1.6em .25em .2em;
}

.markdown-body .contains-task-list:hover .task-list-item-convert-container,
.markdown-body .contains-task-list:focus-within .task-list-item-convert-container {
  display: block;
  width: auto;
  height: 24px;
  overflow: visible;
  clip: auto;
}

.markdown-body ::-webkit-calendar-picker-indicator {
  filter: invert(50%);
}

.markdown-body .markdown-alert {
  padding: var(--base-size-8) var(--base-size-16);
  margin-bottom: var(--base-size-16);
  color: inherit;
  border-left: .25em solid var(--borderColor-default);
}

.markdown-body .markdown-alert>:first-child {
  margin-top: 0;
}

.markdown-body .markdown-alert>:last-child {
  margin-bottom: 0;
}

.markdown-body .markdown-alert .markdown-alert-title {
  display: flex;
  font-weight: var(--base-text-weight-medium, 500);
  align-items: center;
  line-height: 1;
}

.markdown-body .markdown-alert.markdown-alert-note {
  border-left-color: var(--borderColor-accent-emphasis);
}

.markdown-body .markdown-alert.markdown-alert-note .markdown-alert-title {
  color: var(--fgColor-accent);
}

.markdown-body .markdown-alert.markdown-alert-important {
  border-left-color: var(--borderColor-done-emphasis);
}

.markdown-body .markdown-alert.markdown-alert-important .markdown-alert-title {
  color: var(--fgColor-done);
}

.markdown-body .markdown-alert.markdown-alert-warning {
  border-left-color: var(--borderColor-attention-emphasis);
}

.markdown-body .markdown-alert.markdown-alert-warning .markdown-alert-title {
  color: var(--fgColor-attention);
}

.markdown-body .markdown-alert.markdown-alert-tip {
  border-left-color: var(--borderColor-success-emphasis);
}

.markdown-body .markdown-alert.markdown-alert-tip .markdown-alert-title {
  color: var(--fgColor-success);
}

.markdown-body .markdown-alert.markdown-alert-caution {
  border-left-color: var(--borderColor-danger-emphasis);
}

.markdown-body .markdown-alert.markdown-alert-caution .markdown-alert-title {
  color: var(--fgColor-danger);
}

.markdown-body>*:first-child>.heading-element:first-child {
  margin-top: 0 !important;
}

.markdown-body .highlight pre:has(+.zeroclipboard-container) {
  min-height: 52px;
}

/* GitHub's light and dark palettes, selected by the panel theme. */
.markdown-body.ghp-body{
  background-color:transparent;
  color:var(--dsw-alias-label-primary,#1f2328);
  --fgColor-default:var(--dsw-alias-label-primary,#1f2328);
  --fgColor-muted:var(--dsw-alias-label-secondary,#59636e);
  --fgColor-accent:var(--dsw-alias-state-business-primary,#0969da);
  --fgColor-success:var(--dsw-alias-state-success-primary,#1a7f37);
  --fgColor-attention:var(--dsw-alias-state-warn-primary,#9a6700);
  --fgColor-danger:var(--dsw-alias-state-error-primary,#d1242f);
  --fgColor-done:var(--dsw-alias-state-business-primary,#8250df);
  --bgColor-default:transparent;
  --bgColor-muted:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08));
  --bgColor-neutral-muted:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  --bgColor-attention-muted:var(--dsw-alias-interactive-bg-hover,rgba(255,215,0,.12));
  --borderColor-default:var(--dsw-alias-border-l3,rgba(127,127,127,.28));
  --borderColor-muted:var(--dsw-alias-border-l3,rgba(127,127,127,.2));
  --borderColor-neutral-muted:var(--dsw-alias-border-l3,rgba(127,127,127,.2));
  --borderColor-accent-emphasis:var(--dsw-alias-state-business-primary,#0969da);
  --borderColor-success-emphasis:var(--dsw-alias-state-success-primary,#1a7f37);
  --borderColor-attention-emphasis:var(--dsw-alias-state-warn-primary,#9a6700);
  --borderColor-danger-emphasis:var(--dsw-alias-state-error-primary,#d1242f);
  --borderColor-done-emphasis:var(--dsw-alias-state-business-primary,#8250df);
  --focus-outlineColor:var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#0969da));
  --color-prettylights-syntax-comment:var(--dsw-alias-label-secondary,#59636e);
  --color-prettylights-syntax-constant:var(--dsw-alias-state-warn-primary,#0550ae);
  --color-prettylights-syntax-constant-other-reference-link:var(--dsw-alias-state-business-primary,#0a3069);
  --color-prettylights-syntax-entity:var(--dsw-alias-state-business-primary,#6639ba);
  --color-prettylights-syntax-storage-modifier-import:var(--dsw-alias-label-primary,#1f2328);
  --color-prettylights-syntax-entity-tag:var(--dsw-alias-state-business-primary,#0550ae);
  --color-prettylights-syntax-keyword:var(--dsw-alias-state-error-primary,#cf222e);
  --color-prettylights-syntax-string:var(--dsw-alias-state-success-primary,#0a3069);
  --color-prettylights-syntax-variable:var(--dsw-alias-state-warn-primary,#953800);
  --color-prettylights-syntax-brackethighlighter-unmatched:var(--dsw-alias-state-error-primary,#82071e);
  --color-prettylights-syntax-brackethighlighter-angle:var(--dsw-alias-label-secondary,#59636e);
  --color-prettylights-syntax-invalid-illegal-text:var(--dsw-alias-label-primary,#f6f8fa);
  --color-prettylights-syntax-invalid-illegal-bg:var(--dsw-alias-state-error-primary,#82071e);
  --color-prettylights-syntax-carriage-return-text:var(--dsw-alias-label-primary,#f6f8fa);
  --color-prettylights-syntax-carriage-return-bg:var(--dsw-alias-state-error-primary,#cf222e);
  --color-prettylights-syntax-string-regexp:var(--dsw-alias-state-success-primary,#116329);
  --color-prettylights-syntax-markup-list:var(--dsw-alias-state-warn-primary,#3b2300);
  --color-prettylights-syntax-markup-heading:var(--dsw-alias-state-business-primary,#0550ae);
  --color-prettylights-syntax-markup-italic:var(--dsw-alias-label-primary,#1f2328);
  --color-prettylights-syntax-markup-bold:var(--dsw-alias-label-primary,#1f2328);
  --color-prettylights-syntax-markup-deleted-text:var(--dsw-alias-state-error-primary,#82071e);
  --color-prettylights-syntax-markup-deleted-bg:color-mix(in srgb,var(--dsw-alias-state-error-primary,#82071e) 12%,transparent);
  --color-prettylights-syntax-markup-inserted-text:var(--dsw-alias-state-success-primary,#116329);
  --color-prettylights-syntax-markup-inserted-bg:color-mix(in srgb,var(--dsw-alias-state-success-primary,#116329) 14%,transparent);
  --color-prettylights-syntax-markup-changed-text:var(--dsw-alias-state-warn-primary,#953800);
  --color-prettylights-syntax-markup-changed-bg:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#953800) 14%,transparent);
  --color-prettylights-syntax-markup-ignored-text:var(--dsw-alias-label-tertiary,#d1d9e0);
  --color-prettylights-syntax-markup-ignored-bg:var(--dsw-alias-state-business-primary,#0550ae);
  --color-prettylights-syntax-meta-diff-range:var(--dsw-alias-state-business-primary,#8250df);
  --color-prettylights-syntax-sublimelinter-gutter-mark:var(--dsw-alias-border-l2,rgba(127,127,127,.4));
}

/* Panel integration on top of GitHub's stylesheet. */
.markdown-body.ghp-body{font-family:var(--ghp-font-ui);font-size:14px;line-height:1.5;background-color:transparent;color:var(--fgColor-default);--fontStack-monospace:var(--ghp-font-code)}
.ghp-body-fallback{font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary,#111827)}
.ghp-act-card .ghp-body{font-size:13px}
.ghp-body .ghp-code-block{position:relative}
.ghp-body .ghp-code-block{margin-bottom:16px}
.ghp-body .ghp-code-block:last-child{margin-bottom:0}
.ghp-html-copy{position:absolute;top:8px;right:8px;z-index:1;height:24px;padding:0 8px;border:1px solid var(--borderColor-default,#d1d9e0);border-radius:6px;background:var(--bgColor-default,#fff);color:var(--fgColor-muted,#59636e);font:inherit;font-size:11px;line-height:22px;cursor:pointer;opacity:0;transition:opacity .12s ease}
.ghp-body .ghp-code-block:hover .ghp-html-copy,.ghp-html-copy:focus-visible{opacity:1}
.ghp-html-copy:hover{color:var(--fgColor-accent,#0969da);border-color:var(--borderColor-accent-emphasis,#0969da)}
.ghp-html-copy:focus-visible{outline:2px solid var(--focus-outlineColor,#0969da);outline-offset:1px}
.ghp-body .ghp-mermaid{margin-bottom:16px}
.ghp-body .ghp-mermaid:last-child{margin-bottom:0}
.ghp-body summary{color:var(--fgColor-default)}

/* GitHub's stylesheet is scoped to .markdown-body; keep panel tables/code scrollable. */
.ghp-body table{display:block}

`

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        ctx.effect(() => {
          const style = document.createElement('style')
          style.id = 'ghp-style'
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'github-panel: styles')

        ctx.effect(() => ctx.locale.register(NS, dict), 'github-panel: dictionaries')

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: ID,
              kind: KIND,
              priority: 'extension',
              // The tab keeps its list/detail state while another right-Sidebar
              // tab is focused, so checking a file or terminal does not reset it.
              keepMounted: true,
              title: () => t('type.label'),
              guide: [
                {
                  id: 'open',
                  order: 20,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GitHubGlyph,
                },
              ],
            }),
          'github-panel: tab type',
        )

        ctx.effect(
          () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: ID, locale: NS }, WorkbenchBody)),
          'github-panel: tab body',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('conversation.session.header.actions', () =>
              ctx.slots.register(
                {
                  name: 'conversation.session.header.actions',
                  id: 'github-panel',
                  order: 15,
                  locale: NS,
                  inject: () => ({
                    open: () => {
                      try {
                        ctx.sidebarRight.openTab(KIND)
                      } catch (error) {
                        console.error('[github-panel] open failed:', error)
                      }
                    },
                  }),
                },
                HeaderTrigger,
              ),
            ),
          'github-panel: header trigger',
        )
      },
    }
  },
})


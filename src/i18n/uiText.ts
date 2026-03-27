export type UiLanguage = 'zh' | 'en'

type UiTextParams = Record<string, number | string>
type UiTextValue = string | ((params: UiTextParams) => string)

const UI_TEXT = {
  'app.searchThreads': {
    zh: '搜索会话',
    en: 'Search threads',
  },
  'app.filterThreads': {
    zh: '筛选会话...',
    en: 'Filter threads...',
  },
  'app.clearSearch': {
    zh: '清空搜索',
    en: 'Clear search',
  },
  'app.newThread': {
    zh: '新会话',
    en: 'New thread',
  },
  'app.chooseThread': {
    zh: '选择一个会话',
    en: 'Choose a thread',
  },
  'app.autoRefreshIn': {
    zh: ({ seconds }) => `${String(seconds)} 秒后自动刷新`,
    en: ({ seconds }) => `Auto refresh in ${String(seconds)}s`,
  },
  'app.enableAutoRefresh': {
    zh: '开启 4 秒自动刷新',
    en: 'Enable 4s refresh',
  },
  'app.themeLight': {
    zh: '主题：浅色',
    en: 'Theme: Light',
  },
  'app.themeDark': {
    zh: '主题：深色',
    en: 'Theme: Dark',
  },
  'app.themeAuto': {
    zh: '主题：自动',
    en: 'Theme: Auto',
  },
  'app.languageChinese': {
    zh: '语言：中文',
    en: 'Language: Chinese',
  },
  'app.languageEnglish': {
    zh: '语言：英文',
    en: 'Language: English',
  },
  'app.aiGenerating': {
    zh: 'AI生成中',
    en: 'AI generating',
  },
  'app.aiThinking': {
    zh: 'AI思考中',
    en: 'AI thinking',
  },
  'app.letsBuild': {
    zh: '开始构建',
    en: "Let's build",
  },
  'app.chooseFolder': {
    zh: '选择目录',
    en: 'Choose folder',
  },
  'app.closeCodePreview': {
    zh: '关闭代码预览',
    en: 'Close code preview',
  },
  'app.queuedMessagesTitle': {
    zh: ({ count }) => `待发送 ${String(count)} 条`,
    en: ({ count }) => `${String(count)} queued`,
  },
  'app.queuedMessageQueuedAt': {
    zh: ({ time }) => `排队于 ${String(time)}`,
    en: ({ time }) => `Queued at ${String(time)}`,
  },
  'composer.model': {
    zh: '模型',
    en: 'Model',
  },
  'composer.thinking': {
    zh: '推理',
    en: 'Thinking',
  },
  'composer.reasoningEffort': {
    zh: '推理程度',
    en: 'Reasoning effort',
  },
  'composer.branch': {
    zh: '分支',
    en: 'Branch',
  },
  'composer.quotaRemaining': {
    zh: ({ percent }) => `${String(percent)}% 额度`,
    en: ({ percent }) => `${String(percent)}% quota`,
  },
  'composer.quotaUsageTitle': {
    zh: '额度剩余：',
    en: 'Quota remaining:',
  },
  'composer.quotaRemainingTitle': {
    zh: '剩余额度',
    en: 'Remaining quota',
  },
  'composer.quotaUsageSummary': {
    zh: ({ used, remaining }) => `${String(used)}% 已用（剩余 ${String(remaining)}%）`,
    en: ({ used, remaining }) => `${String(used)}% used (${String(remaining)}% left)`,
  },
  'composer.quotaWindowDuration': {
    zh: ({ duration }) => `周期：${String(duration)}`,
    en: ({ duration }) => `Window: ${String(duration)}`,
  },
  'composer.quotaWindowUnknown': {
    zh: '未知周期',
    en: 'Unknown window',
  },
  'composer.quotaWindowWeeks': {
    zh: ({ weeks }) => `${String(weeks)} 周`,
    en: ({ weeks }) => `${String(weeks)} week`,
  },
  'composer.quotaWindowDays': {
    zh: ({ days }) => `${String(days)} 天`,
    en: ({ days }) => `${String(days)} day`,
  },
  'composer.quotaWindowHours': {
    zh: ({ hours }) => `${String(hours)} 小时`,
    en: ({ hours }) => `${String(hours)} hour`,
  },
  'composer.quotaWindowMinutes': {
    zh: ({ minutes }) => `${String(minutes)} 分钟`,
    en: ({ minutes }) => `${String(minutes)} min`,
  },
  'composer.quotaResetAt': {
    zh: ({ time }) => `重置时间：${String(time)}`,
    en: ({ time }) => `Resets at: ${String(time)}`,
  },
  'composer.quotaDataUnavailable': {
    zh: '等待额度数据',
    en: 'Waiting for quota data',
  },
  'composer.resetSuffix': {
    zh: '重置',
    en: 'reset',
  },
  'composer.aiCreditsUnlimited': {
    zh: 'AI Credits：无限制',
    en: 'AI Credits: Unlimited',
  },
  'composer.aiCreditsBalance': {
    zh: ({ balance }) => `AI Credits 余额：${String(balance)}`,
    en: ({ balance }) => `AI Credits balance: ${String(balance)}`,
  },
  'composer.aiCreditsAvailable': {
    zh: 'AI Credits：可用',
    en: 'AI Credits: Available',
  },
  'composer.aiCreditsDepleted': {
    zh: 'AI Credits：已用尽',
    en: 'AI Credits: Depleted',
  },
  'composer.contextUsageTitle': {
    zh: '背景信息窗口：',
    en: 'Context window:',
  },
  'composer.contextUsageSummary': {
    zh: ({ used, remaining }) => `${String(used)}% 已用（剩余 ${String(remaining)}%）`,
    en: ({ used, remaining }) => `${String(used)}% used (${String(remaining)}% left)`,
  },
  'composer.contextTokensSummary': {
    zh: ({ usedTokens, totalTokens }) => `已用 ${String(usedTokens)} 标记，共 ${String(totalTokens)}`,
    en: ({ usedTokens, totalTokens }) => `${String(usedTokens)} used, ${String(totalTokens)} total`,
  },
  'composer.contextAutoCompressHint': {
    zh: 'Codex 自动压缩其背景信息',
    en: 'Codex auto-compresses background context',
  },
  'composer.contextDataUnavailable': {
    zh: '等待上下文用量数据',
    en: 'Waiting for context usage',
  },
  'composer.compactNow': {
    zh: '立即压缩',
    en: 'Compact now',
  },
  'composer.compacting': {
    zh: '压缩中...',
    en: 'Compacting...',
  },
  'composer.typeMessage': {
    zh: '输入消息...',
    en: 'Type a message...',
  },
  'composer.selectThreadFirst': {
    zh: '请选择一个会话后再发送消息',
    en: 'Select a thread to send a message',
  },
  'composer.reasoning.none': {
    zh: '无',
    en: 'None',
  },
  'composer.reasoning.minimal': {
    zh: '极低',
    en: 'Minimal',
  },
  'composer.reasoning.low': {
    zh: '低',
    en: 'Low',
  },
  'composer.reasoning.medium': {
    zh: '中',
    en: 'Medium',
  },
  'composer.reasoning.high': {
    zh: '高',
    en: 'High',
  },
  'composer.reasoning.xhigh': {
    zh: '超高',
    en: 'Extra high',
  },
  'threadConversation.loadingMessages': {
    zh: '正在加载消息...',
    en: 'Loading messages...',
  },
  'threadConversation.noMessages': {
    zh: '当前会话还没有消息',
    en: 'No messages in this thread yet.',
  },
  'threadConversation.otherAnswer': {
    zh: '其他答案',
    en: 'Other answer',
  },
  'threadConversation.submitAnswers': {
    zh: '提交答案',
    en: 'Submit Answers',
  },
  'threadConversation.accept': {
    zh: '同意',
    en: 'Accept',
  },
  'threadConversation.acceptForSession': {
    zh: '本次会话同意',
    en: 'Accept for Session',
  },
  'threadConversation.decline': {
    zh: '拒绝',
    en: 'Decline',
  },
  'threadConversation.cancel': {
    zh: '取消',
    en: 'Cancel',
  },
  'threadConversation.failToolCall': {
    zh: '标记工具调用失败',
    en: 'Fail Tool Call',
  },
  'threadConversation.successEmpty': {
    zh: '成功（空结果）',
    en: 'Success (Empty)',
  },
  'threadConversation.returnEmptyResult': {
    zh: '返回空结果',
    en: 'Return Empty Result',
  },
  'threadConversation.rejectRequest': {
    zh: '拒绝请求',
    en: 'Reject Request',
  },
  'threadConversation.requestMeta': {
    zh: ({ id, time }) => `请求 #${String(id)} · ${String(time)}`,
    en: ({ id, time }) => `Request #${String(id)} · ${String(time)}`,
  },
  'threadConversation.workedFor': {
    zh: ({ duration }) => `耗时 ${String(duration)}`,
    en: ({ duration }) => `Worked for ${String(duration)}`,
  },
  'sidebar.expand': {
    zh: '展开侧边栏',
    en: 'Expand sidebar',
  },
  'sidebar.collapse': {
    zh: '收起侧边栏',
    en: 'Collapse sidebar',
  },
  'sidebar.startNewThread': {
    zh: '开始新会话',
    en: 'Start new thread',
  },
  'sidebarTree.threads': {
    zh: '会话',
    en: 'Threads',
  },
  'sidebarTree.noMatchingThreads': {
    zh: '没有匹配的会话',
    en: 'No matching threads',
  },
  'sidebarTree.loadingThreads': {
    zh: '会话加载中...',
    en: 'Loading threads...',
  },
  'sidebarTree.editName': {
    zh: '编辑名称',
    en: 'Edit name',
  },
  'sidebarTree.remove': {
    zh: '移除',
    en: 'Remove',
  },
  'sidebarTree.projectName': {
    zh: '项目名称',
    en: 'Project name',
  },
  'sidebarTree.noThreads': {
    zh: '暂无会话',
    en: 'No threads',
  },
  'sidebarTree.showLess': {
    zh: '收起',
    en: 'Show less',
  },
  'sidebarTree.showMore': {
    zh: '展开更多',
    en: 'Show more',
  },
  'sidebarTree.pin': {
    zh: '置顶',
    en: 'Pin',
  },
  'sidebarTree.archiveThread': {
    zh: '归档会话',
    en: 'Archive thread',
  },
  'sidebarTree.confirm': {
    zh: '确认',
    en: 'Confirm',
  },
  'sidebarTree.projectMenu': {
    zh: '项目菜单',
    en: 'Project menu',
  },
  'sidebarTree.newThreadInProject': {
    zh: ({ projectName }) => `在 ${String(projectName)} 中新建会话`,
    en: ({ projectName }) => `Start new thread in ${String(projectName)}`,
  },
  'sidebarTree.na': {
    zh: '未知',
    en: 'n/a',
  },
  'sidebarTree.now': {
    zh: '刚刚',
    en: 'now',
  },
  'sidebarTree.minutesAgo': {
    zh: ({ minutes }) => `${String(minutes)} 分钟前`,
    en: ({ minutes }) => `${String(minutes)}m ago`,
  },
  'sidebarTree.hoursAgo': {
    zh: ({ hours }) => `${String(hours)} 小时前`,
    en: ({ hours }) => `${String(hours)}h ago`,
  },
  'sidebarTree.daysAgo': {
    zh: ({ days }) => `${String(days)} 天前`,
    en: ({ days }) => `${String(days)}d ago`,
  },
} as const satisfies Record<string, { zh: UiTextValue; en: UiTextValue }>

export type UiTextKey = keyof typeof UI_TEXT

export function tUi(language: UiLanguage, key: UiTextKey, params: UiTextParams = {}): string {
  const entry = UI_TEXT[key]
  const value = entry[language]
  if (typeof value === 'function') {
    return value(params)
  }
  return value
}

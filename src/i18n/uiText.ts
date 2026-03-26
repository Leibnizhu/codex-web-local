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

// ==========================================
// USER EDITABLE — UI 文案配置
// ==========================================
// 所有界面显示的文字都在这里统一管理。
// 修改这里即可改变界面文字，无需改动组件代码。

export const uiText = {
  // USER EDITABLE
  home: {
    title: 'CHARACTER GAME',
    welcome: 'WELCOME',
    play: 'PLAY',
    library: 'LIBRARY',
    settings: 'SETTINGS',
  },
  characterSelect: {
    title: 'SELECT CHARACTER',
    listLabel: 'CHARACTERS',
    hint: '← → 选择角色     ENTER 确认',
  },
  characterPreview: {
    start: 'START',
    back: 'BACK',
    unavailable: 'UNAVAILABLE',
    unavailableMessage: '该角色暂不可用。',
  },
  chat: {
    inputPlaceholder: '输入消息…',
    send: '发送',
    back: '返回',
    typing: '正在输入…',
    emptyHistory: '开始你的对话吧',
    error: '连接出错，请重试',
    reconnecting: '重新连接中…',
  },
  loading: '加载中…',
  error: '出错了',
};
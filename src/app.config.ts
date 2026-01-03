const pages = [
  'pages/login/index',
  'pages/home/index',
  'pages/history/index',
  'pages/profile/index',
  'pages/result/index'
]

//  To fully leverage TypeScript's type safety and ensure its correctness, always enclose the configuration object within the global defineAppConfig helper function.
export default defineAppConfig({
  pages,
  tabBar: {
    color: '#8C8C8C',
    selectedColor: '#1890FF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '登记',
        iconPath: './assets/images/unselected/scan.png',
        selectedIconPath: './assets/images/selected/scan.png'
      },
      {
        pagePath: 'pages/history/index',
        text: '记录',
        iconPath: './assets/images/unselected/history.png',
        selectedIconPath: './assets/images/selected/history.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/images/unselected/profile.png',
        selectedIconPath: './assets/images/selected/profile.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1890FF',
    navigationBarTitleText: '免费车登记',
    navigationBarTextStyle: 'white'
  },
  // 开启组件按需注入特性
  lazyCodeLoading: 'requiredComponents'
})

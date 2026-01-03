const fs = require('fs');
const path = require('path');

// 查找 plugin-react 包的实际路径
function findPluginReactPath() {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', '@vitejs', 'plugin-react', 'dist', 'index.cjs'),
    path.join(__dirname, 'node_modules', '.pnpm', '@vitejs+plugin-react*', 'node_modules', '@vitejs', 'plugin-react', 'dist', 'index.cjs')
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  throw new Error('未找到 @vitejs/plugin-react 包');
}

// 读取插件文件
const pluginPath = findPluginReactPath();
let content = fs.readFileSync(pluginPath, 'utf8');

// 修改 loadPlugin 函数，让它在无法加载插件时返回 null，而不是抛出错误
const newLoadPlugin = `function loadPlugin(path) {
  const cached = loadedPlugin.get(path);
  if (cached) return cached;
  const promise = import(path).then((module$1) => {
    const value = module$1.default || module$1;
    loadedPlugin.set(path, value);
    return value;
  }).catch(() => {
    // 无法加载插件时返回 null，而不是抛出错误
    return null;
  });
  loadedPlugin.set(path, promise);
  return promise;
}`;

// 使用更宽松的正则表达式匹配 loadPlugin 函数
const loadPluginRegex = /function loadPlugin\s*\(\s*path\s*\)\s*\{[\s\S]*?^\}/m;
content = content.replace(loadPluginRegex, newLoadPlugin);

// 修改 transform 函数，过滤掉 null 插件
const newTransform = `if (useFastRefresh) {
  const refreshPlugin = await loadPlugin("react-refresh/babel");
  if (refreshPlugin) plugins.push([refreshPlugin, { skipEnvCheck: true }]);
}
if (opts.jsxRuntime === "classic" && isJSX) {
  if (!isProduction) {
    const selfPlugin = await loadPlugin("@babel/plugin-transform-react-jsx-self");
    const sourcePlugin = await loadPlugin("@babel/plugin-transform-react-jsx-source");
    if (selfPlugin) plugins.push(selfPlugin);
    if (sourcePlugin) plugins.push(sourcePlugin);
  }
}`;

// 使用更宽松的正则表达式匹配 transform 相关代码
const transformRegex = /if\s*\(useFastRefresh\)\s*plugins\.push\s*\(\s*\[\s*await loadPlugin\s*\(\s*"react-refresh\/babel"\s*\)\s*,\s*\{\s*skipEnvCheck\s*:\s*true\s*\}\s*\]\s*\)\s*;[\s\S]*?^\s*\}/m;
content = content.replace(transformRegex, newTransform);

// 写入修改后的文件
fs.writeFileSync(pluginPath, content);

console.log('插件修改成功！');

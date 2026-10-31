'use strict';

// 为每个页面输出 <link rel="canonical">，便于搜索引擎去重
hexo.extend.filter.register('after_render:html', function (str, data) {
  if (!data || !data.path) return str;
  if (/\.(xml|txt|json)$/i.test(data.path)) return str;
  if (/rel=["']canonical["']/i.test(str)) return str;

  var base = String(hexo.config.url || '').replace(/\/+$/, '');
  var path = String(data.path).replace(/^\/+/, '').replace(/index\.html$/, '');
  var href = base + '/' + path;
  if (href.charAt(href.length - 1) !== '/') href += '/';

  return str.replace('</head>', '<link rel="canonical" href="' + href + '">\n</head>');
});

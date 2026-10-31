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

  str = str.replace('</head>', '<link rel="canonical" href="' + href + '">\n</head>');

  // 主题的 logo 图片没有 alt，补上（利于 SEO/无障碍）
  str = str.replace(/<img([^>]*class="avatar"[^>]*)>/g, function (m, attrs) {
    return /\balt=/.test(attrs) ? m : '<img' + attrs + ' alt="Starry Journey">';
  });
  return str;
});

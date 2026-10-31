'use strict';

// 为「每日简报」页面单独生成 Atom feed：/news/atom.xml
hexo.extend.generator.register('news_atom', function (locals) {
  var base = String(hexo.config.url || '').replace(/\/+$/, '');
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  };
  var allPages = locals.pages && locals.pages.toArray ? locals.pages.toArray() : Array.from(locals.pages || []);
  var pages = allPages.filter(function (p) {
    return p && p.path && /^news\/\d{4}-\d{2}-\d{2}\//.test(p.path) && p.date;
  }).sort(function (a, b) { return b.date.valueOf() - a.date.valueOf(); }).slice(0, 30);

  if (!pages.length) return;
  var updated = pages[0].date.toISOString();
  var items = pages.map(function (p) {
    var url = base + '/' + p.path.replace(/index\.html$/, '');
    return [
      '  <entry>',
      '    <title>' + esc(p.title) + '</title>',
      '    <link href="' + esc(url) + '"/>',
      '    <id>' + esc(url) + '</id>',
      '    <updated>' + (p.date ? p.date.toISOString() : new Date().toISOString()) + '</updated>',
      '    <summary>' + esc(p.description || p.title) + '</summary>',
      '  </entry>'
    ].join('\n');
  }).join('\n');

  var xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>Starry Journey · 每日简报</title>',
    '  <link href="' + base + '/news/" rel="alternate"/>',
    '  <link href="' + base + '/news/atom.xml" rel="self"/>',
    '  <id>' + base + '/news/</id>',
    '  <updated>' + updated + '</updated>',
    '  <author><name>Starry Journey</name></author>',
    items,
    '</feed>'
  ].join('\n');

  return { path: 'news/atom.xml', data: xml };
});

---
layout: page
menu_id: solar
title: 太阳系地图
description: 一张可玩的太阳系俯视图：真实椭圆轨道、1957–2026 时间轴、点击行星查看档案。
rightbar: false
---

<link rel="stylesheet" href="/css/solar.css?v=20261031">

<div id="solar-app">
  <div class="solar-stage">
    <canvas id="solar-canvas" aria-label="太阳系二维俯视图"></canvas>
    <canvas id="solar-canvas3d" aria-label="太阳系三维视图"></canvas>
    <div id="solar-labels" aria-hidden="true"></div>
    <div class="solar-badge">
      <b id="solar-year">2026.0</b>
      <span>年 · 二维俯视</span>
    </div>
    <div class="solar-hint">滚轮缩放 · 拖动平移 · 点击行星看档案</div>
    <div class="solar-info" id="solar-info" hidden></div>
  </div>

  <div class="solar-controls">
    <button id="solar-play" type="button" aria-label="播放/暂停">⏸ 暂停</button>
    <input id="solar-slider" type="range" min="1957" max="2026" step="0.1" value="2026" aria-label="年份">
    <select id="solar-speed" aria-label="播放速度">
      <option value="0.25">0.25×</option>
      <option value="0.5" selected>0.5×</option>
      <option value="1">1×</option>
      <option value="3">3×</option>
    </select>
    <button id="solar-reset" type="button">回到全图</button>
    <button id="solar-mode" type="button">3D 视角</button>
    <label class="solar-toggle"><input type="checkbox" id="solar-missions" checked> 探测器</label>
  </div>

  <div class="solar-events" id="solar-events" aria-label="历史事件"></div>
  <div class="solar-stories" id="solar-stories" aria-label="故事线"></div>

  <div class="solar-story" id="solar-story" hidden>
    <div class="solar-story-head">
      <b id="solar-story-title"></b>
      <span id="solar-story-progress"></span>
      <button id="solar-story-close" type="button" aria-label="退出故事线">×</button>
    </div>
    <p id="solar-story-text"></p>
    <div class="solar-story-actions">
      <button id="solar-story-prev" type="button">上一步</button>
      <button id="solar-story-next" type="button">下一步</button>
    </div>
  </div>

  <p class="solar-note">
    轨道数据来自 JPL 近似轨道根数（公版），行星位置按开普勒方程实时计算；距离经过压缩以便同屏显示。
    行星贴图：<a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a>（CC BY 4.0，基于 NASA 数据）。灵感来自 <a href="https://solar-system-atlas.pages.dev/solar/" target="_blank" rel="noopener">HUMAN ARTIFACTS</a>。
  </p>
</div>

<script src="/js/solar.js?v=20261031"></script>

---
layout: page
menu_id: astro
title: 星盘
description: 输入出生时间与地点，生成一张可交互的西洋星盘：行星落座、十二宫位与主要相位。
rightbar: false
---

<link rel="stylesheet" href="/css/astro.css?v=20261107">

<div id="astro-app">
  <section class="astro-card astro-form-card">
    <h2>排一张星盘</h2>
    <p class="astro-sub">西洋占星 · Placidus 宫位 · Swiss Ephemeris 计算</p>
    <form id="astro-form" autocomplete="off">
      <div class="astro-grid">
        <label>出生日期<input id="a-date" type="date" value="2000-01-01" required></label>
        <label>出生时间<input id="a-time" type="time" value="08:30" required></label>
        <label>时区
          <select id="a-tz">
            <option value="Asia/Shanghai" selected>Asia/Shanghai</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="Asia/Singapore">Asia/Singapore</option>
            <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </label>
        <label class="astro-city">城市<input id="a-city" list="astro-cities" placeholder="搜索城市，自动填经纬度"></label>
        <datalist id="astro-cities"></datalist>
        <label>纬度<input id="a-lat" type="number" step="any" min="-90" max="90" value="31.23" required></label>
        <label>经度<input id="a-lon" type="number" step="any" min="-180" max="180" value="121.47" required></label>
      </div>
      <div class="astro-actions">
        <button type="submit" id="a-submit">生成星盘</button>
        <span id="a-status" class="astro-status"></span>
      </div>
    </form>
    <p class="astro-note">出生数据只用于计算，加密存储 90 天，可随时删除；不会写进日志。</p>
  </section>

  <section class="astro-result" id="astro-result" hidden>
    <div class="astro-wheel-card">
      <canvas id="astro-wheel" aria-label="星盘轮"></canvas>
      <div class="astro-wheel-caption" id="astro-caption"></div>
    </div>
    <div class="astro-panels">
      <div class="astro-panel"><h3>行星</h3><ul id="astro-planets"></ul></div>
      <div class="astro-panel"><h3>宫位</h3><ul id="astro-houses"></ul></div>
      <div class="astro-panel"><h3>相位</h3><ul id="astro-aspects"></ul></div>
      <div class="astro-panel"><h3>元素分布</h3><div id="astro-elements"></div></div>
    </div>
    <div class="astro-actions">
      <button type="button" id="astro-reading-btn">让大肥鱼解读这张星盘</button>
      <button type="button" id="astro-download" class="astro-download">保存星盘图片</button>
      <button type="button" id="astro-delete" class="astro-delete">删除这张星盘</button>
    </div>
  </section>

  <section class="astro-reading" id="astro-reading" hidden>
    <h3>大肥鱼 · 星盘解读</h3>
    <div class="astro-reading-text" id="astro-reading-text"></div>
    <p class="astro-note">AI 解读仅供娱乐与自我探索，不构成任何决策建议。</p>
  </section>

  <section class="astro-saved" id="astro-saved">
    <h3>我的星盘</h3>
    <div id="astro-saved-list" class="astro-saved-list"></div>
  </section>
</div>

<script src="/js/astro.js?v=20261107"></script>

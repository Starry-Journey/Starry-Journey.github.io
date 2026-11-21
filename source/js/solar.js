/* 太阳系三维视图：Three.js（本地 vendor）+ 开普勒轨道根数 */
(function () {
  'use strict';

  var canvas = document.getElementById('solar-canvas3d');
  if (!canvas) return;
  var stage = canvas.parentElement;
  var appEl = document.getElementById('solar-app');
  var labelsBox = document.getElementById('solar-labels');
  var yearEl = document.getElementById('solar-year');
  var slider = document.getElementById('solar-slider');
  var playBtn = document.getElementById('solar-play');
  var speedSel = document.getElementById('solar-speed');
  var resetBtn = document.getElementById('solar-reset');
  var missionsToggle = document.getElementById('solar-missions');
  var infoEl = document.getElementById('solar-info');
  var loadingEl = document.getElementById('solar-loading');
  var badgeEl = document.querySelector('#solar-app .solar-badge span');

  if (appEl) appEl.classList.add('mode-3d');
  if (badgeEl) badgeEl.textContent = '年 · 三维视角';

  var DEG = Math.PI / 180;
  var MIN_YEAR = 1957,
    MAX_YEAR = 2026;
  var year = MAX_YEAR;
  var playing = false;
  var speed = 0.5;
  var selected = null;
  var REDUCED = !!(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // a: AU, e: 偏心率, P: 公转周期(年), peri: 近日点经度, L0: J2000 平黄经
  var PLANETS = [
    {
      id: 'mercury',
      zh: '水星',
      en: 'Mercury',
      a: 0.3871,
      e: 0.20563,
      P: 0.2408467,
      peri: 77.457,
      L0: 252.251,
      color: '#b9b1a8',
      size: 2.6,
      diameter: '4,879 km',
      day: '58.6 天',
      fact: '离太阳最近，表面昼夜温差超过 600℃，几乎没有大气。',
    },
    {
      id: 'venus',
      zh: '金星',
      en: 'Venus',
      a: 0.72333,
      e: 0.00677,
      P: 0.615197,
      peri: 131.602,
      L0: 181.98,
      color: '#e8c27a',
      size: 3.6,
      diameter: '12,104 km',
      day: '243 天（逆行）',
      fact: '被浓厚二氧化碳大气包裹，温室效应让表面高达 460℃，比水星还热。',
    },
    {
      id: 'earth',
      zh: '地球',
      en: 'Earth',
      a: 1.0,
      e: 0.01671,
      P: 1.000017,
      peri: 102.947,
      L0: 100.464,
      color: '#6fb7ff',
      size: 3.8,
      diameter: '12,742 km',
      day: '23.9 小时',
      fact: '目前已知唯一存在生命的天体，71% 的表面被液态水覆盖。',
    },
    {
      id: 'mars',
      zh: '火星',
      en: 'Mars',
      a: 1.52371,
      e: 0.09339,
      P: 1.880848,
      peri: 336.041,
      L0: 355.453,
      color: '#e07b5a',
      size: 3.0,
      diameter: '6,779 km',
      day: '24.6 小时',
      fact: '拥有太阳系最高的火山奥林匹斯山，高约 22 公里，是珠峰的两倍多。',
    },
    {
      id: 'jupiter',
      zh: '木星',
      en: 'Jupiter',
      a: 5.2026,
      e: 0.04839,
      P: 11.862,
      peri: 14.331,
      L0: 34.351,
      color: '#d9b48f',
      size: 7.4,
      diameter: '139,820 km',
      day: '9.9 小时',
      fact: '质量是其余七大行星总和的 2.5 倍，大红斑是一场刮了几百年的风暴。',
    },
    {
      id: 'saturn',
      zh: '土星',
      en: 'Saturn',
      a: 9.55491,
      e: 0.05386,
      P: 29.457,
      peri: 92.432,
      L0: 50.077,
      color: '#e6d3a3',
      size: 6.4,
      diameter: '116,460 km',
      day: '10.7 小时',
      fact: '壮观的星环主要由冰粒和岩石碎片组成，厚度却往往不到一公里。',
    },
    {
      id: 'uranus',
      zh: '天王星',
      en: 'Uranus',
      a: 19.21845,
      e: 0.04726,
      P: 84.011,
      peri: 170.964,
      L0: 314.055,
      color: '#9fe3e0',
      size: 5.2,
      diameter: '50,724 km',
      day: '17.2 小时',
      fact: '自转轴几乎“躺”在轨道面上，像一颗滚动的球，四季各持续约 21 年。',
    },
    {
      id: 'neptune',
      zh: '海王星',
      en: 'Neptune',
      a: 30.11039,
      e: 0.00859,
      P: 164.79,
      peri: 44.971,
      L0: 304.349,
      color: '#6f8dff',
      size: 5.0,
      diameter: '49,244 km',
      day: '16.1 小时',
      fact: '风速可达每小时 2,000 公里，是太阳系最狂暴的大气层。',
    },
    {
      id: 'pluto',
      zh: '冥王星',
      en: 'Pluto',
      a: 39.482,
      e: 0.2488,
      P: 247.94,
      peri: 224.07,
      L0: 238.93,
      color: '#c9b8a3',
      size: 2.4,
      diameter: '2,377 km',
      day: '6.4 天',
      fact: '2006 年被重新归类为矮行星；轨道倾角 17°，明显斜出其他行星的平面。',
    },
  ];

  var INC = {
    mercury: 7.0,
    venus: 3.39,
    earth: 0,
    mars: 1.85,
    jupiter: 1.3,
    saturn: 2.49,
    uranus: 0.77,
    neptune: 1.77,
    pluto: 17.2,
  };
  PLANETS.forEach(function (p) {
    p.inc = INC[p.id] || 0;
  });

  // 标志性任务/探测器（简化轨迹：深空按平均日心距，行星任务附着在行星旁）
  var MISSIONS = [
    {
      id: 'sputnik',
      zh: '斯普特尼克 1 号',
      en: 'Sputnik 1',
      year: 1957,
      color: '#ffd479',
      kind: 'planet',
      planet: 'earth',
      note: '人类第一颗人造卫星，开启太空时代。',
    },
    {
      id: 'apollo11',
      zh: '阿波罗 11 号',
      en: 'Apollo 11',
      year: 1969,
      color: '#ffd479',
      kind: 'planet',
      planet: 'earth',
      note: '首次载人登月，阿姆斯特朗留下“一小步”。',
    },
    {
      id: 'voyager1',
      zh: '旅行者 1 号',
      en: 'Voyager 1',
      year: 1977,
      color: '#ffe08a',
      kind: 'deep',
      angle: 218,
      dist: function (y) {
        return Math.max(0, (y - 1977) * 3.35);
      },
      note: '飞得最远的人造物体，已进入星际空间。',
    },
    {
      id: 'voyager2',
      zh: '旅行者 2 号',
      en: 'Voyager 2',
      year: 1977,
      color: '#ffe08a',
      kind: 'deep',
      angle: 296,
      dist: function (y) {
        return Math.max(0, (y - 1977) * 2.75);
      },
      note: '唯一造访过天王星和海王星的探测器。',
    },
    {
      id: 'hubble',
      zh: '哈勃空间望远镜',
      en: 'Hubble',
      year: 1990,
      color: '#9fc0ff',
      kind: 'planet',
      planet: 'earth',
      note: '绕地运行 30 余年，彻底改变了现代天文学。',
    },
    {
      id: 'iss',
      zh: '国际空间站',
      en: 'ISS',
      year: 1998,
      color: '#9fc0ff',
      kind: 'planet',
      planet: 'earth',
      note: '人类在近地轨道上的长期住所。',
    },
    {
      id: 'cassini',
      zh: '卡西尼号',
      en: 'Cassini',
      year: 1997,
      color: '#e6d3a3',
      kind: 'planet',
      planet: 'saturn',
      note: '环绕土星 13 年，最后主动坠入土星大气。',
    },
    {
      id: 'juno',
      zh: '朱诺号',
      en: 'Juno',
      year: 2011,
      color: '#d9b48f',
      kind: 'planet',
      planet: 'jupiter',
      note: '正在揭示木星内部结构与极区风暴。',
    },
    {
      id: 'curiosity',
      zh: '好奇号',
      en: 'Curiosity',
      year: 2011,
      color: '#e07b5a',
      kind: 'planet',
      planet: 'mars',
      note: '在盖尔撞击坑寻找火星曾经宜居的证据。',
    },
    {
      id: 'newhorizons',
      zh: '新视野号',
      en: 'New Horizons',
      year: 2006,
      color: '#c9b8a3',
      kind: 'deep',
      angle: 332,
      dist: function (y) {
        return Math.max(0, (y - 2006) * 4.1);
      },
      note: '2015 年飞掠冥王星，人类第一次看清它。',
    },
    {
      id: 'jwst',
      zh: '韦布空间望远镜',
      en: 'JWST',
      year: 2021,
      color: '#ffd479',
      kind: 'l2',
      note: '停在日地 L2 点，回望宇宙最早的星光。',
    },
    {
      id: 'parker',
      zh: '帕克太阳探测器',
      en: 'Parker Solar Probe',
      year: 2018,
      color: '#ffb066',
      kind: 'sun',
      note: '人类造得最快的物体，近日点仅约 0.05 AU。',
    },
    {
      id: 'perseverance',
      zh: '毅力号',
      en: 'Perseverance',
      year: 2020,
      color: '#e07b5a',
      kind: 'planet',
      planet: 'mars',
      note: '在杰泽罗撞击坑采集岩芯，寻找古代微生物痕迹。',
    },
    {
      id: 'tianwen1',
      zh: '天问一号',
      en: 'Tianwen-1',
      year: 2020,
      color: '#ffb066',
      kind: 'planet',
      planet: 'mars',
      note: '中国首次火星探测，祝融号在乌托邦平原着陆。',
    },
    {
      id: 'change5',
      zh: '嫦娥五号',
      en: 'Chang’e 5',
      year: 2020,
      color: '#ffd479',
      kind: 'planet',
      planet: 'earth',
      note: '带回 1.7 kg 月壤，是 1976 年后首次月球采样返回。',
    },
    {
      id: 'hayabusa2',
      zh: '隼鸟 2 号',
      en: 'Hayabusa2',
      year: 2014,
      color: '#c9b8a3',
      kind: 'deep',
      angle: 24,
      dist: function () {
        return 1.45;
      },
      note: '从小行星龙宫带回地下样本，揭示太阳系早期物质。',
    },
    {
      id: 'rosetta',
      zh: '罗塞塔号',
      en: 'Rosetta',
      year: 2004,
      color: '#9fc0ff',
      kind: 'deep',
      angle: 132,
      dist: function (y) {
        return y >= 2014 ? 3.6 : 0;
      },
      note: '首次环绕并着陆彗星 67P，追踪冰与有机物的来源。',
    },
  ];

  var EXTRA = {
    sputnik: {
      agency: '苏联',
      status: '1957–1958',
      end: 1958,
      target: '地球轨道',
      story: '直径 58 cm、重 83.6 kg，发出简单的“哔哔”信号，标志太空时代开始。',
    },
    apollo11: {
      agency: 'NASA',
      status: '1969',
      end: 1969,
      target: '月球',
      story: '阿姆斯特朗和奥尔德林在静海着陆，人类第一次踏上另一个天体。',
    },
    voyager1: {
      agency: 'NASA / JPL',
      status: '1977–',
      target: '星际空间',
      story: '飞掠木星、土星后一路向外，2012 年进入星际空间，目前约 164 AU。',
    },
    voyager2: {
      agency: 'NASA / JPL',
      status: '1977–',
      target: '星际空间',
      story: '唯一造访天王星与海王星的探测器，2018 年进入星际空间。',
    },
    hubble: {
      agency: 'NASA / ESA',
      status: '1990–',
      target: '近地轨道',
      story: '口径 2.4 米，30 多年里拍摄了深空、星云与系外行星大气。',
    },
    iss: {
      agency: '多国合作',
      status: '1998–',
      target: '近地轨道',
      story: '人类持续驻留时间最长的空间站，约 90 分钟绕地球一圈。',
    },
    cassini: {
      agency: 'NASA / ESA / ASI',
      status: '1997–2017',
      end: 2017,
      target: '土星',
      story: '环绕土星 13 年，发现土卫二喷泉，最终主动坠入土星大气。',
    },
    juno: {
      agency: 'NASA',
      status: '2011–',
      target: '木星',
      story: '极轨探测器，正在测绘木星内部结构、磁场与极区风暴。',
    },
    curiosity: {
      agency: 'NASA',
      status: '2011–',
      target: '火星',
      story: '在盖尔撞击坑钻探岩石，证明火星曾有湖泊与适宜环境。',
    },
    perseverance: {
      agency: 'NASA',
      status: '2020–',
      target: '火星',
      story: '在杰泽罗撞击坑采集岩芯，等待未来任务取回地球。',
    },
    tianwen1: {
      agency: 'CNSA',
      status: '2020–',
      target: '火星',
      story: '一次任务完成环绕、着陆、巡视，祝融号在乌托邦平原工作。',
    },
    change5: {
      agency: 'CNSA',
      status: '2020',
      end: 2021,
      target: '月球',
      story: '带回 1.7 kg 月壤，是 1976 年后首次月球采样返回。',
    },
    newhorizons: {
      agency: 'NASA',
      status: '2006–',
      target: '柯伊伯带',
      story: '2015 年飞掠冥王星，2019 年飞掠 Arrokoth，是人类造访过最远的天体。',
    },
    jwst: {
      agency: 'NASA / ESA / CSA',
      status: '2021–',
      target: '日地 L2',
      story: '6.5 米主镜，在红外波段观测宇宙最早的星系与系外行星大气。',
    },
    parker: {
      agency: 'NASA',
      status: '2018–',
      target: '日冕',
      story: '人类造得最快的物体，多次穿过太阳日冕，近日点约 0.05 AU。',
    },
    hayabusa2: {
      agency: 'JAXA',
      status: '2014–',
      target: '小行星龙宫',
      story: '采集小行星地下样本并带回地球，揭示太阳系早期物质。',
    },
    rosetta: {
      agency: 'ESA',
      status: '2004–2016',
      end: 2016,
      target: '彗星 67P',
      story: '首次环绕并着陆彗星，追踪太阳系早期的冰与有机物。',
    },
  };
  MISSIONS.forEach(function (m) {
    Object.assign(m, EXTRA[m.id] || {});
  });

  var STORIES = [
    {
      id: 'earth',
      title: '飞出地球',
      steps: [
        {
          year: 1957,
          focus: { mission: 'sputnik' },
          text: '1957 年，斯普特尼克 1 号发出第一声“哔哔”。人类第一次把人造物体送上天。',
        },
        {
          year: 1969,
          focus: { mission: 'apollo11' },
          text: '12 年后，阿波罗 11 号让人类第一次踩上另一个天体。',
        },
        {
          year: 1990,
          focus: { mission: 'hubble' },
          text: '哈勃升空，把望远镜搬到大气层之上，深空照片从此改变了宇宙观。',
        },
        {
          year: 1998,
          focus: { mission: 'iss' },
          text: '国际空间站开始组装，人类在近地轨道有了长期住所。',
        },
      ],
    },
    {
      id: 'giants',
      title: '巨行星与深空',
      steps: [
        {
          year: 1977,
          focus: { mission: 'voyager1' },
          text: '旅行者 1 号出发，利用行星引力弹弓一路向外，最终飞出太阳系。',
        },
        {
          year: 1997,
          focus: { planet: 'saturn' },
          text: '卡西尼号启程前往土星，13 年里发现了土卫二的冰喷泉。',
        },
        {
          year: 2011,
          focus: { planet: 'jupiter' },
          text: '朱诺号奔赴木星，用极轨揭开巨行星内部的秘密。',
        },
        {
          year: 2015,
          focus: { planet: 'pluto' },
          text: '新视野号飞掠冥王星，人类第一次看清这颗矮行星的“心”。',
        },
      ],
    },
    {
      id: 'light',
      title: '寻找宇宙的光',
      steps: [
        {
          year: 1990,
          focus: { planet: 'earth' },
          text: '从哈勃开始，人类把目光投向宇宙深处；而地球本身，也成了一颗被观测的行星。',
        },
        {
          year: 2018,
          focus: { sun: true },
          text: '帕克太阳探测器冲向太阳，穿过日冕，研究太阳风的起源。',
        },
        {
          year: 2021,
          focus: { mission: 'jwst' },
          text: '韦布望远镜抵达日地 L2，用红外光回望宇宙最早的一批星系。',
        },
        {
          year: 2026,
          focus: { planet: 'earth' },
          text: '今天，一万多个人造物体正在太阳系里运行。这张图上的每一个点，都是一段故事。',
        },
      ],
    },
  ];

  var EVENTS = [
    { year: 1957, label: '斯普特尼克' },
    { year: 1969, label: '阿波罗 11' },
    { year: 1977, label: '旅行者' },
    { year: 1990, label: '哈勃' },
    { year: 2015, label: '冥王星飞掠' },
    { year: 2021, label: '韦布' },
  ];

  var showMissions = true;

  function norm360(x) {
    return ((x % 360) + 360) % 360;
  }

  function orbitalState(p, tYears) {
    var M = norm360(p.L0 + (360 * tYears) / p.P) * DEG;
    var E = M;
    for (var i = 0; i < 6; i++) {
      E = E - (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
    }
    var nu =
      2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
    var r = p.a * (1 - p.e * Math.cos(E));
    return { r: r, ang: nu + p.peri * DEG };
  }

  // ---------- 依赖加载（本地 vendor，不走 CDN） ----------
  var threePromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }

  function loadThree() {
    if (window.THREE && window.THREE.OrbitControls) return Promise.resolve();
    if (!threePromise) {
      threePromise = loadScript('/js/vendor/three.min.js')
        .then(function () {
          return loadScript('/js/vendor/OrbitControls.js');
        })
        .catch(function (err) {
          threePromise = null;
          throw err;
        });
    }
    return threePromise;
  }

  var RADIUS = {
    mercury: 0.11,
    venus: 0.14,
    earth: 0.15,
    mars: 0.12,
    jupiter: 0.4,
    saturn: 0.34,
    uranus: 0.24,
    neptune: 0.24,
    pluto: 0.09,
  };

  var TEXTURES = {
    sun: '/images/textures/sun.jpg',
    mercury: '/images/textures/mercury.jpg',
    venus: '/images/textures/venus.jpg',
    earth: '/images/textures/earth.jpg',
    mars: '/images/textures/mars.jpg',
    jupiter: '/images/textures/jupiter.jpg',
    saturn: '/images/textures/saturn.jpg',
    uranus: '/images/textures/uranus.jpg',
    neptune: '/images/textures/neptune.jpg',
  };
  var texLoader = null;

  function scale3D(rAU) {
    return Math.log(1 + rAU * 3) * 1.4 + Math.max(0, rAU - 2) * 0.06;
  }

  // ---------- 贴图：统一缓存，避免同一张图重复下载 ----------
  var texCache = {};
  var maxAniso = 1;
  var RING_TEX = '/images/textures/saturn-ring.png';

  function loadTex(url) {
    if (texCache[url]) return texCache[url];
    if (!texLoader) texLoader = new THREE.TextureLoader();
    var tex = (texCache[url] = texLoader.load(url));
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = maxAniso;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function applyTexture(p, mesh) {
    if (!TEXTURES[p.id]) return;
    mesh.material.map = loadTex(TEXTURES[p.id]);
    mesh.material.needsUpdate = true;
  }

  /* RingGeometry 的默认 uv 是矩形展开，环带贴图需要把 u 重新映射到半径上 */
  function ringTextureGeometry(inner, outer) {
    var geo = new THREE.RingGeometry(inner, outer, 96, 1);
    var pos = geo.attributes.position;
    var uv = geo.attributes.uv;
    for (var i = 0; i < pos.count; i++) {
      var r = Math.sqrt(pos.getX(i) * pos.getX(i) + pos.getY(i) * pos.getY(i));
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }

  function pos3DInto(p, tYears, out) {
    var st = orbitalState(p, tYears);
    var R = scale3D(st.r);
    var y = R * Math.sin(st.ang);
    var inc = (p.inc || 0) * DEG;
    out.set(R * Math.cos(st.ang), y * Math.cos(inc), y * Math.sin(inc));
    return out;
  }

  function pos3D(p, tYears) {
    var st = orbitalState(p, tYears);
    var R = scale3D(st.r);
    var x = R * Math.cos(st.ang);
    var y = R * Math.sin(st.ang);
    var inc = (p.inc || 0) * DEG;
    return new THREE.Vector3(x, y * Math.cos(inc), y * Math.sin(inc));
  }

  function makeTexture(p) {
    var c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = p.color;
    g.fillRect(0, 0, 512, 256);

    if (p.id === 'earth') {
      g.fillStyle = '#1c5fa8';
      g.fillRect(0, 0, 512, 256);
      for (var i = 0; i < 26; i++) {
        g.fillStyle = 'rgba(80,150,90,' + (0.35 + Math.random() * 0.35) + ')';
        g.beginPath();
        g.ellipse(
          Math.random() * 512,
          40 + Math.random() * 176,
          10 + Math.random() * 26,
          6 + Math.random() * 16,
          Math.random() * 3,
          0,
          Math.PI * 2
        );
        g.fill();
      }
      g.fillStyle = 'rgba(240,248,255,0.9)';
      g.fillRect(0, 0, 512, 18);
      g.fillRect(0, 238, 512, 18);
      for (var k = 0; k < 30; k++) {
        g.fillStyle = 'rgba(255,255,255,' + (0.12 + Math.random() * 0.2) + ')';
        g.beginPath();
        g.ellipse(
          Math.random() * 512,
          Math.random() * 256,
          14 + Math.random() * 30,
          4 + Math.random() * 8,
          0,
          0,
          Math.PI * 2
        );
        g.fill();
      }
    } else {
      var bands = ['jupiter', 'saturn', 'uranus', 'neptune'].indexOf(p.id) >= 0;
      if (bands) {
        for (var b = 0; b < 18; b++) {
          var y = Math.random() * 256;
          g.fillStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.07) + ')';
          g.fillRect(0, y, 512, 3 + Math.random() * 10);
          g.fillStyle = 'rgba(0,0,0,' + (0.02 + Math.random() * 0.05) + ')';
          g.fillRect(0, y + 6, 512, 2 + Math.random() * 6);
        }
      }
      for (var j = 0; j < 70; j++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
        g.beginPath();
        g.arc(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 7, 0, Math.PI * 2);
        g.fill();
      }
      if (p.id === 'jupiter') {
        g.fillStyle = 'rgba(200,90,60,0.55)';
        g.beginPath();
        g.ellipse(360, 160, 26, 13, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function markerTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 32;
    var g = c.getContext('2d');
    g.translate(16, 16);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#ffd479';
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 2;
    g.fillRect(-6, -6, 12, 12);
    g.strokeRect(-6, -6, 12, 12);
    return new THREE.CanvasTexture(c);
  }

  function glowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,240,190,1)');
    grad.addColorStop(0.25, 'rgba(255,190,90,0.55)');
    grad.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function orbit3DPoints(p) {
    var pts = [];
    for (var i = 0; i <= 160; i++) {
      var E = (i / 160) * Math.PI * 2;
      var r = p.a * (1 - p.e * Math.cos(E));
      var nu =
        2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
      var R = scale3D(r);
      var ang = nu + p.peri * DEG;
      var inc = p.inc * DEG;
      pts.push(
        new THREE.Vector3(
          R * Math.cos(ang),
          R * Math.sin(ang) * Math.cos(inc),
          R * Math.sin(ang) * Math.sin(inc)
        )
      );
    }
    return pts;
  }

  function missionOffset(m) {
    var idx = MISSIONS.indexOf(m);
    var ang = idx * 1.9;
    var rad = 0.32 + (idx % 4) * 0.1;
    return new THREE.Vector3(Math.cos(ang) * rad, 0.18 + (idx % 3) * 0.08, Math.sin(ang) * rad);
  }

  function mission3DPos(m, tYears) {
    var yearNow = 2000 + tYears;
    if (yearNow < m.year) return null;
    if (m.end && yearNow > m.end) return null;
    if (m.kind === 'planet') {
      var p = PLANETS.filter(function (x) {
        return x.id === m.planet;
      })[0];
      var q = pos3D(p, tYears);
      return q.clone().add(missionOffset(m));
    }
    if (m.kind === 'deep') {
      var d = m.dist(yearNow);
      if (d <= 0) {
        // 还没出发：停在地球附近
        var e0 = pos3D(PLANETS[2], tYears);
        return e0.clone().add(missionOffset(m));
      }
      var R = Math.min(scale3D(d), 9.5);
      return new THREE.Vector3(R * Math.cos(m.angle * DEG), 0.55, R * Math.sin(m.angle * DEG));
    }
    if (m.kind === 'l2') {
      var e = pos3D(PLANETS[2], tYears);
      return e.multiplyScalar(1.01);
    }
    if (m.kind === 'sun') {
      var rr = Math.pow(0.32, 0.6);
      var a = (yearNow - 2018) * 55 * DEG;
      return new THREE.Vector3(rr * Math.cos(a), 0, rr * Math.sin(a));
    }
    return null;
  }
  function showMission(m, tYears) {
    var yearNow = 2000 + tYears;
    var rows = '<dt>发射</dt><dd>' + m.year + ' 年</dd>';
    if (m.kind === 'deep') {
      rows += '<dt>日心距</dt><dd>' + m.dist(yearNow).toFixed(1) + ' AU</dd>';
    } else if (m.kind === 'l2') {
      rows += '<dt>位置</dt><dd>日地 L2 点（约 1.01 AU）</dd>';
    } else if (m.kind === 'sun') {
      rows += '<dt>轨道</dt><dd>近日点约 0.05 AU</dd>';
    } else {
      var p = PLANETS.filter(function (x) {
        return x.id === m.planet;
      })[0];
      rows += '<dt>所在天体</dt><dd>' + p.zh + '</dd>';
    }
    if (m.agency) rows += '<dt>机构</dt><dd>' + m.agency + '</dd>';
    if (m.status) rows += '<dt>状态</dt><dd>' + m.status + '</dd>';
    if (m.target) rows += '<dt>目标</dt><dd>' + m.target + '</dd>';
    infoEl.hidden = false;
    infoEl.innerHTML =
      '<button class="solar-info-close" type="button" aria-label="关闭">×</button>' +
      '<h3>' +
      m.zh +
      ' <small>' +
      m.en +
      '</small></h3>' +
      '<dl>' +
      rows +
      '</dl>' +
      '<p>' +
      m.note +
      '</p>' +
      (m.story ? '<p class="solar-info-story">' + m.story + '</p>' : '');
    infoEl.querySelector('.solar-info-close').addEventListener('click', function () {
      infoEl.hidden = true;
      selected = null;
      if (T3) setFollow(null);
      wake();
    });
  }

  function showInfo(p) {
    infoEl.hidden = false;
    infoEl.innerHTML =
      '<button class="solar-info-close" type="button" aria-label="关闭">×</button>' +
      '<h3>' +
      p.zh +
      ' <small>' +
      p.en +
      '</small></h3>' +
      '<dl>' +
      '<dt>直径</dt><dd>' +
      p.diameter +
      '</dd>' +
      '<dt>公转周期</dt><dd>' +
      fmtPeriod(p.P) +
      '</dd>' +
      '<dt>自转周期</dt><dd>' +
      p.day +
      '</dd>' +
      '<dt>轨道半长轴</dt><dd>' +
      p.a.toFixed(3) +
      ' AU</dd>' +
      '<dt>偏心率</dt><dd>' +
      p.e.toFixed(4) +
      '</dd>' +
      '</dl>' +
      '<p>' +
      p.fact +
      '</p>';
    infoEl.querySelector('.solar-info-close').addEventListener('click', function () {
      infoEl.hidden = true;
      selected = null;
      if (T3) setFollow(null);
      wake();
    });
  }

  function fmtPeriod(y) {
    if (y < 1) return (y * 365.25).toFixed(1) + ' 天';
    return y.toFixed(2) + ' 年';
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // ---------- 故事线 ----------
  var storyState = null;
  var storyPanel = document.getElementById('solar-story');
  // 文章容器可能带 transform，fixed 会相对它定位；挂到 body 下避免
  if (storyPanel && storyPanel.parentElement !== document.body)
    document.body.appendChild(storyPanel);
  var storyTitle = document.getElementById('solar-story-title');
  var storyText = document.getElementById('solar-story-text');
  var storyProgress = document.getElementById('solar-story-progress');
  var storyPrev = document.getElementById('solar-story-prev');
  var storyNext = document.getElementById('solar-story-next');
  var storyClose = document.getElementById('solar-story-close');

  function startStory(story) {
    storyState = { story: story, index: 0 };
    storyPanel.hidden = false;
    infoEl.hidden = true;
    selected = null;
    if (stage && stage.scrollIntoView)
      stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    gotoStoryStep(0);
  }

  function gotoStoryStep(i) {
    if (!storyState) return;
    var steps = storyState.story.steps;
    storyState.index = clamp(i, 0, steps.length - 1);
    var step = steps[storyState.index];
    storyTitle.textContent = storyState.story.title;
    storyText.textContent = step.text;
    storyProgress.textContent = storyState.index + 1 + ' / ' + steps.length;
    storyPrev.disabled = storyState.index === 0;
    storyNext.disabled = storyState.index === steps.length - 1;
    playing = false;
    playBtn.textContent = '▶ 播放';
    setYear(step.year);
    focusTarget(step.focus);
    wake();
  }

  if (storyPrev) {
    storyPrev.addEventListener('click', function () {
      gotoStoryStep(storyState.index - 1);
    });
    storyNext.addEventListener('click', function () {
      gotoStoryStep(storyState.index + 1);
    });
    storyClose.addEventListener('click', function () {
      storyState = null;
      storyPanel.hidden = true;
    });
  }

  function buildStories() {
    var box = document.getElementById('solar-stories');
    if (!box) return;
    STORIES.forEach(function (story) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '▶ ' + story.title;
      btn.addEventListener('click', function () {
        startStory(story);
      });
      box.appendChild(btn);
    });
  }

  function buildEvents() {
    var box = document.getElementById('solar-events');
    if (!box) return;
    EVENTS.forEach(function (ev) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = ev.year + ' ' + ev.label;
      btn.addEventListener('click', function () {
        playing = false;
        playBtn.textContent = '▶ 播放';
        setYear(ev.year);
        Array.prototype.forEach.call(box.children, function (c) {
          c.classList.remove('active');
        });
        btn.classList.add('active');
      });
      box.appendChild(btn);
    });
  }

  function setYear(v) {
    year = clamp(v, MIN_YEAR, MAX_YEAR);
    yearEl.textContent = year.toFixed(1);
    slider.value = String(year);
    wake();
  }

  // ================= 三维场景 =================
  var T3 = null;
  var needRender = true;
  var lastTs = 0;
  var rect = { width: 1, height: 1 };
  var labelW = {};
  var placed = [];
  var ray = null;
  var mouse = null;
  var STARS = 800;
  var INNER = ['mercury', 'venus', 'earth', 'mars'];
  var SPIN = {
    mercury: 0.42,
    venus: -0.16,
    earth: 0.9,
    mars: 0.88,
    jupiter: 2.1,
    saturn: 1.9,
    uranus: 1.4,
    neptune: 1.5,
    pluto: 0.28,
  };

  function wake() {
    needRender = true;
  }

  function measureRect() {
    var r = stage.getBoundingClientRect();
    rect.width = Math.max(1, r.width);
    rect.height = Math.max(1, r.height);
  }

  function resize3D() {
    if (!T3) return;
    measureRect();
    T3.renderer.setSize(rect.width, rect.height, false);
    T3.camera.aspect = rect.width / rect.height;
    T3.camera.updateProjectionMatrix();
    wake();
  }

  var flyDir = null;

  function flyTo3D(targetPos, dist) {
    if (!T3) return;
    if (!flyDir) flyDir = new THREE.Vector3();
    var dir = flyDir.copy(T3.camera.position).sub(T3.controls.target);
    if (dir.length() < 0.01) dir.set(0, 0.5, 1);
    dir.normalize();
    T3.fly = {
      start: performance.now(),
      dur: 1100,
      fromPos: T3.camera.position.clone(),
      fromTarget: T3.controls.target.clone(),
      toPos: targetPos.clone().add(dir.multiplyScalar(dist)),
      toTarget: targetPos.clone(),
    };
    T3.controls.enabled = false;
    wake();
  }

  function stepFly(ts) {
    var f = T3.fly;
    var k = clamp((ts - f.start) / f.dur, 0, 1);
    var e = 1 - Math.pow(1 - k, 3);
    T3.camera.position.lerpVectors(f.fromPos, f.toPos, e);
    T3.controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    T3.camera.lookAt(T3.controls.target);
    needRender = true;
    if (k >= 1) {
      T3.fly = null;
      T3.controls.enabled = true;
    }
  }

  function focusTarget(f) {
    if (!T3) return;
    var tYears = year - 2000;
    var pos = null;
    var dist = 3;
    if (f.planet) {
      pos = T3.bodies[f.planet].position.clone();
      dist = Math.max(0.9, RADIUS[f.planet] * 7);
    } else if (f.mission) {
      for (var i = 0; i < T3.missionMeshes.length; i++) {
        var mm = T3.missionMeshes[i];
        if (mm.mission.id !== f.mission) continue;
        pos = mission3DPos(mm.mission, tYears);
        if (!pos) pos = new THREE.Vector3(0, 0, 0);
        else pos = pos.clone();
        dist = 2.2;
        break;
      }
    } else if (f.sun) {
      pos = new THREE.Vector3(0, 0, 0);
      dist = 4.5;
    }
    if (!pos) return;
    if (f.planet) setFollow(T3.bodies[f.planet]);
    else if (f.mission) {
      for (var j = 0; j < T3.missionMeshes.length; j++) {
        if (T3.missionMeshes[j].mission.id === f.mission) setFollow(T3.missionMeshes[j].mesh);
      }
    } else {
      setFollow(null);
    }
    flyTo3D(pos, dist);
  }

  function init3D() {
    if (THREE.Cache) THREE.Cache.enabled = true;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    renderer.setPixelRatio(dpr);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
    camera.position.set(0, 14, 22);
    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 80;
    controls.autoRotate = !REDUCED;
    controls.autoRotateSpeed = 0.18;
    controls.addEventListener('change', wake);

    scene.add(new THREE.AmbientLight(0xffffff, 0.32));
    scene.add(new THREE.HemisphereLight(0x9db4ff, 0x101426, 0.38));
    scene.add(new THREE.PointLight(0xfff2d0, 1.35, 0, 0));

    var starGeo = new THREE.BufferGeometry();
    var arr = new Float32Array(STARS * 3);
    for (var i = 0; i < STARS; i++) {
      var rr = 120 + Math.random() * 120;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = rr * Math.cos(ph);
      arr[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.55, transparent: true, opacity: 0.85 })
      )
    );

    var sunMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    var sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), sunMat);
    sunMat.map = loadTex(TEXTURES.sun);
    sunMat.needsUpdate = true;
    scene.add(sun);
    var glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffbb55,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(2.6, 2.6, 1);
    scene.add(glow);

    var bodies = {};
    var pickables = [];
    var labels = [];
    var missionMeshes = [];

    PLANETS.forEach(function (p) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS[p.id], 32, 24),
        new THREE.MeshPhongMaterial({
          map: makeTexture(p),
          shininess: 10,
          specular: 0x333333,
          emissive: new THREE.Color(p.color).multiplyScalar(0.07),
        })
      );
      applyTexture(p, mesh);
      mesh.rotation.z = (p.tilt || 0) * DEG;
      scene.add(mesh);
      mesh.userData = { type: 'planet', id: p.id };
      pickables.push(mesh);

      scene.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(orbit3DPoints(p)),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(p.color),
            transparent: true,
            opacity: 0.34,
          })
        )
      );

      if (p.id === 'saturn') {
        var inner = RADIUS[p.id] * 1.35;
        var ring = new THREE.Mesh(
          ringTextureGeometry(inner, RADIUS[p.id] * 2.3),
          new THREE.MeshBasicMaterial({
            map: loadTex(RING_TEX),
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
      }

      var label = document.createElement('div');
      label.className = 'solar-label';
      label.textContent = p.zh;
      labelsBox.appendChild(label);
      labels.push({ el: label, obj: mesh, kind: 'planet', id: p.id });
      bodies[p.id] = mesh;
    });

    var markerTex = markerTexture();
    MISSIONS.forEach(function (m) {
      var mesh = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: markerTex,
          color: 0xffffff,
          sizeAttenuation: false,
          transparent: true,
          depthWrite: false,
        })
      );
      mesh.scale.set(0.016, 0.016, 1);
      mesh.userData = { type: 'mission', id: m.id };
      scene.add(mesh);
      pickables.push(mesh);
      missionMeshes.push({ mesh: mesh, mission: m });
      if (m.kind === 'deep') {
        var label = document.createElement('div');
        label.className = 'solar-label mission';
        label.textContent = m.zh;
        labelsBox.appendChild(label);
        labels.push({ el: label, obj: mesh, kind: 'mission', id: m.id });
      }
    });

    T3 = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      bodies: bodies,
      labels: labels,
      pickables: pickables,
      missionMeshes: missionMeshes,
      tmp: new THREE.Vector3(),
      tmp2: new THREE.Vector3(),
      follow: null,
      dpr: dpr,
      fly: null,
      ready: false,
    };
    measureRect();
    resize3D();
    bind3DClick();
  }

  /* 选中目标后镜头随它平移：暂停细看、拖时间轴时关注的地平不会漂出画面。
     播放时不跟随——0.5 年/秒的速度下追着公转天体跑画面会失控。 */
  function followTarget() {
    if (!T3.follow || T3.fly || playing) return;
    var delta = T3.tmp2;
    T3.follow.getWorldPosition(T3.tmp);
    delta.copy(T3.tmp).sub(T3.controls.target);
    if (delta.lengthSq() < 1e-9) return;
    T3.camera.position.add(delta);
    T3.controls.target.add(delta);
    needRender = true;
  }

  function setFollow(obj) {
    T3.follow = obj || null;
  }

  function draw3D(dt) {
    var tYears = year - 2000;
    var i;
    for (i = 0; i < PLANETS.length; i++) {
      var mesh = T3.bodies[PLANETS[i].id];
      pos3DInto(PLANETS[i], tYears, mesh.position);
      if (playing) mesh.rotation.y += dt * (SPIN[PLANETS[i].id] || 0.5);
    }
    for (i = 0; i < T3.missionMeshes.length; i++) {
      var mm = T3.missionMeshes[i];
      var pos = showMissions ? mission3DPos(mm.mission, tYears) : null;
      if (pos) {
        mm.mesh.position.copy(pos);
        mm.mesh.visible = true;
      } else {
        mm.mesh.visible = false;
      }
    }
    followTarget();
    update3DLabels();
    T3.renderer.render(T3.scene, T3.camera);
    if (!T3.ready) {
      T3.ready = true;
      canvas.setAttribute('data-ready', '1');
      if (loadingEl) loadingEl.hidden = true;
    }
  }

  function labelVisible(l, x, camDist) {
    if (l.kind === 'mission') return selected === l.id || camDist >= 7;
    return !(INNER.indexOf(l.id) >= 0 && selected !== l.id && camDist > 20);
  }

  function update3DLabels() {
    var placedN = 0;
    // 跟随会让相机在两次 render 之间移动，先同步世界矩阵，否则标注会滞后一帧
    T3.camera.updateMatrixWorld();
    var camDist = T3.camera.position.length();
    for (var i = 0; i < T3.labels.length; i++) {
      var l = T3.labels[i];
      var v = T3.tmp2;
      l.obj.getWorldPosition(v);
      v.project(T3.camera);
      if (v.z >= 1 || !l.obj.visible || !labelVisible(l, 0, camDist)) {
        l.el.style.display = 'none';
        continue;
      }
      var x = (v.x * 0.5 + 0.5) * rect.width;
      var y = (-v.y * 0.5 + 0.5) * rect.height - 12;
      if (!labelW[l.id]) {
        labelW[l.id] = Math.max(30, l.el.offsetWidth || l.el.textContent.length * 10);
      }
      var w = labelW[l.id];
      var offsets = [0, -13, 13, -26];
      for (var k = 0; k < offsets.length; k++) {
        var box = placed[placedN] || (placed[placedN] = { x: 0, y: 0, w: 0, h: 0 });
        box.x = x - w / 2;
        box.y = y + offsets[k] - 9;
        box.w = w;
        box.h = 12;
        var clash = false;
        for (var j = 0; j < placedN; j++) {
          var b = placed[j];
          if (
            box.x < b.x + b.w &&
            box.x + box.w > b.x &&
            box.y < b.y + b.h &&
            box.y + box.h > b.y
          ) {
            clash = true;
            break;
          }
        }
        if (!clash || l.id === selected) {
          y += offsets[k];
          break;
        }
      }
      placed[placedN].x = x - w / 2;
      placed[placedN].y = y - 9;
      placedN++;
      l.el.style.left = x + 'px';
      l.el.style.top = y + 'px';
      l.el.style.display = 'block';
      if (l.el.classList.contains('selected') !== (selected === l.id)) {
        l.el.classList.toggle('selected', selected === l.id);
      }
    }
  }

  function bind3DClick() {
    var down = null;
    canvas.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY };
      // 用户接管视角后不再自转，避免和手动操作打架
      if (T3) T3.controls.autoRotate = false;
    });
    canvas.addEventListener('pointerup', function (e) {
      if (!down || !T3) return;
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6;
      down = null;
      if (moved) return;
      if (!ray) {
        ray = new THREE.Raycaster();
        mouse = new THREE.Vector2();
      }
      var r = canvas.getBoundingClientRect();
      mouse.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
      ray.setFromCamera(mouse, T3.camera);
      var hits = ray.intersectObjects(T3.pickables, false);
      if (!hits.length) {
        selected = null;
        setFollow(null);
        infoEl.hidden = true;
        wake();
        return;
      }
      var obj = hits[0].object;
      var tYears = year - 2000;
      selected = obj.userData.id;
      setFollow(obj);
      if (obj.userData.type === 'planet') {
        var p = PLANETS.filter(function (x) {
          return x.id === selected;
        })[0];
        showInfo(p);
        flyTo3D(T3.tmp.copy(obj.position), Math.max(0.9, RADIUS[selected] * 7));
      } else {
        var m = MISSIONS.filter(function (x) {
          return x.id === selected;
        })[0];
        showMission(m, tYears);
        flyTo3D(T3.tmp.copy(obj.position), 1.6);
      }
      wake();
    });
  }

  // ---------- 主循环：只在时间流动、相机移动或选中变化时重绘 ----------
  var MIN_DPR = 0.75;
  var MAX_DPR = 1.5;
  var TARGET_MS = 22; // 约 45fps，低于它就降分辨率
  var cpuEma = 0;
  var cadenceEma = 0;
  var lastFrame = 0;
  var lastRender = 0;
  var lastStep = 0;
  var minGap = 0;
  var statT0 = 0;

  /* 上一帧的主线程占用越久，下一帧就让出越多时间：慢设备上操作依然跟手 */
  function paceFrame(cost) {
    cpuEma = cpuEma ? cpuEma * 0.8 + cost * 0.2 : cost;
    minGap = cpuEma > 55 ? 50 : cpuEma > 26 ? 33 : 0;
  }

  /* rAF 间隔才是用户看到的流畅度：WebGL 提交是异步的，用提交耗时判断会失真 */
  function trackCadence(ts) {
    if (lastFrame) {
      var d = ts - lastFrame;
      if (d > 0 && d < 250) cadenceEma = cadenceEma ? cadenceEma * 0.9 + d * 0.1 : d;
    }
    lastFrame = ts;
  }

  /* 动态分辨率：帧率不达标就降低渲染倍率，而不是删内容或丢帧 */
  function adaptQuality(ts) {
    if (T3.dpr <= MIN_DPR || ts - lastStep < 800) return;
    if (!cadenceEma || cadenceEma < TARGET_MS) return;
    lastStep = ts;
    T3.dpr = Math.max(MIN_DPR, Math.round((T3.dpr - 0.25) * 100) / 100);
    T3.renderer.setPixelRatio(T3.dpr);
    resize3D();
    cadenceEma = 0;
  }

  function reportStats(ts) {
    if (!statT0) statT0 = ts;
    if (ts - statT0 < 1000) return;
    statT0 = ts;
    canvas.setAttribute('data-cost', cpuEma.toFixed(1));
    canvas.setAttribute('data-fps', cadenceEma ? (1000 / cadenceEma).toFixed(1) : '0');
    canvas.setAttribute('data-dpr', String(T3.dpr));
  }

  function advanceYear(dt) {
    setYear(year + dt * speed);
    if (year >= MAX_YEAR) {
      playing = false;
      playBtn.textContent = '▶ 播放';
    }
  }

  function loop(ts) {
    if (T3) {
      trackCadence(ts);
      var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      if (playing) advanceYear(dt);
      if (T3.fly) stepFly(ts);
      else T3.controls.update();
      if (needRender && ts - lastRender >= minGap) {
        needRender = false;
        lastRender = ts;
        var t0 = performance.now();
        draw3D(dt);
        paceFrame(performance.now() - t0);
        adaptQuality(ts);
        reportStats(ts);
      }
    }
    requestAnimationFrame(loop);
  }

  function resetView() {
    if (!T3) return;
    T3.fly = null;
    T3.camera.position.set(0, 14, 22);
    T3.controls.target.set(0, 0, 0);
    T3.controls.enabled = true;
    T3.controls.autoRotate = !REDUCED;
    T3.controls.update();
    selected = null;
    setFollow(null);
    infoEl.hidden = true;
    wake();
  }

  // ---------- 控制 ----------
  slider.addEventListener('input', function () {
    playing = false;
    playBtn.textContent = '▶ 播放';
    setYear(parseFloat(slider.value));
  });

  playBtn.addEventListener('click', function () {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
    if (playing) setFollow(null); // 时间快进时看全局，不再锁定单个天体
    if (playing && year >= MAX_YEAR) setYear(MIN_YEAR);
    lastTs = 0;
    wake();
  });

  speedSel.addEventListener('change', function () {
    speed = parseFloat(speedSel.value);
  });

  resetBtn.addEventListener('click', resetView);

  if (missionsToggle) {
    missionsToggle.addEventListener('change', function () {
      showMissions = missionsToggle.checked;
      wake();
    });
  }

  if (window.ResizeObserver) new ResizeObserver(resize3D).observe(stage);
  else window.addEventListener('resize', resize3D);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      lastTs = 0;
      wake();
    }
  });

  /* 仅带 ?debug=1 时暴露内部状态，供排查和端到端断言使用 */
  function exposeDebug() {
    if (!/[?&]debug=1/.test(location.search)) return;
    window.solarDebug = function () {
      if (!T3) return { ready: false };
      var earth = T3.bodies.earth;
      var focus = T3.follow || earth;
      var v = new THREE.Vector3().copy(focus.position).project(T3.camera);
      return {
        ready: T3.ready,
        dpr: T3.dpr,
        playing: playing,
        year: +year.toFixed(2),
        follow: T3.follow ? T3.follow.userData.id : null,
        earth: earth.position.toArray(),
        // 当前锁定目标相对画面中心的偏移，(0,0) 表示正中
        focusNdc: [+v.x.toFixed(3), +v.y.toFixed(3)],
      };
    };
  }

  // ---------- 启动 ----------
  buildEvents();
  buildStories();
  if (missionsToggle) showMissions = missionsToggle.checked;
  measureRect();
  setYear(MAX_YEAR);
  requestAnimationFrame(loop);
  loadThree()
    .then(function () {
      init3D();
      exposeDebug();
      wake();
    })
    .catch(function () {
      if (loadingEl) loadingEl.textContent = '三维模块加载失败，请刷新页面重试';
    });
})();

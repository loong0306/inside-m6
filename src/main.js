import './style.css';
import { clockMetrics, clockVisual, communicationSteps, modules } from './model.js';
import { createChipScene } from './scene.js';

const icons = {
 chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
 cube: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5m-9 5v9M7.5 5.5l9 5"/>',
 flow: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v7a5 5 0 0 0 5 5h7M17 3l4 4-4 4M9 7h12"/>',
 clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
 reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
 expand: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
 book: '<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2z"/>',
 chevron: '<path d="m9 5 7 7-7 7"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chip}</svg>`;
const chapters = [
  { name: '认识这颗芯片', english: 'THE ARCHITECTURE', title: '一颗芯片，一个微观世界。', sub: '从 CPU 到统一内存，探索 M6 内部各司其职的计算单元。', icon: 'cube' },
  { name: '数据如何旅行', english: 'THE COMMUNICATION', title: '一次计算，从一次对话开始。', sub: '跟随一个读取请求，看看核心、缓存和内存如何交换数据。', icon: 'flow' },
  { name: '读懂 4.8 GHz', english: 'THE CLOCK', title: '48 亿次节拍，一秒之间。', sub: '把看不见的时钟放慢，理解频率、周期与指令之间的关系。', icon: 'clock' },
];
let chapter = 0, selected = 'cpu', mode = 'miss', step = 0, progress = 0, frequency = 4.8, ipc = 2;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduced, scene, elapsed = 0, clockCycles = 0;

document.querySelector('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#" aria-label="Inside M6 首页"><span class="brand-icon">${icon('chip')}</span><span>inside<span class="brand-m6"> M6</span><small>芯片原理交互实验室</small></span></a>
    <div class="sidebar-label">探索目录 <span>EXPLORER</span></div>
    <nav aria-label="学习章节">${chapters.map((c,i)=>`<button class="nav-item ${i===0?'active':''}" data-chapter="${i}" aria-label="${c.name}"><span class="nav-icon">${icon(c.icon)}</span><span><small>CHAPTER 0${i+1}</small>${c.name}</span>${icon('chevron')}</button>`).join('')}</nav>
    <div class="sidebar-note"><span class="tiny-chip">${icon('chip')}</span><p>复杂的原理，<br>看得见的答案。</p><span>拖动 · 观察 · 理解</span></div>
    <button class="source-button">${icon('book')} 关于模型与资料 ${icon('arrow')}</button>
    <div class="local-status"><i></i> 本地交互实验 <span>v1.0</span></div>
  </aside>
  <main>
    <header class="topbar"><span>计算机是如何工作的 <span class="breadcrumb">/</span> <strong>Apple Silicon</strong></span><span class="edition">INTERACTIVE SERIES <b>01</b></span></header>
    <section class="intro"><div><div class="eyebrow"><span></span> INSIDE THE SILICON <span class="divider">/</span> <span id="chapter-eyebrow"></span></div><h1 id="chapter-title"></h1><p id="chapter-sub"></p></div><div class="model-tag">APPLE SILICON<span>M6</span><small>架构原理示意</small></div></section>
    <div class="chapter-tabs" role="tablist" aria-label="实验章节">${chapters.map((c,i)=>`<button role="tab" id="tab-${i}" aria-controls="experiment" aria-selected="${i===0}" data-chapter="${i}"><span>0${i+1}</span>${c.name}</button>`).join('')}<span class="chapter-count">EXPLORE. DON'T MEMORIZE.</span></div>
    <section class="experiment" id="experiment" role="tabpanel" aria-labelledby="tab-0">
      <div class="visual-column">
        <div class="viewport" id="viewport">
          <div class="viewport-header"><span class="live-dot"></span><span id="scene-title">M6 · 系统级芯片</span><span class="diagram-tag">3D 原理模型</span></div>
          <div id="scene" role="img" aria-label="可旋转的 M6 芯片原理示意；也可使用下方按钮选择模块"></div>
          <div class="scene-tools"><button id="reset-camera" title="重置视角" aria-label="重置视角">${icon('reset')}</button><button id="expand-view" title="放大模型" aria-label="放大模型" aria-pressed="false">${icon('expand')}</button></div>
          <div class="scene-caption"><span><span class="mouse-symbol">↔</span> 拖动旋转 <span class="caption-divider">·</span> 滚轮缩放 <span class="caption-divider">·</span> 点击模块探索</span><span>布局与比例为示意</span></div>
          <div class="axis"><b>Y</b><span>Z</span><i>X</i></div>
        </div>
        <div class="scene-bottom"><div class="legend"><span><i class="mint"></i> CPU / 互连</span><span><i class="purple"></i> GPU / 内存</span><span><i class="blue"></i> 缓存</span><span><i class="amber"></i> 神经网络引擎</span></div><button id="play-toggle" aria-label="暂停动画">Ⅱ <span>暂停</span></button></div>
        <div id="experiment-controls"></div>
      </div>
      <aside class="inspector" id="inspector" aria-label="模块与实验说明"></aside>
    </section>
    <section class="learning-strip" id="learning-strip"></section>
    <footer><span>把复杂留给芯片，把好奇留给你。</span><span>THREE.JS <i>×</i> INTERACTIVE LEARNING</span></footer>
  </main>
  <dialog id="sources-dialog"><div class="dialog-top"><span class="eyebrow">MODEL & REFERENCES</span><button id="close-dialog" aria-label="关闭资料">×</button></div><h2>理解原理，也了解边界。</h2><p>这是面向初学者的概念模型，不是 M6 裸片复刻、周期精确模拟器或本机性能监控工具。</p><ul><li>核心分类及数量采用 Apple 官方公布的 M6 规格。</li><li>模块位置、连线、缓存合并方式与动画时长均为教学示意；没有声称 M6 的真实缓存容量、总线拓扑或访存延迟。</li><li>4.8 GHz 是本实验使用的频率示例。所引 Apple 新闻稿没有公布该最大频率，因此不将它标注为 Apple 官方保证。</li><li>动画经过大幅放慢。调节滑块不会改变电脑的真实频率；CPU、GPU、内存也不必运行在同一时钟频率。</li></ul><div class="source-links"><a href="https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/" target="_blank" rel="noreferrer">01 · Apple — M6 公开规格 ↗</a><a href="https://www.intel.com/content/www/us/en/gaming/resources/cpu-clock-speed.html" target="_blank" rel="noreferrer">02 · Intel — 时钟频率、周期与指令 ↗</a><a href="https://developer.apple.com/documentation/metal/synchronizing-cpu-and-gpu-work" target="_blank" rel="noreferrer">03 · Apple Developer — CPU / GPU 同步 ↗</a><a href="https://developer.apple.com/videos/play/tech-talks/10580/" target="_blank" rel="noreferrer">04 · Apple Developer — 统一内存与 Metal ↗</a></div><small>资料核对：2026-11-03 · 独立教学项目，与 Apple 无隶属关系。</small></dialog>
`;

function renderChapter() {
  const c = chapters[chapter];
  document.querySelector('#chapter-eyebrow').textContent = c.english;
  document.querySelector('#chapter-title').textContent = c.title;
  document.querySelector('#chapter-sub').textContent = c.sub;
  document.querySelector('#experiment').setAttribute('aria-labelledby', `tab-${chapter}`);
  document.querySelectorAll('[data-chapter]').forEach(b => {
    const active = Number(b.dataset.chapter) === chapter;
    b.classList.toggle('active', active);
    if (b.getAttribute('role') === 'tab') { b.setAttribute('aria-selected', active); b.tabIndex = active ? 0 : -1; }
  });
  const controls = document.querySelector('#experiment-controls');
  if (chapter === 0) {
    controls.innerHTML = `<div class="module-picker" aria-label="选择芯片模块">${Object.entries(modules).map(([id,m])=>`<button data-module="${id}" style="--module-color:${m.color}" aria-pressed="${id===selected}">${id==='cpu'?'CPU 核心':id==='gpu'?'GPU':id==='neural'?'神经网络引擎':id==='cache'?'缓存':id==='fabric'?'片上互连':'统一内存'}</button>`).join('')}</div>`;
  } else if (chapter === 1) {
    controls.innerHTML = `<div class="flow-controls"><label for="flow-mode">实验场景</label><select id="flow-mode"><option value="miss">缓存未命中 · 访问内存</option><option value="hit">缓存命中 · 就近返回</option><option value="gpu">CPU 与 GPU · 共享数据</option></select><button id="next-step">下一步 ${icon('arrow')}</button></div><div class="timeline" id="timeline"></div>`;
    document.querySelector('#flow-mode').value = mode;
    renderTimeline();
  } else {
    controls.innerHTML = `<div class="clock-under"><span class="mint-dot"></span> 单个超级核心 · 时钟放慢十亿倍 <span id="clock-cycle-count">已观察 0 个周期</span></div>`;
  }
  scene?.setChapter(chapter);
  if (chapter !== 1) scene?.select(chapter === 2 ? 'cpu' : selected);
  renderInspector(); renderLearning(); updatePlay();
}
function renderInspector() {
  const el = document.querySelector('#inspector');
  if (chapter === 0) {
    const m = modules[selected];
    el.innerHTML = `<div class="panel-kicker">模块观察 <span>COMPONENT INSPECTOR</span></div><div class="component-symbol" style="color:${m.color}">${icon(selected==='fabric'?'flow':'chip')}</div><div class="eyebrow muted">${m.tag}</div><h2>${m.title}</h2><p class="description">${m.description}</p><div class="module-facts">${m.facts.map(([v,l])=>`<div><strong style="color:${m.color}">${v}</strong><span>${l}</span></div>`).join('')}</div><div class="insight"><span>换个角度理解</span><p>${m.note}</p></div><button class="next-chapter" data-chapter="1">看看数据如何流动 ${icon('arrow')}</button>`;
  } else if (chapter === 1) {
    el.innerHTML = `<div class="panel-kicker">数据旅程 <span>FOLLOW THE DATA</span></div><div class="flow-key"><span><i class="mint"></i> 请求 / 命令</span><span><i class="purple"></i> 数据 / 写入</span></div><div class="step-number" id="step-number"></div><h2 id="step-title"></h2><p class="description" id="step-text"></p><div class="flow-route" id="flow-route"></div><div class="insight"><span>这里的“通信”是什么？</span><p>电信号携带地址、控制信息与数据，沿片上电路传递。光点只是帮助你看清方向的示意。</p></div><button class="next-chapter" data-chapter="2">通信为什么需要等待？ ${icon('arrow')}</button>`;
    updateStep();
  } else {
    el.innerHTML = `<div class="panel-kicker">时钟实验 <span>CLOCK LAB</span></div><div class="clock-value"><strong id="ghz-value">4.8</strong><span>GHz</span><small>教学频率</small></div><label class="slider-label" for="frequency">调节核心频率 <span>观察节拍变化</span></label><input id="frequency" type="range" min="0.8" max="4.8" step="0.1" value="${frequency}"/><div class="range-ticks"><span>0.8 GHz</span><span>2.4 GHz</span><span>4.8 GHz</span></div><div class="clock-metrics"><div><span>每秒时钟周期</span><strong id="cycles-value"></strong></div><div><span>一个周期的时长</span><strong id="period-value"></strong></div></div><label class="slider-label" for="ipc">假设平均 IPC <strong id="ipc-value"></strong></label><input id="ipc" type="range" min="0.5" max="4" step="0.5" value="${ipc}"/><div class="throughput"><span>单核理论吞吐 · 频率 × IPC</span><strong id="throughput-value"></strong><small>IPC = 平均每周期完成的指令数；此处为假设值，非 M6 实测。</small></div><div class="insight compact"><span>“最大”不是“始终”</span><p>实际频率随负载、功耗与温度变化，也不代表全部核心可以同时维持该频率。</p></div>`;
    updateClock();
  }
}
function renderLearning() {
  const el = document.querySelector('#learning-strip');
  if (chapter===0) el.innerHTML = `<div class="learning-heading"><span class="eyebrow">THE BIG PICTURE</span><h2>不只是 CPU，而是一整个系统。</h2><p>SoC = System on a Chip · 系统级芯片</p></div><div class="learning-item"><span class="item-number">01</span><h3>分工，而非单打独斗</h3><p>CPU 做通用计算，GPU 擅长并行，专用引擎加速特定任务。</p></div><div class="learning-item"><span class="item-number">02</span><h3>共享，而非反复搬运</h3><p>统一内存让不同计算单元访问同一份数据，协作仍需要同步。</p></div>`;
  if (chapter===1) el.innerHTML = `<div class="learning-heading"><span class="eyebrow">THREE DIFFERENT THINGS</span><h2>路有多宽，与路有多长。</h2><p>频率、带宽、延迟不要混为一谈。</p></div><div class="learning-item"><span class="item-number">01</span><h3>带宽 · 每秒能搬多少</h3><p>常用 GB/s 表示，像道路的通行能力；不等于 CPU 的 GHz。</p></div><div class="learning-item"><span class="item-number">02</span><h3>延迟 · 等一次要多久</h3><p>常用纳秒表示。即使核心跑得更快，数据也不会瞬间到达。</p></div>`;
  if (chapter===2) el.innerHTML = `<div class="wave-panel"><div class="wave-header"><span class="eyebrow">ONE CYCLE, ONE BEAT</span><span>从一次上升沿到下一次上升沿 = 一个周期</span></div><svg id="wave" viewBox="0 0 700 90" role="img" aria-label="慢放的时钟方波"><defs><pattern id="wave-grid" width="35" height="22.5" patternUnits="userSpaceOnUse"><path d="M35 0H0V22.5" fill="none" stroke="#25303b" stroke-width=".6"/></pattern></defs><rect width="700" height="90" fill="url(#wave-grid)"/><path id="wave-path" fill="none" stroke="#80efca" stroke-width="2"/><line id="wave-cursor" x1="0" y1="0" x2="0" y2="90" stroke="#efc280" stroke-width="1"/></svg><div class="wave-caption"><span>时钟帮助电路协调状态更新；一个周期不等于一条指令。</span><button id="clock-step">单步观察 +1 周期 ${icon('arrow')}</button></div></div><div class="learning-item clock-explain"><span class="item-number">≠</span><h3>GHz ≠ 每秒指令数</h3><p>一条指令可能跨越多个周期；流水线与并行执行也可能让一个周期完成多条指令。性能还取决于 IPC、访存与软件。</p></div>`;
  if (chapter===2) { updateWave(); updateClockPosition(); }
}
function renderTimeline() {
  const steps = communicationSteps(mode);
  document.querySelector('#timeline').innerHTML = steps.map((s,i)=>`<button data-step="${i}" class="${i===step?'current':''}" aria-label="步骤 ${i+1}：${s.title}" aria-current="${i===step?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span><i></i></button>`).join('');
}
const shortName = id => ({ cpu:'CPU',cache:'缓存',fabric:'片上互连',memory:'统一内存',gpu:'GPU' })[id];
function updateStep() {
  if (chapter!==1) return;
  const steps=communicationSteps(mode), s=steps[step];
  document.querySelector('#step-number').innerHTML = `${String(step+1).padStart(2,'0')}<span>/ ${String(steps.length).padStart(2,'0')}</span>`;
  document.querySelector('#step-title').textContent=s.title;
  document.querySelector('#step-text').textContent=s.text;
  document.querySelector('#flow-route').innerHTML=`<span>${shortName(s.from)}</span>${icon('arrow')}<span>${shortName(s.to)}</span>`;
  document.querySelectorAll('[data-step]').forEach(b=>{b.classList.toggle('current',Number(b.dataset.step)===step);b.setAttribute('aria-current',Number(b.dataset.step)===step?'step':'false');});
  scene?.setFlow(s,progress);
}
function updateClock() {
  const m=clockMetrics(frequency,ipc);
  document.querySelector('#ghz-value').textContent=frequency.toFixed(1);
  document.querySelector('#cycles-value').textContent=`${(m.cyclesPerSecond/1e8).toFixed(0)} 亿次`;
  document.querySelector('#period-value').textContent=`${m.periodNs.toFixed(3)} ns`;
  document.querySelector('#ipc-value').textContent=ipc.toFixed(1);
  document.querySelector('#throughput-value').textContent=`${(m.instructionsPerSecond/1e8).toFixed(1)} 亿条 / 秒`;
  updateWave();
  updateClockPosition();
}
function updateWave() {
  const path=document.querySelector('#wave-path'); if(!path)return;
  const period=clockVisual(clockCycles, frequency).periodPx; let d='M0 66';
  for(let x=0;x<700;x+=period) d+=` H${x} V24 H${x+period/2} V66 H${x+period}`;
  path.setAttribute('d',d);
}
function updateClockPosition() {
  const cursor = document.querySelector('#wave-cursor');
  const {cursorX} = clockVisual(clockCycles, frequency);
  cursor?.setAttribute('x1', cursorX); cursor?.setAttribute('x2', cursorX);
  const count = document.querySelector('#clock-cycle-count');
  if(count)count.textContent=`已观察 ${Math.floor(clockCycles)} 个周期`;
  scene?.tick(elapsed, clockCycles);
}
function updatePlay() {
  const b=document.querySelector('#play-toggle');
  b.innerHTML=playing?'Ⅱ <span>暂停</span>':'▶ <span>播放</span>';
  b.setAttribute('aria-label',playing?'暂停动画':'播放动画');
  b.setAttribute('aria-pressed',!playing);
}
function selectModule(id) { selected=id;scene?.select(id);if(chapter===0){renderInspector();document.querySelectorAll('[data-module]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.module===id));} }
document.addEventListener('click', e=>{
  const ch=e.target.closest('[data-chapter]');
  if(ch){chapter=Number(ch.dataset.chapter);progress=0;renderChapter();return;}
  const module=e.target.closest('[data-module]');if(module) selectModule(module.dataset.module);
  const st=e.target.closest('[data-step]');if(st){step=Number(st.dataset.step);progress=0;playing=false;updateStep();updatePlay();}
  if(e.target.closest('#next-step')){step=(step+1)%communicationSteps(mode).length;progress=0;playing=false;updateStep();updatePlay();}
  if(e.target.closest('#play-toggle')){playing=!playing;updatePlay();}
  if(e.target.closest('#reset-camera'))scene?.reset();
  if(e.target.closest('#expand-view')){const expanded=document.querySelector('#experiment').classList.toggle('expanded');document.querySelector('#expand-view').setAttribute('aria-pressed',expanded);}
  if(e.target.closest('#clock-step')){playing=false;clockCycles+=1;updateClockPosition();updatePlay();}
  if(e.target.closest('.source-button'))document.querySelector('#sources-dialog').showModal();
  if(e.target.closest('#close-dialog'))document.querySelector('#sources-dialog').close();
});
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();chapter=0;renderChapter();});
document.addEventListener('change',e=>{if(e.target.id==='flow-mode'){mode=e.target.value;step=0;progress=0;renderTimeline();updateStep();}});
document.addEventListener('input',e=>{if(e.target.id==='frequency'){frequency=Number(e.target.value);updateClock();}if(e.target.id==='ipc'){ipc=Number(e.target.value);updateClock();}});
document.querySelector('.chapter-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();chapter=e.key==='Home'?0:e.key==='End'?2:(chapter+(e.key==='ArrowRight'?1:2))%3;renderChapter();document.querySelector(`#tab-${chapter}`).focus();});
renderChapter();
try { scene=createChipScene(document.querySelector('#scene'),selectModule);scene.select(selected); }
catch(error){console.error('WebGL 初始化失败',error);document.querySelector('#scene').innerHTML='<div class="fallback"><strong>3D 视图暂不可用</strong><p>浏览器需要启用 WebGL。你仍可使用下方模块按钮、通信步骤和时钟实验继续学习。</p></div>';}
let last=performance.now();
function animate(now) {
  const dt=Math.min((now-last)/1000,.06);last=now;
  if(playing&&!document.hidden){elapsed+=dt;if(chapter===2)clockCycles+=dt*frequency;if(chapter===1){progress+=dt/3.6;if(progress>=1){progress=0;step=(step+1)%communicationSteps(mode).length;updateStep();}scene?.setFlow(communicationSteps(mode)[step],progress);}scene?.tick(elapsed,clockCycles);
    if(chapter===2)updateClockPosition();}
  if(!document.hidden)scene?.render();requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

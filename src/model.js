export function clockMetrics(ghz, ipc = 1) {
  if (!Number.isFinite(ghz) || ghz <= 0 || !Number.isFinite(ipc) || ipc < 0) throw new RangeError('频率必须为正数，IPC 必须为非负数');
  return { cyclesPerSecond: ghz * 1e9, periodNs: 1 / ghz, instructionsPerSecond: ghz * 1e9 * ipc };
}

export function clockVisual(cycles, ghz) {
  clockMetrics(ghz);
  const periodPx = 348 / ghz;
  return { periodPx, cursorX: (cycles % Math.max(1,Math.floor(700/periodPx))) * periodPx, phase: cycles % 1 };
}

const flows = {
  hit: [
    { from: 'cpu', to: 'cache', kind: 'request', title: '核心先找身边的缓存', text: '执行指令需要数据时，核心先检查缓存。这里将多级缓存合并为一个模块。青色光点表示读取请求。' },
    { from: 'cache', to: 'cpu', kind: 'data', title: '命中！数据直接返回', text: '需要的数据已在缓存中，无需访问统一内存。紫色光点代表返回的数据，核心可以继续计算。' },
  ],
  miss: [
    { from: 'cpu', to: 'cache', kind: 'request', title: '01 · 核心查找缓存', text: '核心发出读取请求。缓存保存最近或经常使用的数据，像手边的小工作台。' },
    { from: 'cache', to: 'fabric', kind: 'request', title: '02 · 缓存未命中', text: '各级缓存都没有需要的数据，请求通过片上互连继续前进。图中缓存层级被合并，实际路径更复杂。' },
    { from: 'fabric', to: 'memory', kind: 'request', title: '03 · 请求抵达统一内存', text: '片上互连把地址与读取请求送往内存控制器，再访问 DRAM。内存控制器在图中合并到互连模块。' },
    { from: 'memory', to: 'fabric', kind: 'data', title: '04 · 内存返回数据', text: 'DRAM 找到相应数据并返回。传输需要时间；提高 CPU 频率不会让内存访问延迟同比缩短。' },
    { from: 'fabric', to: 'cache', kind: 'data', title: '05 · 数据填入缓存', text: '返回的数据进入缓存，后续访问同一数据时就有机会直接命中。真实硬件的填充策略会更复杂。' },
    { from: 'cache', to: 'cpu', kind: 'data', title: '06 · 核心继续执行', text: '依赖的数据到达，相关指令可以继续执行。等待期间，乱序执行可能让其他不依赖它的指令先运行。' },
  ],
  gpu: [
    { from: 'cpu', to: 'memory', kind: 'write', title: '01 · CPU 准备共享数据', text: 'CPU 把图形或计算任务的数据写入共享缓冲区。图中的直达线简化了互连和内存控制器。' },
    { from: 'cpu', to: 'gpu', kind: 'sync', title: '02 · 提交任务，建立同步', text: 'CPU 提交 GPU 命令，并通过 API 的同步机制保证写入对 GPU 可见。共享内存不等于可以无序地同时读写。' },
    { from: 'memory', to: 'gpu', kind: 'data', title: '03 · GPU 读取同一份数据', text: 'GPU 访问共享的物理内存，无需先复制到独立显存；访问仍有延迟，也仍要经过缓存与互连。' },
    { from: 'gpu', to: 'memory', kind: 'write', title: '04 · 写回结果，通知完成', text: 'GPU 将结果写回共享缓冲区。CPU 若要读取结果，仍须等待 GPU 完成，并满足相应的同步要求。' },
  ],
};
export function communicationSteps(mode) { return flows[mode] ?? flows.miss; }

export const modules = {
  cpu: { tag: 'CPU COMPLEX', title: 'CPU · 负责思考与调度', color: '#77efc6', description: '执行程序指令、处理逻辑与协调任务。M6 的 12 个 CPU 核心分工协作，不是把所有核心的 GHz 简单相加。', facts: [['2', '超级核心'], ['4', '性能核心'], ['6', '能效核心']], note: '超级核心侧重高性能单线程任务，性能核心参与高负载计算，能效核心高效处理日常任务。调度由系统决定。' },
  gpu: { tag: 'PARALLEL COMPUTE', title: 'GPU · 擅长大规模并行', color: '#a69bff', description: '让许多相似的计算同时进行，例如绘制像素、处理图像和矩阵运算。CPU 提交任务，GPU 执行适合自己的工作。', facts: [['12', 'GPU 核心'], ['共享', '统一内存']], note: 'GPU 核心与 CPU 核心的结构不同，不能仅凭“核心数量”直接比较性能。' },
  neural: { tag: 'NEURAL ENGINE', title: '神经网络引擎 · 专项加速', color: '#e7b775', description: '为适合的机器学习运算提供专用加速。框架根据模型、算子和支持情况安排任务，并非所有 AI 任务都会在这里运行。', facts: [['2 × 16', '神经网络引擎核心']], note: '与 CPU、GPU 一起构成异构计算系统：不同类型的单元做各自擅长的工作。' },
  cache: { tag: 'CACHE', title: '缓存 · 核心身边的工作台', color: '#80c1f7', description: '容量较小、访问通常更快的存储。尽量把即将使用的数据留在核心附近，减少等待主内存的时间。', facts: [['命中', '直接返回'], ['未命中', '继续查找']], note: '图中合并展示缓存；不代表 M6 真实缓存尺寸、层级数量或共享拓扑。' },
  fabric: { tag: 'ON-CHIP INTERCONNECT', title: '片上互连 · 模块间的道路', color: '#77efc6', description: '连接 CPU、GPU、缓存及内存控制器，承载请求与数据。通信不是无线的，而是芯片电路中的电信号传输。', facts: [['地址', '要找哪里'], ['数据', '传递内容']], note: '这里把互连和内存控制器抽象到一起。连线表示逻辑关系，并非真实布线或 M6 总线规格。' },
  memory: { tag: 'UNIFIED MEMORY', title: '统一内存 · 共用的数据空间', color: '#a69bff', description: 'CPU 与 GPU 可以访问同一片物理内存中的数据，减少不必要的数据复制。DRAM 位于处理器裸片之外，这里在模型外侧展示。', facts: [['共享', '物理内存'], ['同步', '仍然需要']], note: '“统一”不代表访问立即完成，也不代表 CPU 和 GPU 使用同一个时钟。容量、带宽、延迟是不同概念。' },
};

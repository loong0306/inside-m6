import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createChipScene(container, onSelect) {
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=11;controls.maxDistance=26;controls.minPolarAngle=.15;controls.maxPolarAngle=1.4;
  function reset(){camera.position.set(10.5,13.5,14);controls.target.set(0,0,0);controls.update();}
  reset();
  scene.add(new THREE.HemisphereLight(0xc8e5ff,0x253c46,3.2));
  const light=new THREE.DirectionalLight(0xe1fff5,4);light.position.set(-5,12,6);scene.add(light);
  const edgeLight=new THREE.DirectionalLight(0x8d8bff,2.5);edgeLight.position.set(7,4,-8);scene.add(edgeLight);
  const group=new THREE.Group();scene.add(group);
  const modules={},pickables=[],lines=[];
  const colors={cpu:0x77efc6,gpu:0xa69bff,neural:0xe7b775,cache:0x80c1f7,fabric:0x77efc6,memory:0xa69bff};

  function box(w,h,d,x,y,z,color,metal=.4){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.07),new THREE.MeshStandardMaterial({color,metalness:metal,roughness:.48}));
    mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  function outline(mesh,color,opacity=.5){
    const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(mesh.geometry.parameters.width || 1,mesh.geometry.parameters.height || 1,mesh.geometry.parameters.depth || 1)),new THREE.LineBasicMaterial({color,transparent:true,opacity}));
    // RoundedBoxGeometry is a subdivided box; use the measured bounding box.
    mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox.getSize(new THREE.Vector3());line.geometry.dispose();line.geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x,size.y,size.z));line.position.copy(mesh.position);group.add(line);return line;
  }
  function textPlane(text,x,y,z,width,color='#b3c6d3',fontSize=44){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.font=`500 ${Math.min(fontSize*1.9,110)}px -apple-system, BlinkMacSystemFont, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,512,64,960);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  const base=box(10,.42,7.9,0,-.42,0,0x1b3339);outline(base,0x66898c,.4);
  const die=box(8.9,.18,6.8,0,-.12,0,0x13232b);outline(die,0x68857c,.28);
  // Fine substrate traces, intentionally decorative and distinct from active data routes.
  for(let i=0;i<29;i++){
    const x=-4.5+i*.32;
    for(const s of [-1,1]){
      const curve=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-.18,s*3.48),new THREE.Vector3(x,-.18,s*3.74),new THREE.Vector3(x+.12,-.18,s*3.85)]);
      group.add(new THREE.Line(curve,new THREE.LineBasicMaterial({color:0x4e7972,transparent:true,opacity:.3})));
      box(.1,.035,.13,x,-.18,s*3.84,0x97a995,.8);
    }
  }
  for(let i=0;i<19;i++)for(const s of [-1,1])box(.14,.035,.08,s*4.82,-.18,-2.9+i*.32,0x7c9c92,.8);
  // Module coordinates express conceptual groups, not Apple's physical floorplan.
  const layout={
    cpu:{x:-2.4,z:-.95,w:3.55,d:3.25,h:.38},
    gpu:{x:2.1,z:-1.2,w:3.65,d:2.75,h:.36},
    cache:{x:-2.4,z:1.45,w:3.55,d:.85,h:.24},
    fabric:{x:0,z:2.7,w:7.95,d:.55,h:.19},
    neural:{x:2.1,z:1.3,w:3.65,d:1.3,h:.3},
    memory:{x:0,z:-5.5,w:6.4,d:1.25,h:.45},
  };
  for(const [id,l]of Object.entries(layout)){
    const color=colors[id];const materialColor=new THREE.Color(color).multiplyScalar(.18);
    const mesh=box(l.w,l.h,l.d,l.x,l.h/2+.06,l.z,materialColor);mesh.material.emissive=new THREE.Color(color);mesh.material.emissiveIntensity=.055;
    mesh.userData.moduleId=id;pickables.push(mesh);
    const border=outline(mesh,color,.5);
    modules[id]={mesh,border,center:new THREE.Vector3(l.x,l.h+.16,l.z),baseIntensity:.055};
  }
  const coreMeshes=[];
  function tile(x,z,w,d,color,label){const mesh=box(w,.12,d,x,.52,z,new THREE.Color(color).multiplyScalar(.27));outline(mesh,color,.4);mesh.material.emissive=new THREE.Color(color);mesh.material.emissiveIntensity=.07;mesh.userData.moduleId='cpu';pickables.push(mesh);coreMeshes.push(mesh);if(label)textPlane(label,x,.59,z,w*.95,'#a9edda',54);}
  tile(-3.26,-1.85,1.44,.95,colors.cpu,'SUPER 01');tile(-1.57,-1.85,1.44,.95,colors.cpu,'SUPER 02');
  for(let i=0;i<4;i++)tile(-3.63+i*.82,-.82,.68,.67,0x7bd0b5,`P${i+1}`);
  for(let i=0;i<6;i++)tile(-3.76+i*.54,.02,.43,.55,0x789f92,`E${i+1}`);
  textPlane('CPU  /  12 CORES',-2.4,.59,.48,3.2,'#c6efe2',42);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const mesh=box(.64,.10,.5,.85+col*.83,.48,-2.01+row*.65,0x39324f);outline(mesh,colors.gpu,.4);mesh.userData.moduleId='gpu';pickables.push(mesh);
    // Shader lanes lend the surface a chip-like microstructure.
    for(let j=0;j<3;j++)box(.43,.012,.035,.85+col*.83,.539,-2.15+row*.65+j*.11,0x746595);
  }
  textPlane('GPU  /  12 CORES',2.1,.55,-.13,3.1,'#c8bcfb',44);
  textPlane('CACHE  ·  缓存',-2.4,.32,1.45,3.2,'#b0d4ee',48);
  for(let i=0;i<2;i++){const mesh=box(1.52,.1,.65,1.22+i*1.75,.41,1.15,0x4b3c2f);outline(mesh,colors.neural,.4);mesh.userData.moduleId='neural';pickables.push(mesh);textPlane('16-CORE',1.22+i*1.75,.48,1.15,1.42,'#e5c095',45);}
  textPlane('NEURAL ENGINE',2.1,.43,1.73,3.2,'#dcb786',40);
  textPlane('SYSTEM INTERCONNECT  /  片上互连',0,.29,2.7,7.1,'#a6d7c6',35);
  for(let i=0;i<4;i++){const mem=box(1.35,.08,.7,-2.33+i*1.55,.55,-5.5,0x383447);outline(mem,colors.memory,.3);mem.userData.moduleId='memory';pickables.push(mem);}
  textPlane('UNIFIED MEMORY  /  统一内存',0,.65,-5.5,6,'#c5b9ed',40);
  textPlane('DRAM · 处理器裸片之外',0,.02,-6.5,5,'#76828f',40);
  textPlane('M6',-.1,.03,-3.05,1.3,'#b5c9c1',100);
  textPlane('APPLE SILICON  /  CONCEPT MODEL',0,-.18,3.64,5.4,'#6e9c91',32);

  function route(from,to){
    const a=modules[from].center.clone(),b=modules[to].center.clone();const y=Math.max(a.y,b.y)+.18;
    return new THREE.CatmullRomCurve3([a,new THREE.Vector3(a.x,y,a.z),new THREE.Vector3((a.x+b.x)/2,y+.2,(a.z+b.z)/2),new THREE.Vector3(b.x,y,b.z),b],false,'centripetal');
  }
  for(const [a,b]of [['cpu','cache'],['cache','fabric'],['fabric','gpu'],['fabric','neural'],['fabric','memory']]){
    // Memory travels along the outer edge to keep the schematic legible.
    const p=a==='fabric'&&b==='memory'?[modules.fabric.center,new THREE.Vector3(4.28,.18,2.7),new THREE.Vector3(4.28,.18,-4.5),new THREE.Vector3(0,.18,-4.5),modules.memory.center]:[modules[a].center,modules[b].center];
    const geometry=new THREE.BufferGeometry().setFromPoints(p);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x67b5a0,transparent:true,opacity:.24}));group.add(line);lines.push(line);
  }
  let flowLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x77efc6,transparent:true,opacity:.7}));group.add(flowLine);flowLine.visible=false;
  const packet=new THREE.Mesh(new THREE.SphereGeometry(.095,12,12),new THREE.MeshBasicMaterial({color:0xafffe7}));group.add(packet);packet.visible=false;
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.19,12,12),new THREE.MeshBasicMaterial({color:0x77efc6,transparent:true,opacity:.18,depthWrite:false}));group.add(halo);halo.visible=false;
  let active='cpu',chapter=0,flowKey='',activeCurve;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(pickables)[0];if(hit)onSelect(hit.object.userData.moduleId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);renderer.domElement.style.cursor=raycaster.intersectObjects(pickables).length?'pointer':'grab';
  });
  const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1.35,Math.max(.94,w/h));camera.updateProjectionMatrix();});observer.observe(container);
  function select(id){active=id;for(const [key,m]of Object.entries(modules)){m.border.material.opacity=key===id?.95:.38;m.mesh.material.emissiveIntensity=key===id?.16:.04;}}
  function setFlow(s,p){
    if(chapter!==1)return;
    const key=`${s.from}:${s.to}:${s.kind}`;
    if(key!==flowKey){flowKey=key;container.setAttribute('aria-label',`数据路径：${s.from} → ${s.to}。${s.title}`);activeCurve=route(s.from,s.to);flowLine.geometry.dispose();flowLine.geometry=new THREE.BufferGeometry().setFromPoints(activeCurve.getPoints(48));const color=['data','write'].includes(s.kind)?0xb4a0ff:0x77efc6;flowLine.material.color.setHex(color);packet.material.color.setHex(color);halo.material.color.setHex(color);select(s.to);}
    packet.position.copy(activeCurve.getPoint(Math.min(p,1)));halo.position.copy(packet.position);
  }
  return {
    select,reset,setFlow,
    setChapter(value){chapter=value;flowLine.visible=packet.visible=halo.visible=value===1;flowKey='';if(value!==1)container.setAttribute('aria-label',value===2?'一个超级核心的慢放时钟示意':'可旋转的 M6 芯片原理示意；也可使用下方按钮选择模块');},
    tick(t,cycles){for(let i=0;i<coreMeshes.length;i++){const pulse=chapter===2?(i===0?(cycles%1<.5?1:0):0):(Math.sin(t*1.1*Math.PI*2-i*.3)+1)/2;coreMeshes[i].material.emissiveIntensity=.05+pulse*(chapter===2?.65:.10);}if(chapter===0&&modules[active])modules[active].mesh.material.emissiveIntensity=.12+Math.sin(t*1.5)*.03;},
    render(){controls.update();renderer.render(scene,camera);},
  };
}

let grid=[],size=20,start=null,goal=null,mode='wall',running=false,step=0,startTime;
const gridDiv=document.getElementById('grid');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const setMode=m=>mode=m;

// cập nhật kích thước
function updateGridSize(){
  const v=parseInt(document.getElementById('gridSize').value);
  if(v>=5&&v<=50){size=v;createGrid();}
}

// tạo lưới
function createGrid(){
  grid=[];
  gridDiv.innerHTML='';
  gridDiv.style.gridTemplateColumns=`repeat(${size},22px)`;
  for(let y=0;y<size;y++){
    const row=[];
    for(let x=0;x<size;x++){
      const c=document.createElement('div');
      c.className='cell';
      c.dataset.x=x;
      c.dataset.y=y;
      c.onclick=()=>clickCell(c);
      gridDiv.appendChild(c);
      // khởi tạo cell
      row.push({x,y,wall:false,g:0,h:0,f:0,parent:null});
    }
    grid.push(row);
  }
}
createGrid();

// click vào cell
function clickCell(c){
  const x=+c.dataset.x,y=+c.dataset.y;
  const n=grid[y][x];
  
  if(mode==='start'){
    const old = document.querySelector('.start');
    if(old) old.classList.remove('start');
    c.classList.add('start');
    start=n;
  }
  else if(mode==='goal'){
    const old = document.querySelector('.goal');
    if(old) old.classList.remove('goal');
    c.classList.add('goal');
    goal=n;
  }
  else if(mode==='wall'){
    n.wall=!n.wall;
    c.classList.toggle('wall');
  }
}

// tô màu
function color(n,s){
  const c=document.querySelector(`[data-x="${n.x}"][data-y="${n.y}"]`);
  if(c){
    c.className=`cell ${s}`;
  }
}

// reset lưới
function resetGrid(){
  start=goal=null;
  step=0;
  createGrid();
}

// chạy thuật toán
async function runAlgorithm(){
  if(!start || !goal || running) return;
  running = true;
  startTime = performance.now();

  const selected = document.getElementById('algo').value;
  const algos = { 
    aStar: 'astar', 
    dijkstra: 'dijkstra', 
    bfs: 'bfs' 
  };
  const mapName = algos[selected];

  await runPythonAlgo(mapName);
  running = false;
}

// chạy thuật toán python
async function runPythonAlgo(algoName){
  if(!pyodideReady){ 
    alert("Đang tải Python runtime..."); 
    return; 
  }

  // convert grid
  const gData = grid.map(r => r.map(c => c.wall ? 1 : 0));
  const s = [start.y, start.x];
  const t = [goal.y, goal.x];

  pyodide.globals.set("grid", gData);
  pyodide.globals.set("start", tuple(s));
  pyodide.globals.set("goal", tuple(t));

  const code = pythonAlgorithms + `\npath = ${algoName}(grid, start, goal)`;
  await pyodide.runPythonAsync(code);

  const path = pyodide.globals.get("path").toJs();
  if (path) {
    // vẽ đường đi
    for (const [y,x] of path) {
      color(grid[y][x], 'path');
      await sleep(100);
    }
  } else {
    alert("Không tìm được đường đi!");
  }
  
  const time = document.getElementById('time');
  time.innerText = Math.round(performance.now() - startTime) + " ms";
}

// convert to tuple
function tuple(arr){
  return pyodide.runPython(`tuple(${JSON.stringify(arr)})`);
}

// load python
let pyodideReady=false,pyodide;
async function initPyodide(){
  pyodide=await loadPyodide();
  pyodideReady=true;
}
initPyodide();

// thuật toán
const pythonAlgorithms = `
import heapq
from collections import deque

def heuristic(a,b):
  return abs(a[0]-b[0])+abs(a[1]-b[1])

def reconstruct_path(came_from, start, goal):
  p=[]; cur=goal
  while cur in came_from:
    p.append(cur); cur=came_from[cur]
  p.append(start); p.reverse(); return p

def astar(grid,start,goal):
  rows,cols=len(grid),len(grid[0])
  openh=[(0,start)]
  came_from={}; g={start:0}; f={start:heuristic(start,goal)}
  while openh:
    _,cur=heapq.heappop(openh)
    if cur==goal: return reconstruct_path(came_from,start,goal)
    x,y=cur
    for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
      if 0<=nx<rows and 0<=ny<cols and grid[nx][ny]==0:
        ng=g[cur]+1
        if (nx,ny) not in g or ng<g[(nx,ny)]:
          came_from[(nx,ny)]=cur
          g[(nx,ny)]=ng
          f[(nx,ny)]=ng+heuristic((nx,ny),goal)
          heapq.heappush(openh,(f[(nx,ny)],(nx,ny)))
  return None

def dijkstra(grid,start,goal):
  rows,cols=len(grid),len(grid[0])
  pq=[(0,start)]
  came_from={}; dist={start:0}
  while pq:
    d,cur=heapq.heappop(pq)
    if cur==goal: return reconstruct_path(came_from,start,goal)
    x,y=cur
    for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
      if 0<=nx<rows and 0<=ny<cols and grid[nx][ny]==0:
        nd=d+1
        if (nx,ny) not in dist or nd<dist[(nx,ny)]:
          dist[(nx,ny)]=nd
          came_from[(nx,ny)]=cur
          heapq.heappush(pq,(nd,(nx,ny)))
  return None

def bfs(grid,start,goal):
  rows,cols=len(grid),len(grid[0])
  q=deque([start]); seen={start}; came_from={}
  while q:
    cur=q.popleft()
    if cur==goal: return reconstruct_path(came_from,start,goal)
    x,y=cur
    for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
      if 0<=nx<rows and 0<=ny<cols and grid[nx][ny]==0:
        nxt=(nx,ny)
        if nxt not in seen:
          seen.add(nxt); came_from[nxt]=cur; q.append(nxt)
  return None
`;

/* === Leaflet Map Mode === */
let mapVisible = false;
let map, startPos, goalPos, routeLine;

function switchMode() {
  const btn = document.getElementById("switchBtn");
  const vis = document.getElementById("visualizer");

  if (!mapVisible) {
    vis.innerHTML = "<div id='map'></div>";
    initMap();
    btn.textContent = "Bản đồ mô phỏng";
    mapVisible = true;
  } else {
    vis.innerHTML = "<div id='grid'></div>";
    createGrid();
    btn.textContent = "Bản đồ thật";
    mapVisible = false;
  }
}

function initMap() {
  // tạo bản đồ
  map = L.map('map').setView([10.776, 106.7], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  map.on('click', onMapClick);
}

function onMapClick(e) {
  const { lat, lng } = e.latlng;
  if (!startPos) {
    startPos = [lat, lng];
    L.marker(startPos, { title: "Start" }).addTo(map);
  } else if (!goalPos) {
    goalPos = [lat, lng];
    L.marker(goalPos, { title: "Goal" }).addTo(map);
    findRoute();
  } else {
    resetMap();
  }
}

async function findRoute() {
  const url = `https://router.project-osrm.org/route/v1/driving/${startPos[1]},${startPos[0]};${goalPos[1]},${goalPos[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.routes?.length) {
    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(coords, { color: '#00bcd4', weight: 5 }).addTo(map);
    map.fitBounds(routeLine.getBounds());
  } else {
    alert("Không tìm được tuyến đường!");
  }
}

function resetMap() {
  map.eachLayer(l => {
    if (l instanceof L.Polyline || l instanceof L.Marker) map.removeLayer(l);
  });
  startPos = goalPos = null;
}

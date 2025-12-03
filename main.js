let grid=[],size=20,start=null,goal=null,mode='wall',running=false,step=0,startTime;
const gridDiv=document.getElementById('grid');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const setMode = m => mode = m;
const resetGrid = () => {
  start = goal = null;
  step = 0;
  createGrid();
};
const switchMode = switchMode; // (đã có rồi)

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

/* === MAP MODE === */
let mapVisible = false;
let map = null, startPos = null, goalPos = null, routeLine = null;
let osmData = null;

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

function switchMode() {
  const btn = document.getElementById("switchBtn");
  const vis = document.getElementById("visualizer");

  if (!mapVisible) {
    vis.innerHTML = "<div id='map'></div>";
    initMap();
    btn.textContent = "🔲 Quay Lại Lưới";
    mapVisible = true;
  } else {
    vis.innerHTML = "<div id='grid'></div>";
    createGrid();
    btn.textContent = "🗺️ Chuyển Sang Bản Đồ";
    mapVisible = false;
  }
}

function initMap() {
  try {
    if (document.getElementById('map')) {
      map = L.map('map').setView([10.776, 106.7], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      map.on('click', onMapClick);
      console.log("Map initialized successfully");
    } else {
      console.error("Map container not found");
    }
  } catch (err) {
    console.error("Error initializing map:", err);
  }
}

async function onMapClick(e) {
  if (!map) {
    console.error("Map not initialized");
    return;
  }
  
  const { lat, lng } = e.latlng;
  console.log("Map clicked:", lat, lng);
  
  if (!startPos) {
    startPos = [lat, lng];
    console.log("Start set:", startPos);
    
    try {
      L.marker(startPos, { 
        title: "Start", 
        icon: L.icon({ 
          iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green"><circle cx="12" cy="12" r="8"/></svg>', 
          iconSize: [24, 24] 
        }) 
      }).addTo(map);
      
      // Load OSM data khi đặt start
      await loadOSMData(startPos, null);
      alert("Đã đặt Start ✓\nClick tiếp để đặt Goal");
    } catch (err) {
      console.error("Error setting start:", err);
    }
  } else if (!goalPos) {
    goalPos = [lat, lng];
    console.log("Goal set:", goalPos);
    
    try {
      L.marker(goalPos, { 
        title: "Goal", 
        icon: L.icon({ 
          iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><circle cx="12" cy="12" r="8"/></svg>', 
          iconSize: [24, 24] 
        }) 
      }).addTo(map);
      
      alert("Đã đặt Goal ✓\nTìm đường...");
      // Tìm đường ngay lập tức
      await findRoute();
    } catch (err) {
      console.error("Error setting goal:", err);
    }
  } else {
    resetMap();
  }
}

async function loadOSMData(start, goal) {
  console.log("Loading OSM data...");
  
  let minLat, maxLat, minLng, maxLng;
  
  if (goal) {
    minLat = Math.min(start[0], goal[0]) - 0.02;
    maxLat = Math.max(start[0], goal[0]) + 0.02;
    minLng = Math.min(start[1], goal[1]) - 0.02;
    maxLng = Math.max(start[1], goal[1]) + 0.02;
  } else {
    minLat = start[0] - 0.05;
    maxLat = start[0] + 0.05;
    minLng = start[1] - 0.05;
    maxLng = start[1] + 0.05;
  }
  
  try {
    const query = `[bbox:${minLat},${minLng},${maxLat},${maxLng}];(way["highway"];);out geom;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    console.log("Fetching OSM data...");
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!res.ok) {
      throw new Error(`OSM API error: ${res.status}`);
    }
    
    osmData = await res.json();
    
    if (!osmData || !osmData.elements) {
      console.warn("OSM returned empty data");
      osmData = { elements: [] };
    }
    
    console.log("OSM data loaded! Ways:", osmData.elements ? osmData.elements.length : 0);
    
    visualizeOSMRoads(osmData, minLat, maxLat, minLng, maxLng);
    
    if (goal) {
      console.log("OSM data ready for A* pathfinding");
    } else {
      alert(`Đã tải ${osmData.elements ? osmData.elements.length : 0} con đường! Click Goal.`);
    }
  } catch (error) {
    console.error("OSM load error:", error);
    if (error.name !== 'AbortError') {
      alert("Lỗi tải OSM: " + error.message);
    }
  }
}

function visualizeOSMRoads(data, minLat, maxLat, minLng, maxLng) {
  if (!data.elements || data.elements.length === 0) {
    console.warn("No OSM ways to visualize");
    return;
  }
  
  let roadCount = 0;
  data.elements.forEach(way => {
    if (way.geometry && way.geometry.length > 1) {
      const coords = way.geometry.map(node => [node.lat, node.lon]);
      L.polyline(coords, { 
        color: '#999', 
        weight: 2, 
        opacity: 0.5 
      }).addTo(map);
      roadCount++;
    }
  });
  console.log("Visualized", roadCount, "roads on map");
}

async function findRoute() {
  if (!startPos || !goalPos) {
    console.error("Start or Goal not set");
    return;
  }
  
  if (!osmData) {
    console.error("OSM data not loaded yet");
    alert("Vui lòng đợi dữ liệu OSM tải xong!");
    return;
  }
  
  const mode = document.getElementById('mapMode')?.value || 'astar';
  console.log("Finding route with mode:", mode);
  
  try {
    if (mode === 'astar') {
      await findRouteAStar();
    } else {
      await findRouteOSRM();
    }
  } catch (err) {
    console.error("Error finding route:", err);
    alert("Lỗi tìm đường: " + err.message);
  }
}

async function findRouteAStar() {
  console.log("findRouteAStar started");
  
  if (!pyodideReady) {
    alert("Đang tải Python runtime...");
    return;
  }

  if (!startPos || !goalPos) {
    alert("Chưa đặt Start hoặc Goal!");
    return;
  }

  try {
    startTime = performance.now();
    
    console.log("Creating grid from OSM or simple...");
    // Sử dụng OSM nếu có data, nếu không dùng grid ngẫu nhiên
    let result;
    if (osmData && osmData.elements && osmData.elements.length > 0) {
      result = createGridFromOSM(osmData, startPos, goalPos);
    } else {
      result = createSimpleGrid(startPos, goalPos);
    }
    
    const { grid: mapGrid, bbox, startGrid: s, goalGrid: g } = result;
    
    console.log("Grid created:", mapGrid.length, "x", mapGrid[0].length);
    console.log("Start grid:", s, "Goal grid:", g);
    
    pyodide.globals.set("grid", mapGrid);
    pyodide.globals.set("start", tuple(s));
    pyodide.globals.set("goal", tuple(g));
    
    const code = pythonAlgorithms + `\npath = astar(grid, start, goal)`;
    console.log("Running A* algorithm...");
    await pyodide.runPythonAsync(code);
    
    const gridPath = pyodide.globals.get("path").toJs();
    console.log("Grid path result:", gridPath ? gridPath.length + " points" : "null");
    
    if (gridPath && gridPath.length > 0) {
      // Chuyển từ grid coordinates sang GPS coordinates
      const coords = gridPath.map(pos => gridToLatLng(pos, mapGrid, bbox));
      
      console.log("Path coords:", coords.length);
      
      if (routeLine) {
        map.removeLayer(routeLine);
      }
      
      routeLine = L.polyline(coords, { 
        color: '#ff9800', 
        weight: 4,
        opacity: 0.8 
      }).addTo(map);
      
      map.fitBounds(routeLine.getBounds());
      
      const distance = calculateDistance(coords);
      const time = Math.round(performance.now() - startTime);
      
      alert(`✅ A* Tìm Thành Công!\n` +
            `📍 Bước: ${gridPath.length}\n` +
            `📏 Khoảng cách: ${distance.toFixed(2)} km\n` +
            `⏱️ Thời gian: ${time} ms`);
    } else {
      alert("❌ A* không tìm được đường!");
    }
  } catch (error) {
    console.error("A* error:", error);
    alert("❌ Lỗi A*: " + error.message);
  }
}

// ⚡ TẠO GRID ĐƠN GIẢN - KHÔNG CẦN OSM DATA
function createSimpleGrid(start, goal) {
  const size = 150; // Grid lớn hơn để chi tiết
  const grid = Array(size).fill(null).map(() => Array(size).fill(0)); // 0 = đường đi được
  
  const minLat = Math.min(start[0], goal[0]) - 0.01;
  const maxLat = Math.max(start[0], goal[0]) + 0.01;
  const minLng = Math.min(start[1], goal[1]) - 0.01;
  const maxLng = Math.max(start[1], goal[1]) + 0.01;
  
  const bbox = { minLat, maxLat, minLng, maxLng };
  
  // Thêm một số vật cản ngẫu nhiên để tương tự bản đồ thực
  addRandomObstacles(grid, size, 0.1); // 10% vật cản
  
  // Đánh dấu start và goal
  const sGrid = latlngToGridPos(start, grid, bbox);
  const gGrid = latlngToGridPos(goal, grid, bbox);
  
  // Dọn vùng xung quanh start/goal
  clearAround(grid, sGrid, 3);
  clearAround(grid, gGrid, 3);
  
  grid[sGrid[0]][sGrid[1]] = 0;
  grid[gGrid[0]][gGrid[1]] = 0;
  
  console.log("Simple grid created with random obstacles");
  
  return { 
    grid, 
    bbox,
    startGrid: sGrid,
    goalGrid: gGrid
  };
}

// Thêm vật cản ngẫu nhiên
function addRandomObstacles(grid, size, density) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.random() < density) {
        grid[y][x] = 1; // Vật cản
      }
    }
  }
}

// Dọn vùng xung quanh để start/goal không bị cô lập
function clearAround(grid, pos, radius) {
  const size = grid.length;
  const [y, x] = pos;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      
      if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
        grid[ny][nx] = 0;
      }
    }
  }
}

// chạy thuật toán OSRM
async function findRouteOSRM() {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startPos[1]},${startPos[0]};${goalPos[1]},${goalPos[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes?.length) {
      const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      if (routeLine) map.removeLayer(routeLine);
      routeLine = L.polyline(coords, { color: '#00bcd4', weight: 5 }).addTo(map);
      map.fitBounds(routeLine.getBounds());
      
      const distance = calculateDistance(coords);
      alert(`OSRM Tìm Thành Công!\nĐiểm: ${coords.length}\nKhoảng cách: ${distance.toFixed(2)} km`);
    } else {
      alert("OSRM không tìm được tuyến đường!");
    }
  } catch (error) {
    console.error("OSRM error:", error);
    alert("Lỗi OSRM: " + error.message);
  }
}

function createGridFromOSM(data, start, goal) {
  const size = 100; // Tăng từ 50 lên 100 để chi tiết hơn
  const grid = Array(size).fill(null).map(() => Array(size).fill(1)); // 1 = vật cản
  const waypoints = [];
  
  const minLat = Math.min(start[0], goal[0]) - 0.03;
  const maxLat = Math.max(start[0], goal[0]) + 0.03;
  const minLng = Math.min(start[1], goal[1]) - 0.03;
  const maxLng = Math.max(start[1], goal[1]) + 0.03;
  
  console.log("Grid bbox:", { minLat, maxLat, minLng, maxLng });
  
  // Đánh dấu các node từ đường OSM
  if (data && data.elements && data.elements.length > 0) {
    data.elements.forEach(way => {
      if (way.geometry && way.geometry.length > 1) {
        // Kẻ đường từ điểm này đến điểm tiếp theo
        for (let i = 0; i < way.geometry.length - 1; i++) {
          const node1 = way.geometry[i];
          const node2 = way.geometry[i + 1];
          
          if (!node1.lat || !node1.lon || !node2.lat || !node2.lon) continue;
          
          bresenhamLine(grid, node1, node2, minLat, maxLat, minLng, maxLng, size, waypoints);
        }
      }
    });
    console.log("Waypoints marked:", waypoints.length);
  }
  
  // Đánh dấu start và goal
  const sGrid = latlngToGridPos(start, grid, { minLat, maxLat, minLng, maxLng });
  const gGrid = latlngToGridPos(goal, grid, { minLat, maxLat, minLng, maxLng });
  
  grid[sGrid[0]][sGrid[1]] = 0; // Start là đường đi được
  grid[gGrid[0]][gGrid[1]] = 0; // Goal là đường đi được
  
  console.log("Start grid:", sGrid, "Goal grid:", gGrid);
  
  // Giãn rộng vùng đi được (dilate) để đường dễ tìm hơn
  const dilated = dilatGrid(grid, 1);
  
  return { 
    grid: dilated, 
    waypoints, 
    bbox: { minLat, maxLat, minLng, maxLng },
    startGrid: sGrid,
    goalGrid: gGrid
  };
}

// Dùng Bresenham line algorithm để kẻ đường
function bresenhamLine(grid, node1, node2, minLat, maxLat, minLng, maxLng, size, waypoints) {
  const [y1, x1] = latlngToGridPos([node1.lat, node1.lon], grid, { minLat, maxLat, minLng, maxLng });
  const [y2, x2] = latlngToGridPos([node2.lat, node2.lon], grid, { minLat, maxLat, minLng, maxLng });
  
  if (x1 < 0 || x1 >= size || y1 < 0 || y1 >= size) return;
  if (x2 < 0 || x2 >= size || y2 < 0 || y2 >= size) return;
  
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  
  let x = x1, y = y1;
  while (true) {
    grid[y][x] = 0; // Đánh dấu là đường đi được
    waypoints.push([y, x]);
    
    if (x === x2 && y === y2) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// HÀM GIÃN RỘNG GRID (DILATION)
function dilatGrid(grid, radius) {
  const size = grid.length;
  const dilated = grid.map(row => [...row]);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 0) { // Nếu là đường đi được
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
              dilated[ny][nx] = 0;
            }
          }
        }
      }
    }
  }
  return dilated;
}

// Chuyển GPS -> Grid Position
function latlngToGridPos(latlng, grid, bbox) {
  const size = grid.length;
  const [lat, lng] = latlng;
  
  const { minLat, maxLat, minLng, maxLng } = bbox;
  
  const dLat = maxLat - minLat || 0.0001;
  const dLng = maxLng - minLng || 0.0001;
  
  const x = Math.round(((lng - minLng) / dLng) * (size - 1));
  const y = Math.round(((lat - minLat) / dLat) * (size - 1));
  
  const clampX = Math.max(0, Math.min(x, size - 1));
  const clampY = Math.max(0, Math.min(y, size - 1));
  
  return [clampY, clampX];
}

// Chuyển Grid Position -> GPS
function gridToLatLng(gridPos, mapGrid, bbox) {
  const [y, x] = gridPos;
  const size = mapGrid.length;
  
  const { minLat, maxLat, minLng, maxLng } = bbox;
  
  const dLat = maxLat - minLat || 0.0001;
  const dLng = maxLng - minLng || 0.0001;
  
  const lat = minLat + (y / (size - 1)) * dLat;
  const lng = minLng + (x / (size - 1)) * dLng;
  
  return [lat, lng];
}

function calculateDistance(coords) {
  const R = 6371;
  let total = 0;
  
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[i + 1];
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  
  return total;
}

function resetMap() {
  try {
    if (map) {
      map.eachLayer(l => {
        if (l instanceof L.Polyline || l instanceof L.Marker) {
          map.removeLayer(l);
        }
      });
    }
    startPos = goalPos = routeLine = null;
    osmData = null;
    console.log("Map reset");
  } catch (err) {
    console.error("Error resetting map:", err);
  }
}

// PAGE NAVIGATION
function goToPage(pageName) {
  // Ẩn tất cả các trang
  document.querySelectorAll('.page-content').forEach(page => {
    page.classList.remove('active');
  });

  // Hiện trang được chọn
  const pageId = pageName + '-page';
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }

  // Cập nhật active button
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  // Scroll to top
  window.scrollTo(0, 0);
}

// Debug function
window.debugInfo = function() {
  console.log({
    mapVisible,
    mapExists: !!map,
    startPos,
    goalPos,
    osmDataExists: !!osmData,
    osmDataLength: osmData?.elements?.length || 0,
    pyodideReady
  });
};

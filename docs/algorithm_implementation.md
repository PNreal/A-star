# Tài Liệu Triển Khai Thuật Toán Tìm Đường Ngắn Nhất

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Cấu Trúc Dữ Liệu](#cấu-trúc-dữ-liệu)
4. [Xây Dựng Đồ Thị Từ OSM](#xây-dựng-đồ-thị-từ-osm)
5. [Các Thuật Toán Triển Khai](#các-thuật-toán-triển-khai)
6. [Tìm Điểm Gần Nhất](#tìm-điểm-gần-nhất)
7. [So Sánh Thuật Toán](#so-sánh-thuật-toán)
8. [Tối Ưu Hóa](#tối-ưu-hóa)

---

## Tổng Quan

Dự án này triển khai một hệ thống tìm đường đi ngắn nhất trên bản đồ thực tế sử dụng dữ liệu từ **OpenStreetMap (OSM)**. Hệ thống hỗ trợ 4 thuật toán tìm đường:

- **Dijkstra**: Thuật toán tìm đường ngắn nhất kinh điển
- **A\*** (A-Star): Thuật toán heuristic tối ưu
- **BFS** (Breadth-First Search): Tìm kiếm theo chiều rộng
- **DFS** (Depth-First Search): Tìm kiếm theo chiều sâu

### Luồng Xử Lý Tổng Quan

```
1. Frontend gửi request (start, end, bbox, algorithm)
   ↓
2. Backend nhận request và gọi Overpass API để lấy dữ liệu OSM
   ↓
3. Xây dựng đồ thị từ dữ liệu OSM (nodes và edges)
   ↓
4. Tìm điểm gần nhất trên đồ thị cho start và end
   ↓
5. Chạy thuật toán tìm đường được chọn
   ↓
6. Trả về đường đi dưới dạng danh sách tọa độ [lat, lng]
```

---

## Kiến Trúc Hệ Thống

### Cấu Trúc Thư Mục Backend

```
backend/
├── algorithms.py      # Triển khai các thuật toán tìm đường
├── graph_builder.py   # Xây dựng đồ thị từ dữ liệu OSM
├── node_finder.py     # Tìm điểm gần nhất trên đồ thị
├── osm_fetcher.py     # Lấy dữ liệu từ Overpass API
├── utils.py           # Các hàm tiện ích (Haversine, tính khoảng cách)
├── models.py          # Định nghĩa các model Pydantic
└── main.py            # FastAPI application và endpoints
```

### Các Module Chính

#### 1. `osm_fetcher.py`
- **Chức năng**: Gọi Overpass API để lấy dữ liệu đường (ways) và điểm (nodes) trong bounding box
- **Input**: `BBox` (north, south, east, west)
- **Output**: JSON data từ Overpass API chứa các elements (nodes và ways)

#### 2. `graph_builder.py`
- **Chức năng**: Chuyển đổi dữ liệu OSM thành đồ thị có trọng số
- **Input**: OSM JSON data
- **Output**: 
  - `graph`: Dictionary `{node_id: [(neighbor_id, distance), ...]}`
  - `nodes`: Dictionary `{node_id: (lat, lon)}`

#### 3. `node_finder.py`
- **Chức năng**: Tìm điểm gần nhất trên đồ thị cho tọa độ bất kỳ
- **Xử lý**: 
  - Tìm điểm trên cạnh gần nhất
  - Tạo node tạm thời nếu điểm không trùng với node có sẵn
  - Fallback về tìm node gần nhất nếu không tìm được điểm trên cạnh

#### 4. `algorithms.py`
- **Chức năng**: Triển khai các thuật toán tìm đường
- **Các hàm**: `dijkstra()`, `astar()`, `bfs()`, `dfs()`

---

## Cấu Trúc Dữ Liệu

### Đồ Thị (Graph)

Đồ thị được biểu diễn dưới dạng **adjacency list**:

```python
graph: Dict[int, List[Tuple[int, float]]]
# Key: node_id (int)
# Value: List các tuple (neighbor_id, distance_in_meters)
```

**Ví dụ:**
```python
graph = {
    12345: [(12346, 150.5), (12347, 200.3)],
    12346: [(12345, 150.5), (12348, 180.0)],
    ...
}
```

### Nodes Dictionary

```python
nodes: Dict[int, tuple]
# Key: node_id (int)
# Value: (latitude, longitude)
```

**Ví dụ:**
```python
nodes = {
    12345: (10.762622, 106.660172),
    12346: (10.763500, 106.661000),
    ...
}
```

### Path Request Model

```python
class PathRequest(BaseModel):
    start: Point          # {lat: float, lng: float}
    end: Point            # {lat: float, lng: float}
    bbox: BBox           # {north, south, east, west}
    algorithm: str       # "dijkstra" | "astar" | "bfs" | "dfs"
```

---

## Xây Dựng Đồ Thị Từ OSM

### Quy Trình Xây Dựng Đồ Thị

File: `backend/graph_builder.py`

#### Bước 1: Thu thập Nodes

```python
for element in osm_data["elements"]:
    if element["type"] == "node":
        node_id = element["id"]
        nodes[node_id] = (element["lat"], element["lon"])
        graph[node_id] = []
```

#### Bước 2: Xây Dựng Edges từ Ways

```python
for element in osm_data["elements"]:
    if element["type"] == "way" and "nodes" in element:
        way_nodes = element["nodes"]
        
        # Tạo cạnh giữa các node liên tiếp trong way
        for i in range(len(way_nodes) - 1):
            u = way_nodes[i]
            v = way_nodes[i + 1]
            
            # Tính khoảng cách bằng Haversine
            dist = haversine_distance(
                nodes[u][0], nodes[u][1],
                nodes[v][0], nodes[v][1]
            )
            
            # Đồ thị vô hướng: thêm cạnh cho cả 2 chiều
            graph[u].append((v, dist))
            graph[v].append((u, dist))
```

### Tính Khoảng Cách: Haversine Formula

File: `backend/utils.py`

Công thức Haversine tính khoảng cách thực tế giữa 2 điểm trên Trái Đất:

```python
def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    R = 6371000  # Bán kính Trái Đất (mét)
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c  # Khoảng cách tính bằng mét
```

**Ưu điểm:**
- Tính toán chính xác khoảng cách trên bề mặt cầu (Trái Đất)
- Phù hợp cho ứng dụng bản đồ thực tế

---

## Các Thuật Toán Triển Khai

### 1. Dijkstra Algorithm

**File**: `backend/algorithms.py`

**Mô tả**: Thuật toán tìm đường ngắn nhất từ một điểm đến tất cả các điểm khác trong đồ thị có trọng số không âm.

**Đặc điểm:**
- **Đảm bảo tối ưu**: Luôn tìm được đường đi ngắn nhất
- **Độ phức tạp**: O((V + E) log V) với priority queue
- **Sử dụng**: Priority queue (heap) để luôn xử lý node có khoảng cách nhỏ nhất trước

**Triển khai:**

```python
def dijkstra(graph, nodes, start_node, end_node, return_stats=False):
    # Khởi tạo
    dist = {node: float('inf') for node in graph}
    prev = {node: None for node in graph}
    dist[start_node] = 0
    pq = [(0, start_node)]  # Priority queue
    visited = set()
    nodes_explored = 0
    
    while pq:
        d, u = heapq.heappop(pq)
        
        if u == end_node:
            break  # Đã tìm thấy đích
        
        if u in visited:
            continue
        
        visited.add(u)
        nodes_explored += 1
        
        # Duyệt các neighbor
        for v, w in graph[u]:
            if v in visited:
                continue
            
            alt = dist[u] + w  # Khoảng cách mới
            if alt < dist[v]:
                dist[v] = alt
                prev[v] = u
                heapq.heappush(pq, (alt, v))
    
    # Tái tạo đường đi
    path = reconstruct_path(prev, start_node, end_node)
    return path
```

**Khi nào sử dụng:**
- Cần đường đi ngắn nhất chắc chắn
- Đồ thị có trọng số không âm
- Không cần tối ưu tốc độ (chấp nhận duyệt nhiều node)

---

### 2. A* (A-Star) Algorithm

**File**: `backend/algorithms.py`

**Mô tả**: Thuật toán heuristic kết hợp giữa Dijkstra và heuristic function để tìm đường đi ngắn nhất hiệu quả hơn.

**Đặc điểm:**
- **Đảm bảo tối ưu**: Nếu heuristic là admissible (không bao giờ đánh giá quá cao)
- **Độ phức tạp**: O((V + E) log V) trong trường hợp xấu nhất, nhưng thường nhanh hơn Dijkstra
- **Heuristic**: Sử dụng Haversine distance để ước lượng khoảng cách từ node hiện tại đến đích

**Triển khai:**

```python
def astar(graph, nodes, start_node, end_node, return_stats=False):
    def heuristic(a, b):
        """Heuristic: khoảng cách Haversine từ a đến b"""
        lat1, lon1 = nodes[a]
        lat2, lon2 = nodes[b]
        return haversine_distance(lat1, lon1, lat2, lon2)
    
    # Khởi tạo
    open_set = [(0, start_node)]  # Priority queue với f_score
    closed_set = set()
    g_score = {node: float('inf') for node in graph}
    g_score[start_node] = 0
    f_score = {node: float('inf') for node in graph}
    f_score[start_node] = heuristic(start_node, end_node)
    came_from = {}
    nodes_explored = 0
    
    while open_set:
        _, current = heapq.heappop(open_set)
        
        if current == end_node:
            path = reconstruct_path(came_from, start_node, end_node)
            return path
        
        if current in closed_set:
            continue
        
        closed_set.add(current)
        nodes_explored += 1
        
        # Duyệt neighbors
        for neighbor, weight in graph[current]:
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + weight
            
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, end_node)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return []  # Không tìm được đường đi
```

**Heuristic Function:**

```python
h(n) = haversine_distance(node_n, end_node)
```

- **Admissible**: Haversine distance luôn ≤ khoảng cách thực tế trên đường đi (do đường đi phải theo các cạnh của đồ thị)
- **Consistent**: Đảm bảo tính nhất quán cho A*

**Khi nào sử dụng:**
- Cần đường đi ngắn nhất và tốc độ nhanh
- Có thông tin về vị trí đích (để tính heuristic)
- **Khuyến nghị**: Thuật toán tốt nhất cho ứng dụng bản đồ

---

### 3. BFS (Breadth-First Search)

**File**: `backend/algorithms.py`

**Mô tả**: Tìm kiếm theo chiều rộng, duyệt các node theo thứ tự khoảng cách từ điểm bắt đầu (tính bằng số cạnh).

**Đặc điểm:**
- **Không đảm bảo tối ưu**: Chỉ tìm đường đi có số cạnh ít nhất, không phải đường đi ngắn nhất về khoảng cách
- **Độ phức tạp**: O(V + E)
- **Sử dụng**: Queue (FIFO) để duyệt theo thứ tự

**Triển khai:**

```python
def bfs(graph, nodes, start_node, end_node, return_stats=False):
    queue = deque([start_node])
    visited = {start_node}
    parent = {start_node: None}
    nodes_explored = 0
    
    while queue:
        u = queue.popleft()
        nodes_explored += 1
        
        if u == end_node:
            path = reconstruct_path(parent, start_node, end_node)
            return path
        
        # Duyệt neighbors
        for v, _ in graph[u]:  # Bỏ qua trọng số
            if v not in visited:
                visited.add(v)
                parent[v] = u
                queue.append(v)
    
    return []  # Không tìm được đường đi
```

**Lưu ý:**
- BFS **không sử dụng trọng số** của cạnh
- Chỉ tìm đường đi có **số cạnh ít nhất**, không phải khoảng cách ngắn nhất
- Phù hợp cho đồ thị không có trọng số hoặc khi cần đường đi có ít điểm dừng nhất

**Khi nào sử dụng:**
- Đồ thị không có trọng số
- Cần đường đi có số cạnh ít nhất
- So sánh với các thuật toán khác

---

### 4. DFS (Depth-First Search)

**File**: `backend/algorithms.py`

**Mô tả**: Tìm kiếm theo chiều sâu, duyệt sâu nhất có thể trước khi quay lại.

**Đặc điểm:**
- **Không đảm bảo tối ưu**: Không đảm bảo tìm được đường đi ngắn nhất
- **Độ phức tạp**: O(V + E)
- **Sử dụng**: Stack (LIFO) để duyệt theo chiều sâu

**Triển khai:**

```python
def dfs(graph, nodes, start_node, end_node, return_stats=False):
    stack = [start_node]
    visited = set()
    parent = {start_node: None}
    nodes_explored = 0
    
    while stack:
        u = stack.pop()
        
        if u == end_node:
            path = reconstruct_path(parent, start_node, end_node)
            return path
        
        if u in visited:
            continue
        
        visited.add(u)
        nodes_explored += 1
        
        # Duyệt neighbors (theo thứ tự ngược)
        for v, _ in graph[u]:
            if v not in visited:
                parent[v] = u
                stack.append(v)
    
    return []  # Không tìm được đường đi
```

**Lưu ý:**
- DFS **không đảm bảo** tìm được đường đi ngắn nhất
- Có thể duyệt rất nhiều node không cần thiết
- Chủ yếu dùng để so sánh, không khuyến nghị cho ứng dụng thực tế

**Khi nào sử dụng:**
- So sánh hiệu suất với các thuật toán khác
- Đồ thị đơn giản, không cần tối ưu

---

## Tìm Điểm Gần Nhất

### Vấn Đề

Người dùng có thể click vào bất kỳ điểm nào trên bản đồ, nhưng điểm đó có thể:
1. Không trùng với node nào trong đồ thị
2. Nằm giữa 2 node trên một cạnh
3. Nằm ngoài đồ thị

### Giải Pháp

File: `backend/node_finder.py`

#### 1. Tìm Điểm Trên Cạnh Gần Nhất

```python
def find_nearest_point_on_edge(graph, nodes, lat, lng, max_distance_m=1000.0):
    """
    Tìm điểm gần nhất trên cạnh của đồ thị.
    """
    best_dist = float('inf')
    best_edge = None
    best_lat = None
    best_lng = None
    
    # Duyệt qua tất cả các cạnh
    for u, neighbors in graph.items():
        for v, weight in neighbors:
            lat1, lon1 = nodes[u]
            lat2, lon2 = nodes[v]
            
            # Tính khoảng cách từ điểm đến cạnh này
            dist, proj_lat, proj_lng = point_to_line_distance(
                lat, lng, lat1, lon1, lat2, lon2
            )
            
            if dist < best_dist:
                best_dist = dist
                best_lat = proj_lat
                best_lng = proj_lng
                best_edge = (u, v)
    
    # Nếu tìm được điểm trên cạnh trong phạm vi cho phép
    if best_dist <= max_distance_m:
        # Tạo node tạm thời với ID âm
        temp_node_id = -abs(hash((best_lat, best_lng)) % (10**9))
        return temp_node_id, best_lat, best_lng, best_edge
    
    # Fallback: tìm node gần nhất
    nearest_node = find_nearest_node(nodes, lat, lng)
    return nearest_node, lat, lng, None
```

#### 2. Chiếu Điểm Lên Đoạn Thẳng

```python
def point_to_line_distance(lat, lng, lat1, lng1, lat2, lng2):
    """
    Tính khoảng cách từ điểm đến đoạn thẳng và tọa độ điểm chiếu.
    """
    dx = lng2 - lng1
    dy = lat2 - lat1
    
    px = lng - lng1
    py = lat - lat1
    
    # Hệ số t (0 đến 1 nếu điểm chiếu nằm trên đoạn thẳng)
    t = (px * dx + py * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))  # Giới hạn trong [0, 1]
    
    # Tọa độ điểm chiếu
    proj_lat = lat1 + t * dy
    proj_lng = lng1 + t * dx
    
    # Khoảng cách Haversine
    dist = haversine_distance(lat, lng, proj_lat, proj_lng)
    
    return dist, proj_lat, proj_lng
```

#### 3. Thêm Node Tạm Thời Vào Đồ Thị

```python
def add_temp_node_to_graph(graph, nodes, temp_node_id, temp_lat, temp_lng, edge_nodes):
    """
    Thêm node tạm thời vào đồ thị và kết nối với 2 node của cạnh.
    """
    u, v = edge_nodes
    
    # Thêm node tạm vào nodes dictionary
    nodes[temp_node_id] = (temp_lat, temp_lng)
    graph[temp_node_id] = []
    
    # Tính khoảng cách đến 2 node của cạnh
    dist_to_u = haversine_distance(temp_lat, temp_lng, nodes[u][0], nodes[u][1])
    dist_to_v = haversine_distance(temp_lat, temp_lng, nodes[v][0], nodes[v][1])
    
    # Xóa cạnh cũ (u, v) và thay bằng 2 cạnh mới
    graph[u] = [(n, w) for n, w in graph[u] if n != v]
    graph[v] = [(n, w) for n, w in graph[v] if n != u]
    
    # Thêm cạnh mới
    graph[u].append((temp_node_id, dist_to_u))
    graph[v].append((temp_node_id, dist_to_v))
    graph[temp_node_id].append((u, dist_to_u))
    graph[temp_node_id].append((v, dist_to_v))
```

---

## So Sánh Thuật Toán

### Bảng So Sánh

| Thuật toán | Đảm bảo tối ưu | Độ phức tạp | Số node duyệt | Tốc độ | Khuyến nghị |
|------------|----------------|-------------|---------------|--------|-------------|
| **Dijkstra** | ✅ Có | O((V+E)log V) | Nhiều | Trung bình | ✅ Tốt |
| **A\*** | ✅ Có | O((V+E)log V) | Ít nhất | Nhanh nhất | ✅ **Tốt nhất** |
| **BFS** | ❌ Không | O(V+E) | Nhiều | Nhanh | ⚠️ Không khuyến nghị |
| **DFS** | ❌ Không | O(V+E) | Rất nhiều | Chậm | ❌ Không khuyến nghị |

### Kết Quả Thực Tế

Khi so sánh trên cùng một đường đi:

- **A\***: 
  - Duyệt ít node nhất (nhờ heuristic)
  - Thời gian thực thi nhanh nhất
  - Đường đi ngắn nhất (đảm bảo tối ưu)

- **Dijkstra**:
  - Duyệt nhiều node hơn A*
  - Thời gian thực thi chậm hơn A*
  - Đường đi ngắn nhất (đảm bảo tối ưu)

- **BFS**:
  - Duyệt nhiều node
  - Đường đi có thể không ngắn nhất (chỉ đảm bảo số cạnh ít nhất)

- **DFS**:
  - Duyệt rất nhiều node
  - Đường đi không đảm bảo ngắn nhất
  - Chậm nhất

### Khi Nào Sử Dụng Thuật Toán Nào?

#### ✅ **A\*** (Khuyến nghị)
- **Khi**: Cần đường đi ngắn nhất và tốc độ nhanh
- **Lý do**: Kết hợp tốt nhất giữa độ chính xác và hiệu suất
- **Ứng dụng**: Ứng dụng bản đồ thực tế, navigation apps

#### ✅ **Dijkstra**
- **Khi**: Cần đường đi ngắn nhất, không quan tâm tốc độ
- **Lý do**: Đơn giản, dễ hiểu, đảm bảo tối ưu
- **Ứng dụng**: Hệ thống tính toán offline, phân tích đồ thị

#### ⚠️ **BFS**
- **Khi**: Đồ thị không có trọng số, cần đường đi có ít điểm dừng nhất
- **Lý do**: Nhanh nhưng không đảm bảo khoảng cách ngắn nhất
- **Ứng dụng**: Tìm đường đi trong mạng xã hội, game đơn giản

#### ❌ **DFS**
- **Khi**: Chỉ để so sánh, không khuyến nghị cho ứng dụng thực tế
- **Lý do**: Không đảm bảo tối ưu, chậm
- **Ứng dụng**: Giải quyết bài toán khác (không phải tìm đường ngắn nhất)

---

## Tối Ưu Hóa

### 1. Tối Ưu Tính Khoảng Cách

**Vấn đề**: Tính Haversine cho tất cả các cạnh có thể chậm với đồ thị lớn.

**Giải pháp**: 
- Sử dụng ước lượng khoảng cách trước để lọc các node quá xa
- Chỉ tính Haversine chính xác cho các node gần

```python
# Ước lượng nhanh (không chính xác nhưng nhanh)
lat_diff = abs(lat - nlat) * 111000  # mét
lng_diff = abs(lng - nlng) * 111000 * cos_lat
approx_dist = (lat_diff**2 + lng_diff**2)**0.5

# Nếu quá xa, skip
if approx_dist > max_distance_m:
    continue

# Tính Haversine chính xác chỉ khi cần
dist = haversine_distance(lat, lng, nlat, nlng)
```

### 2. Tối Ưu Xây Dựng Đồ Thị

**Vấn đề**: Tránh duplicate edges trong đồ thị vô hướng.

**Giải pháp**: Sử dụng set để track các cạnh đã thêm:

```python
edges_set = set()

# Chỉ thêm cạnh nếu chưa tồn tại
edge_key = (min(u, v), max(u, v))
if edge_key not in edges_set:
    edges_set.add(edge_key)
    # Thêm cạnh vào đồ thị
```

### 3. Tối Ưu Priority Queue

**Vấn đề**: Python's `heapq` không hỗ trợ update priority.

**Giải pháp**: 
- Cho phép duplicate entries trong heap
- Kiểm tra `visited` set để bỏ qua các entry cũ
- Đây là cách triển khai chuẩn và hiệu quả

### 4. Tối Ưu Tìm Điểm Gần Nhất

**Vấn đề**: Duyệt qua tất cả các cạnh để tìm điểm gần nhất có thể chậm.

**Giải pháp**:
- Ước lượng khoảng cách đến node đầu của cạnh trước
- Skip các cạnh quá xa ngay từ đầu
- Chỉ tính toán chính xác cho các cạnh gần

---

## API Endpoints

### 1. Tìm Đường Đi

**Endpoint**: `POST /api/find-path`

**Request Body**:
```json
{
  "start": {
    "lat": 10.762622,
    "lng": 106.660172
  },
  "end": {
    "lat": 10.763500,
    "lng": 106.661000
  },
  "bbox": {
    "north": 10.77,
    "south": 10.76,
    "east": 106.67,
    "west": 106.66
  },
  "algorithm": "astar"
}
```

**Response**:
```json
{
  "path": [
    [10.762622, 106.660172],
    [10.762800, 106.660300],
    ...
    [10.763500, 106.661000]
  ]
}
```

### 2. So Sánh Các Thuật Toán

**Endpoint**: `POST /api/compare-algorithms`

**Request Body**: Tương tự như `/api/find-path` (không cần `algorithm`)

**Response**:
```json
{
  "results": {
    "dijkstra": {
      "success": true,
      "execution_time_ms": 45.23,
      "nodes_explored": 1234,
      "path_length_m": 1250.5,
      "path_length_km": 1.251,
      "path_nodes_count": 15,
      "path": [[...], [...]]
    },
    "astar": {
      "success": true,
      "execution_time_ms": 12.45,
      "nodes_explored": 456,
      "path_length_m": 1250.5,
      "path_length_km": 1.251,
      "path_nodes_count": 15,
      "path": [[...], [...]]
    },
    ...
  },
  "summary": {
    "fastest": "astar",
    "most_efficient": "astar",
    "shortest_path": "astar",
    "total_algorithms_tested": 4,
    "successful_algorithms": 4
  },
  "start_node": [10.762622, 106.660172],
  "end_node": [10.763500, 106.661000]
}
```

---

## Kết Luận

Hệ thống này triển khai đầy đủ các thuật toán tìm đường đi ngắn nhất với:

- ✅ **Độ chính xác**: Sử dụng Haversine để tính khoảng cách thực tế
- ✅ **Hiệu suất**: Tối ưu hóa các thao tác tính toán
- ✅ **Linh hoạt**: Hỗ trợ nhiều thuật toán để so sánh
- ✅ **Thực tế**: Xử lý tốt các điểm không nằm trên đồ thị

**Khuyến nghị**: Sử dụng **A\*** cho ứng dụng thực tế vì nó kết hợp tốt nhất giữa độ chính xác và hiệu suất.


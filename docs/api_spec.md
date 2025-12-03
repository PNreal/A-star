# API Specification

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Tìm Đường Đi Ngắn Nhất

**Endpoint**: `POST /api/find-path`

**Mô tả**: Tìm đường đi ngắn nhất giữa 2 điểm trên bản đồ sử dụng thuật toán được chỉ định.

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

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | Object | ✅ | Điểm bắt đầu |
| `start.lat` | Float | ✅ | Vĩ độ điểm bắt đầu |
| `start.lng` | Float | ✅ | Kinh độ điểm bắt đầu |
| `end` | Object | ✅ | Điểm kết thúc |
| `end.lat` | Float | ✅ | Vĩ độ điểm kết thúc |
| `end.lng` | Float | ✅ | Kinh độ điểm kết thúc |
| `bbox` | Object | ✅ | Bounding box chứa vùng cần lấy dữ liệu |
| `bbox.north` | Float | ✅ | Vĩ độ phía Bắc |
| `bbox.south` | Float | ✅ | Vĩ độ phía Nam |
| `bbox.east` | Float | ✅ | Kinh độ phía Đông |
| `bbox.west` | Float | ✅ | Kinh độ phía Tây |
| `algorithm` | String | ❌ | Thuật toán sử dụng. Mặc định: `"dijkstra"` |

**Algorithm Values**:
- `"dijkstra"` - Thuật toán Dijkstra (mặc định)
- `"astar"` - Thuật toán A* (khuyến nghị)
- `"bfs"` - Breadth-First Search
- `"dfs"` - Depth-First Search

**Response Success** (200 OK):

```json
{
  "path": [
    [10.762622, 106.660172],
    [10.762800, 106.660300],
    [10.763000, 106.660500],
    [10.763500, 106.661000]
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `path` | Array | Danh sách các điểm trên đường đi |
| `path[][0]` | Float | Vĩ độ của điểm |
| `path[][1]` | Float | Kinh độ của điểm |

**Error Responses**:

**400 Bad Request** - Không có dữ liệu đường trong vùng này:
```json
{
  "detail": "Không có dữ liệu đường trong vùng này"
}
```

**400 Bad Request** - Không tìm được điểm trên đường đi:
```json
{
  "detail": "Không tìm được điểm trên đường đi"
}
```

**404 Not Found** - Không tìm được đường đi:
```json
{
  "detail": "Không tìm được đường đi"
}
```

**500 Internal Server Error** - Lỗi Overpass API:
```json
{
  "detail": "Lỗi Overpass API: <error message>"
}
```

**500 Internal Server Error** - Lỗi máy chủ:
```json
{
  "detail": "Lỗi máy chủ: <error message>\n<traceback>"
}
```

---

### 2. So Sánh Các Thuật Toán

**Endpoint**: `POST /api/compare-algorithms`

**Mô tả**: So sánh tất cả các thuật toán tìm đường trên cùng một điểm bắt đầu và kết thúc. Trả về thống kê chi tiết về thời gian thực thi, số node đã duyệt, và độ dài đường đi.

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
  }
}
```

**Lưu ý**: Không cần field `algorithm` vì endpoint này sẽ chạy tất cả các thuật toán.

**Response Success** (200 OK):

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
      "path": [
        [10.762622, 106.660172],
        [10.762800, 106.660300],
        ...
        [10.763500, 106.661000]
      ]
    },
    "astar": {
      "success": true,
      "execution_time_ms": 12.45,
      "nodes_explored": 456,
      "path_length_m": 1250.5,
      "path_length_km": 1.251,
      "path_nodes_count": 15,
      "path": [
        [10.762622, 106.660172],
        [10.762800, 106.660300],
        ...
        [10.763500, 106.661000]
      ]
    },
    "bfs": {
      "success": true,
      "execution_time_ms": 38.67,
      "nodes_explored": 2345,
      "path_length_m": 1350.8,
      "path_length_km": 1.351,
      "path_nodes_count": 18,
      "path": [...]
    },
    "dfs": {
      "success": true,
      "execution_time_ms": 156.89,
      "nodes_explored": 5678,
      "path_length_m": 1890.2,
      "path_length_km": 1.890,
      "path_nodes_count": 25,
      "path": [...]
    }
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

**Response Fields**:

#### `results` Object

Chứa kết quả của từng thuật toán:

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Thuật toán có tìm được đường đi không |
| `execution_time_ms` | Float | Thời gian thực thi (milliseconds) |
| `nodes_explored` | Integer | Số node đã duyệt |
| `path_length_m` | Float | Độ dài đường đi (mét) |
| `path_length_km` | Float | Độ dài đường đi (kilometers) |
| `path_nodes_count` | Integer | Số lượng node trong đường đi |
| `path` | Array | Danh sách tọa độ các điểm trên đường đi |

Nếu `success` là `false`, response sẽ có thêm:

| Field | Type | Description |
|-------|------|-------------|
| `error` | String | Thông báo lỗi |

#### `summary` Object

Tóm tắt kết quả so sánh:

| Field | Type | Description |
|-------|------|-------------|
| `fastest` | String | Thuật toán nhanh nhất |
| `most_efficient` | String | Thuật toán duyệt ít node nhất |
| `shortest_path` | String | Thuật toán tìm đường ngắn nhất |
| `total_algorithms_tested` | Integer | Tổng số thuật toán đã test |
| `successful_algorithms` | Integer | Số thuật toán tìm được đường đi |

#### `start_node` và `end_node`

Tọa độ của điểm bắt đầu và kết thúc đã được xử lý (có thể là node gần nhất hoặc điểm trên cạnh).

**Error Responses**: Tương tự như endpoint `/api/find-path`.

---

## CORS

API hỗ trợ CORS và cho phép tất cả các origin trong môi trường development. Trong production, nên giới hạn `allow_origins` để chỉ cho phép domain của frontend.

---

## Rate Limiting

Hiện tại API không có rate limiting. Trong production, nên thêm rate limiting để bảo vệ server.

---

## Timeout

- **Overpass API timeout**: 25 giây
- **Request timeout**: 30 giây

---

## Ví Dụ Sử Dụng

### JavaScript (Fetch API)

```javascript
const response = await fetch('http://localhost:3000/api/find-path', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    start: {
      lat: 10.762622,
      lng: 106.660172
    },
    end: {
      lat: 10.763500,
      lng: 106.661000
    },
    bbox: {
      north: 10.77,
      south: 10.76,
      east: 106.67,
      west: 106.66
    },
    algorithm: 'astar'
  })
});

const data = await response.json();
console.log(data.path);
```

### Python (requests)

```python
import requests

url = "http://localhost:3000/api/find-path"
payload = {
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

response = requests.post(url, json=payload)
data = response.json()
print(data["path"])
```

### cURL

```bash
curl -X POST "http://localhost:3000/api/find-path" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

---

## Notes

1. **Bounding Box**: Bounding box nên bao phủ cả điểm bắt đầu và kết thúc, và nên có đủ dữ liệu đường trong vùng đó.

2. **Độ chính xác tọa độ**: Tọa độ được sử dụng với độ chính xác cao (float). Khuyến nghị sử dụng ít nhất 6 chữ số thập phân.

3. **Thuật toán mặc định**: Nếu không chỉ định `algorithm`, hệ thống sẽ sử dụng Dijkstra.

4. **So sánh thuật toán**: Endpoint `/api/compare-algorithms` sẽ chạy tất cả 4 thuật toán, có thể mất nhiều thời gian hơn endpoint `/api/find-path`.

5. **Xử lý điểm không trên đồ thị**: Hệ thống tự động tìm điểm gần nhất trên cạnh hoặc node gần nhất nếu điểm được chỉ định không nằm trên đồ thị.


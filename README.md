#  Mô Phỏng Thuật Toán Tìm Đường Đi

Ứng dụng web tương tác để học và visualize các thuật toán tìm đường: **A\***, **Dijkstra**, và **BFS**. 
Hỗ trợ cả lưới mô phỏng và bản đồ thực tế với API định tuyến.

---

##  Tính Năng

-  **3 Thuật Toán**: A\*, Dijkstra, BFS
-  **Tương Tác**: Vẽ lưới, đặt Start/Goal, vẽ vật cản
-  **Điều Chỉnh**: Thay đổi tốc độ, kích thước lưới
-  **Bản Đồ Thực**: Tích hợp Leaflet + OSRM Routing API
-  **Thông Tin Chi Tiết**: Hiển thị số bước, chi phí, thời gian thực hiện
-  **Python Runtime**: Chạy Python trực tiếp trên browser với Pyodide

---

##  Cài Đặt & Chạy

### Yêu Cầu
- Trình duyệt hiện đại (Chrome, Firefox, Safari, Edge)
- Kết nối internet (để load Leaflet, Pyodide, Google Fonts)

### Cách Chạy

1. **Clone hoặc download project**
   ```bash
   git clone https://github.com/yourusername/A-star.git
   cd A-star
   ```

2. **Mở file `index.html` trong trình duyệt**
   - Cách 1: Double-click `index.html`
   - Cách 2: Dùng Live Server (VS Code extension)
   ```bash
   # Nếu dùng Python
   python -m http.server 8000
   # Rồi mở http://localhost:8000
   ```

3. **Sử dụng ứng dụng**
   - Chọn thuật toán từ dropdown
   - Nhấn "Chọn Start" → click vào lưới
   - Nhấn "Chọn Goal" → click vào lưới
   - Nhấn "Vẽ vật cản" → vẽ các bức tường
   - Nhấn "Chạy thuật toán" để visualize

---

##  Hướng Dẫn Sử Dụng

### Lưới Mô Phỏng (Grid Mode)
| Nút | Chức Năng |
|-----|----------|
| Chọn Start | Đặt điểm khởi đầu (xanh) |
| Chọn Goal | Đặt điểm đích (đỏ) |
| Vẽ vật cản | Vẽ tường (đen) |
| Chạy thuật toán | Tìm đường và visualize |
| Reset | Xóa lưới |

### Bản Đồ Thực (Map Mode)
- Nhấn "Bản đồ thật" để chuyển sang chế độ bản đồ
- Click lần 1: Đặt Start
- Click lần 2: Đặt Goal (tự động tìm đường)
- Click lần 3: Reset

### Điều Chỉnh
- **Thuật toán**: Chọn A\*, Dijkstra, hoặc BFS
- **Tốc độ**: Kéo slider (100ms - 3000ms / bước)
- **Kích thước lưới**: 5x5 - 50x50 ô

---

##  Thuật Toán

###  A\* (A-Star)
- **Công thức**: `f(n) = g(n) + h(n)`
- **g(n)**: Chi phí từ Start đến nút hiện tại
- **h(n)**: Ước lượng chi phí từ nút hiện tại đến Goal (heuristic)
- **Đặc điểm**: Nhanh nhất, tối ưu
- **Màu sắc**: Cyan (đường đi)

###  Dijkstra
- **Công thức**: `f(n) = g(n)` (h(n) = 0)
- **Đặc điểm**: Tìm đường tối ưu, chậm hơn A\*
- **Ứng dụng**: Khi không có heuristic tốt

###  BFS (Breadth First Search)
- **Đặc điểm**: Duyệt theo tầng, tìm đường ngắn nhất
- **Hữu ích**: Khi tất cả các cạnh có cùng trọng số
- **Nhược điểm**: Chậm cho đồ thị lớn

## Cấu Trúc Project

```
A-star/
├── index.html          
├── main.js             # Logic chính + thuật toán Python
├── style.css           
└── README.md           
```


## ⚙️ Tuỳ Chỉnh

### Thay đổi kích thước cell
Trong `main.js`, tìm:
```javascript
const cell = document.createElement('div');
c.className = 'cell'; // Thay đổi width/height trong style.css
```

### Thay đổi heuristic
Trong `main.js`, tìm hàm `heuristic`:
```python
def heuristic(a, b):
  return abs(a[0]-b[0]) + abs(a[1]-b[1])  # Manhattan distance
  # Thay bằng Euclidean: return ((a[0]-b[0])**2 + (a[1]-b[1])**2)**0.5
```

---

## 🐛 Troubleshooting

| Vấn Đề | Giải Pháp |
|--------|----------|
| Pyodide không tải | Kiểm tra kết nối internet, refresh trang |
| Bản đồ không hiển thị | Kiểm tra Leaflet CDN, bật JavaScript |
| Thuật toán chạy chậm | Tăng tốc độ slider, giảm kích thước lưới |
| OSRM API lỗi | Thử địa điểm khác hoặc kiểm tra kết nối |

---

##  License

MIT License - Tự do sử dụng cho mục đích học tập & thương mại

##  Tham Khảo & Tài Nguyên

- [A* Pathfinding Algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm)
- [Leaflet Documentation](https://leafletjs.com)
- [Pyodide - Python in the Browser](https://pyodide.org)
- [OSRM Routing Engine](http://project-osrm.org)

---

## Todo / Cải Tiến Tương Lai

- [ ] Thêm thuật toán: Greedy Best-First Search
- [ ] Hỗ trợ đường chéo (diagonal movement)
- [ ] Lưu/load bản thiết kế lưới
- [ ] Chế độ so sánh nhiều thuật toán cùng lúc
- [ ] Hỗ trợ điều khiển bàn phím
- [ ] Xuất kết quả dưới dạng hình ảnh/video

---

# AI Project 2025.1: Ứng dụng Tìm Đường Đi Ngắn Nhất

Đây là dự án giữa kì cho môn Nhập môn AI, tập trung vào chủ đề **Tìm đường đi ngắn nhất**.

| Dịch vụ | Công nghệ | Cổng (Port) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite, Leaflet | **5173** | Giao diện bản đồ (Truy cập bằng `http://localhost:5173`) |
| **Backend** | FastAPI, Python | **3000** | API xử lý thuật toán tìm đường (Frontend sẽ gọi đến `http://localhost:3000`) |

---

## 1. Mô Tả Dự Án

Dự án là một ứng dụng web mô phỏng chức năng tìm đường đi trên bản đồ ("mini-google-maps").

* **Giao diện (Frontend)**: Được xây dựng bằng **React** và **Vite**, sử dụng thư viện **Leaflet** để hiển thị bản đồ tương tác. Giao diện cho phép người dùng chọn điểm bắt đầu (Start), điểm kết thúc (End), và lựa chọn thuật toán tìm đường.
* **Xử lý (Backend)**: Được xây dựng bằng **FastAPI** (Python), đóng vai trò là API xử lý logic tìm đường.
* **Nguồn dữ liệu**: Dữ liệu đường (way) và điểm (node) được lấy từ **OpenStreetMap (OSM)** thông qua **Overpass API** dựa trên khu vực hiển thị của bản đồ (BBox).
* **Các thuật toán tìm đường được triển khai**:
    * **Dijkstra** (Thuật toán mặc định)
    * **A\*** (A-Star)
    * **BFS** (Breadth-First Search)
    * **DFS** (Depth-First Search)

---

## 2. Demo Ứng Dụng

### Giao Diện Chính

![Giao diện ứng dụng](Screenshot%202025-12-04%20003819.png)

Ứng dụng cung cấp giao diện trực quan với bản đồ tương tác, cho phép người dùng:
- Chọn điểm bắt đầu và điểm kết thúc trên bản đồ
- Lựa chọn thuật toán tìm đường
- Xem kết quả đường đi được hiển thị trên bản đồ

### So Sánh Các Thuật Toán

![So sánh thuật toán](Screenshot%202025-12-04%20003831.png)

Tính năng so sánh các thuật toán cho phép bạn:
- Xem thống kê chi tiết về hiệu suất của từng thuật toán
- So sánh thời gian thực thi, số node đã duyệt
- So sánh độ dài đường đi của các thuật toán khác nhau

### Thông Tin Chi Tiết Thuật Toán

![Thông tin thuật toán](Screenshot%202025-12-04%20003839.png)

Panel thông tin hiển thị:
- Số lượng node đang khám phá và đã khám phá
- Chi phí đường đi
- Thời gian thực thi
- Chú thích màu sắc cho các trạng thái khác nhau

---

## 3. Hướng Dẫn Triển Khai

Có hai cách để triển khai dự án: sử dụng Docker Compose hoặc chạy từng phần cục bộ.

### Cách 1: Triển khai bằng Docker Compose (Khuyến nghị)

Cách này đơn giản nhất, chỉ yêu cầu máy tính của bạn đã cài đặt **Docker** và **Docker Compose**.

1. **Clone dự án và di chuyển vào thư mục gốc:**

    ```bash
    git clone https://github.com/PNreal/A-star.git
    cd A-star
    ```

2. **Khởi động các dịch vụ bằng Docker Compose:**
    Lệnh này sẽ tự động build image cho cả Backend và Frontend, sau đó khởi chạy hai container (`map_backend` và `map_frontend`).

    ```bash
    docker-compose up --build
    ```

    *Lưu ý: Nếu bạn muốn chạy dưới nền, dùng `docker-compose up -d`.*

3. **Truy cập ứng dụng:**
    Mở trình duyệt và truy cập vào địa chỉ:
    **`http://localhost:5173`**

---

### Cách 2: Chạy Cục Bộ (Local Setup)

Cách này yêu cầu máy tính của bạn đã cài đặt **Python** (phiên bản 3.12 hoặc tương đương) và **Node.js** (phiên bản 20.x hoặc tương đương).

#### 3.1. Khởi chạy Backend (FastAPI - Cổng 3000)

1. **Di chuyển vào thư mục Backend:**

    ```bash
    cd backend
    ```

2. **Cài đặt các thư viện Python:**

    ```bash
    pip install -r requirements.txt
    # Các thư viện cần thiết: fastapi, pydantic, requests, uvicorn
    ```

3. **Khởi động Server FastAPI bằng Uvicorn:**

    ```bash
    uvicorn main:app --host 0.0.0.0 --port 3000
    ```

    Server Backend sẽ chạy tại **`http://localhost:3000`**.

#### 3.2. Khởi chạy Frontend (React/Vite - Cổng 5173)

1. **Di chuyển vào thư mục Frontend:**

    ```bash
    cd ../frontend/mini-google-maps
    ```

2. **Cài đặt các thư viện Node.js:**

    ```bash
    npm install
    # Các thư viện chính: react, leaflet, react-leaflet
    ```

3. **Khởi động Server Dev của Vite:**

    ```bash
    npm run dev -- --host
    # Hoặc đơn giản hơn: vite --host
    ```

    Server Frontend sẽ chạy tại **`http://localhost:5173`**.

4. **Truy cập ứng dụng:**
    Mở trình duyệt và truy cập vào địa chỉ:
    **`http://localhost:5173`**
    *(Lưu ý: Cả Backend và Frontend phải đang chạy đồng thời để ứng dụng hoạt động.)*

---

## 4. Tài Liệu Kỹ Thuật

Để tìm hiểu chi tiết về cách triển khai các thuật toán và kiến trúc hệ thống, vui lòng xem:

- **[Tài Liệu Triển Khai Thuật Toán](./docs/algorithm_implementation.md)**: Tài liệu chi tiết về:
  - Cách triển khai các thuật toán (Dijkstra, A*, BFS, DFS)
  - Xây dựng đồ thị từ dữ liệu OpenStreetMap
  - Tìm điểm gần nhất trên đồ thị
  - So sánh và đánh giá hiệu suất các thuật toán
  - Tối ưu hóa và best practices

- **[API Specification](./docs/api_spec.md)**: Tài liệu chi tiết về:
  - Các endpoints API
  - Request/Response format
  - Error handling
  - Ví dụ sử dụng với các ngôn ngữ khác nhau

---

## 5. Tính Năng Chính

- **Tìm đường đi ngắn nhất** trên bản đồ thực tế sử dụng dữ liệu OpenStreetMap
- **So sánh nhiều thuật toán** (Dijkstra, A*, BFS, DFS) với thống kê chi tiết
- **Giao diện trực quan** với bản đồ tương tác sử dụng Leaflet
- **API RESTful** đầy đủ với tài liệu Swagger
- **Docker Compose** để triển khai dễ dàng
- **Hot reload** cho cả Frontend và Backend trong môi trường development

---

## 6. Cấu Trúc Dự Án

```
A-star/
├── backend/                 # Backend FastAPI
│   ├── algorithms.py        # Triển khai các thuật toán
│   ├── graph_builder.py     # Xây dựng đồ thị từ OSM
│   ├── node_finder.py       # Tìm điểm gần nhất
│   ├── osm_fetcher.py       # Lấy dữ liệu từ Overpass API
│   ├── models.py            # Pydantic models
│   ├── utils.py             # Các hàm tiện ích
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   └── mini-google-maps/    # React/Vite frontend
│       ├── src/             # Source code React
│       ├── package.json     # Node.js dependencies
│       └── vite.config.js    # Vite configuration
├── docs/                    # Tài liệu kỹ thuật
│   ├── algorithm_implementation.md
│   └── api_spec.md
├── docker-compose.yml       # Docker Compose configuration
└── README.md                # File này
```

---

## 7. License

Dự án này được phát hành dưới giấy phép MIT. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 8. Tác Giả

Dự án được phát triển bởi **Phương Nguyễn** như một phần của khóa học Nhập môn Trí tuệ nhân tạo.

**GitHub**: [https://github.com/PNreal/A-star](https://github.com/PNreal/A-star)

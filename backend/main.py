"""
FastAPI application cho OSM Shortest Path API.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import time

from models import PathRequest
from osm_fetcher import fetch_osm_data
from graph_builder import build_graph
from algorithms import dijkstra, astar, bfs, dfs
from node_finder import find_nearest_point_on_edge, add_temp_node_to_graph
from utils import calculate_path_distance

app = FastAPI(title="OSM Shortest Path API")

# Cho phép CORS để frontend React gọi được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production, thay bằng URL frontend cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/find-path")
async def find_path(request: PathRequest):
    """
    Tìm đường đi ngắn nhất giữa 2 điểm sử dụng thuật toán được chỉ định.
    
    Args:
        request: PathRequest chứa điểm bắt đầu, điểm kết thúc, bbox và thuật toán
        
    Returns:
        dict: {"path": [[lat, lng], ...]} - Danh sách tọa độ các điểm trên đường đi
    """
    print(f"[DEBUG] Request: start={request.start}, end={request.end}, algo={request.algorithm}")
    print(f"[DEBUG] BBox: {request.bbox}")
    try:
        # 1. Lấy dữ liệu OSM trong bbox
        print("[DEBUG] Fetching OSM data...")
        osm_data = fetch_osm_data(request.bbox)
        print(f"[DEBUG] OSM data: {len(osm_data.get('elements', []))} elements")

        # 2. Xây đồ thị
        print("[DEBUG] Building graph...")
        graph, nodes = build_graph(osm_data)
        print(f"[DEBUG] Graph: {len(graph)} nodes")
        if not nodes:
            raise HTTPException(status_code=400, detail="Không có dữ liệu đường trong vùng này")

        # 3. Tìm điểm gần nhất trên cạnh hoặc node cho start/end
        start_node, start_lat, start_lng, start_edge = find_nearest_point_on_edge(
            graph, nodes, request.start.lat, request.start.lng
        )
        end_node, end_lat, end_lng, end_edge = find_nearest_point_on_edge(
            graph, nodes, request.end.lat, request.end.lng
        )

        if start_node is None or end_node is None:
            raise HTTPException(status_code=400, detail="Không tìm được điểm trên đường đi")
        
        # Nếu start_node là node tạm thời (số âm), thêm vào đồ thị
        if start_node < 0 and start_edge is not None:
            add_temp_node_to_graph(graph, nodes, start_node, start_lat, start_lng, start_edge)
        
        # Nếu end_node là node tạm thời (số âm), thêm vào đồ thị
        if end_node < 0 and end_edge is not None:
            add_temp_node_to_graph(graph, nodes, end_node, end_lat, end_lng, end_edge)

        # Đảm bảo start_node và end_node có trong graph
        if start_node not in graph:
            raise HTTPException(status_code=400, detail=f"Start node {start_node} không có trong đồ thị")
        if end_node not in graph:
            raise HTTPException(status_code=400, detail=f"End node {end_node} không có trong đồ thị")

        # 4. Chọn thuật toán
        algo_map = {
            "dijkstra": dijkstra,
            "astar": astar,
            "bfs": bfs,
            "dfs": dfs
        }

        algo_func = algo_map.get(request.algorithm, dijkstra)
        node_path = algo_func(graph, nodes, start_node, end_node)

        if not node_path:
            raise HTTPException(status_code=404, detail="Không tìm được đường đi")

        # 5. Chuyển node → tọa độ [lat, lng]
        path_coords = [[nodes[node_id][0], nodes[node_id][1]] for node_id in node_path]

        return {"path": path_coords}

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Lỗi Overpass API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Lỗi máy chủ: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/api/compare-algorithms")
async def compare_algorithms(request: PathRequest):
    """
    So sánh tất cả các thuật toán tìm đường:
    - Thời gian thực thi
    - Số node đã duyệt
    - Độ dài đường đi
    - Đường đi (path)
    
    Args:
        request: PathRequest chứa điểm bắt đầu, điểm kết thúc và bbox
        
    Returns:
        dict: Kết quả so sánh các thuật toán
    """
    try:
        # 1. Lấy dữ liệu OSM trong bbox
        osm_data = fetch_osm_data(request.bbox)

        # 2. Xây đồ thị
        graph, nodes = build_graph(osm_data)
        if not nodes:
            raise HTTPException(status_code=400, detail="Không có dữ liệu đường trong vùng này")

        # 3. Tìm điểm gần nhất trên cạnh hoặc node cho start/end
        start_node, start_lat, start_lng, start_edge = find_nearest_point_on_edge(
            graph, nodes, request.start.lat, request.start.lng
        )
        end_node, end_lat, end_lng, end_edge = find_nearest_point_on_edge(
            graph, nodes, request.end.lat, request.end.lng
        )

        if start_node is None or end_node is None:
            raise HTTPException(status_code=400, detail="Không tìm được điểm trên đường đi")
        
        # Nếu start_node là node tạm thời (số âm), thêm vào đồ thị
        if start_node < 0 and start_edge is not None:
            add_temp_node_to_graph(graph, nodes, start_node, start_lat, start_lng, start_edge)
        
        # Nếu end_node là node tạm thời (số âm), thêm vào đồ thị
        if end_node < 0 and end_edge is not None:
            add_temp_node_to_graph(graph, nodes, end_node, end_lat, end_lng, end_edge)

        # Đảm bảo start_node và end_node có trong graph
        if start_node not in graph:
            raise HTTPException(status_code=400, detail=f"Start node {start_node} không có trong đồ thị")
        if end_node not in graph:
            raise HTTPException(status_code=400, detail=f"End node {end_node} không có trong đồ thị")

        # 4. Định nghĩa các thuật toán cần so sánh
        algorithms = {
            "dijkstra": dijkstra,
            "astar": astar,
            "bfs": bfs,
            "dfs": dfs
        }

        results = {}
        
        # 5. Chạy từng thuật toán và thu thập thống kê
        for algo_name, algo_func in algorithms.items():
            try:
                # Đo thời gian thực thi
                start_time = time.perf_counter()
                node_path, stats = algo_func(graph, nodes, start_node, end_node, return_stats=True)
                execution_time = time.perf_counter() - start_time
                
                if node_path:
                    # Chuyển node → tọa độ [lat, lng]
                    path_coords = [[nodes[node_id][0], nodes[node_id][1]] for node_id in node_path]
                    # Tính độ dài đường đi
                    path_distance = calculate_path_distance(node_path, nodes)
                    
                    results[algo_name] = {
                        "success": True,
                        "execution_time_ms": round(execution_time * 1000, 2),
                        "nodes_explored": stats["nodes_explored"],
                        "path_length_m": round(path_distance, 2),
                        "path_length_km": round(path_distance / 1000, 3),
                        "path_nodes_count": len(node_path),
                        "path": path_coords
                    }
                else:
                    results[algo_name] = {
                        "success": False,
                        "execution_time_ms": round(execution_time * 1000, 2),
                        "nodes_explored": stats["nodes_explored"],
                        "error": "Không tìm được đường đi"
                    }
            except Exception as e:
                results[algo_name] = {
                    "success": False,
                    "error": str(e)
                }

        # 6. Tìm thuật toán tốt nhất
        successful_results = {k: v for k, v in results.items() if v.get("success", False)}
        
        if successful_results:
            # Thuật toán nhanh nhất
            fastest = min(successful_results.items(), key=lambda x: x[1]["execution_time_ms"])
            # Thuật toán duyệt ít node nhất
            most_efficient = min(successful_results.items(), key=lambda x: x[1]["nodes_explored"])
            # Thuật toán tìm đường ngắn nhất (nếu có)
            shortest_path = min(successful_results.items(), key=lambda x: x[1]["path_length_m"])
            
            summary = {
                "fastest": fastest[0],
                "most_efficient": most_efficient[0],
                "shortest_path": shortest_path[0],
                "total_algorithms_tested": len(algorithms),
                "successful_algorithms": len(successful_results)
            }
        else:
            summary = {
                "total_algorithms_tested": len(algorithms),
                "successful_algorithms": 0,
                "error": "Không có thuật toán nào tìm được đường đi"
            }

        return {
            "results": results,
            "summary": summary,
            "start_node": [nodes[start_node][0], nodes[start_node][1]],
            "end_node": [nodes[end_node][0], nodes[end_node][1]]
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Lỗi Overpass API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Lỗi máy chủ: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

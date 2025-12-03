"""
Module để xây dựng đồ thị từ dữ liệu OpenStreetMap.
"""
from typing import Dict, Tuple

from utils import haversine_distance


def build_graph(osm_data: dict) -> Tuple[Dict[int, list], Dict[int, tuple]]:
    """
    Xây dựng đồ thị từ dữ liệu OSM với các cải thiện:
    - Sử dụng Haversine để tính khoảng cách chính xác
    - Tránh duplicate edges bằng cách sử dụng set
    - Xử lý tốt hơn các node thiếu
    
    Args:
        osm_data: Dữ liệu OSM từ Overpass API
        
    Returns:
        Tuple[graph, nodes]:
        - graph: Dictionary với key là node_id, value là list các (neighbor_id, distance)
        - nodes: Dictionary với key là node_id, value là (lat, lon)
    """
    nodes = {}
    graph = {}
    # Sử dụng set để tránh duplicate edges
    edges_set = set()

    # Bước 1: Thu thập tất cả node từ elements
    for element in osm_data["elements"]:
        if element["type"] == "node":
            node_id = element["id"]
            nodes[node_id] = (element["lat"], element["lon"])
            graph[node_id] = []

    # Bước 2: Thu thập node IDs từ ways để đảm bảo không bỏ sót
    # (Overpass API thường trả về đầy đủ, nhưng để an toàn)
    way_node_ids = set()
    for element in osm_data["elements"]:
        if element["type"] == "way" and "nodes" in element:
            way_node_ids.update(element["nodes"])

    # Bước 3: Xây cạnh từ way
    for element in osm_data["elements"]:
        if element["type"] == "way" and "nodes" in element:
            way_nodes = element["nodes"]
            
            # Kiểm tra way có ít nhất 2 nodes
            if len(way_nodes) < 2:
                continue
            
            # Tạo các cạnh từ các node liên tiếp trong way
            for i in range(len(way_nodes) - 1):
                u = way_nodes[i]
                v = way_nodes[i + 1]
                
                # Chỉ thêm cạnh nếu cả 2 node đều có trong nodes dictionary
                if u in nodes and v in nodes:
                    # Sử dụng tuple có thứ tự để tránh duplicate (đồ thị vô hướng)
                    edge_key = (min(u, v), max(u, v))
                    
                    # Chỉ thêm cạnh nếu chưa tồn tại
                    if edge_key not in edges_set:
                        edges_set.add(edge_key)
                        
                        # Tính khoảng cách bằng Haversine (chính xác)
                        lat1, lon1 = nodes[u]
                        lat2, lon2 = nodes[v]
                        dist = haversine_distance(lat1, lon1, lat2, lon2)
                        
                        # Đồ thị vô hướng: thêm cạnh cho cả 2 chiều
                        graph[u].append((v, dist))
                        graph[v].append((u, dist))

    return graph, nodes


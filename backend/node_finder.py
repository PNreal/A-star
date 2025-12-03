"""
Module để tìm node gần nhất và xử lý điểm không nằm trên cạnh của đồ thị.
"""
import math
from typing import Dict, List, Tuple, Optional

from utils import haversine_distance


def point_to_line_distance(lat: float, lng: float, lat1: float, lng1: float, 
                          lat2: float, lng2: float) -> Tuple[float, float, float]:
    """
    Tính khoảng cách từ điểm đến đoạn thẳng và tọa độ điểm chiếu.
    Sử dụng công thức chiếu điểm lên đoạn thẳng trong hệ tọa độ địa lý.
    
    Args:
        lat, lng: Tọa độ điểm cần chiếu
        lat1, lng1: Tọa độ điểm đầu của đoạn thẳng
        lat2, lng2: Tọa độ điểm cuối của đoạn thẳng
        
    Returns:
        Tuple[float, float, float]: (khoảng cách, lat của điểm chiếu, lng của điểm chiếu)
    """
    # Vector từ điểm đầu đến điểm cuối của cạnh
    dx = lng2 - lng1
    dy = lat2 - lat1
    
    # Nếu cạnh là một điểm (dx=0, dy=0), trả về khoảng cách đến điểm đó
    if abs(dx) < 1e-9 and abs(dy) < 1e-9:
        dist = haversine_distance(lat, lng, lat1, lng1)
        return dist, lat1, lng1
    
    # Vector từ điểm đầu đến điểm cần chiếu
    px = lng - lng1
    py = lat - lat1
    
    # Tính hệ số t (từ 0 đến 1 nếu điểm chiếu nằm trên đoạn thẳng)
    t = (px * dx + py * dy) / (dx * dx + dy * dy)
    
    # Giới hạn t trong khoảng [0, 1] để điểm chiếu nằm trên đoạn thẳng
    t = max(0.0, min(1.0, t))
    
    # Tọa độ điểm chiếu
    proj_lat = lat1 + t * dy
    proj_lng = lng1 + t * dx
    
    # Khoảng cách từ điểm đến điểm chiếu
    dist = haversine_distance(lat, lng, proj_lat, proj_lng)
    
    return dist, proj_lat, proj_lng


def find_nearest_node(nodes: Dict[int, tuple], lat: float, lng: float, max_distance_m: float = 5000.0) -> Optional[int]:
    """
    Tìm node gần nhất với tọa độ cho trước.
    Sử dụng Haversine để tính khoảng cách chính xác.
    Tối ưu bằng cách ước lượng khoảng cách trước để lọc các node xa.
    
    Args:
        nodes: Dictionary chứa tọa độ các node
        lat, lng: Tọa độ điểm cần tìm
        max_distance_m: Khoảng cách tối đa để tìm node (mét), mặc định 5km.
                        Nếu là float('inf'), sẽ tìm trong tất cả nodes.
        
    Returns:
        int: ID của node gần nhất, hoặc None nếu không tìm được hoặc nodes rỗng
    """
    if not nodes:
        return None
    
    best_id = None
    best_dist = float('inf')
    
    # Tính cos(lat) một lần để tối ưu
    cos_lat = abs(math.cos(math.radians(lat)))
    
    # Nếu max_distance_m là vô cực, tìm trong tất cả nodes
    use_approximation = max_distance_m != float('inf')
    
    for node_id, (nlat, nlng) in nodes.items():
        # Nếu sử dụng ước lượng, kiểm tra trước
        if use_approximation:
            # Ước lượng khoảng cách nhanh (không chính xác nhưng nhanh hơn)
            # 1 độ lat ≈ 111km, 1 độ lng ≈ 111km * cos(lat)
            lat_diff = abs(lat - nlat) * 111000  # mét
            lng_diff = abs(lng - nlng) * 111000 * cos_lat  # mét
            approx_dist = (lat_diff**2 + lng_diff**2)**0.5
            
            # Nếu node quá xa và đã tìm được node nào đó, skip
            if approx_dist > max_distance_m and best_id is not None:
                continue
        
        # Tính Haversine chính xác
        dist = haversine_distance(lat, lng, nlat, nlng)
        
        # Kiểm tra khoảng cách chính xác nếu có giới hạn
        if use_approximation and dist > max_distance_m and best_id is not None:
            continue
        
        if dist < best_dist:
            best_dist = dist
            best_id = node_id
    
    return best_id


def find_nearest_point_on_edge(graph: Dict[int, List[Tuple[int, float]]], 
                                nodes: Dict[int, tuple], lat: float, lng: float, 
                                max_distance_m: float = 1000.0) -> Tuple[Optional[int], float, float, Optional[Tuple[int, int]]]:
    """
    Tìm điểm gần nhất trên cạnh của đồ thị.
    Nếu điểm không nằm trên cạnh nào trong phạm vi max_distance_m, sẽ tìm node gần nhất.
    
    Args:
        graph: Đồ thị dạng adjacency list
        nodes: Dictionary chứa tọa độ các node
        lat, lng: Tọa độ điểm cần tìm
        max_distance_m: Khoảng cách tối đa để tìm điểm trên cạnh (mét)
        
    Returns:
        Tuple[node_id, lat, lng, edge]:
        - node_id: ID của node (có thể là node mới với ID âm hoặc node hiện có), None nếu không tìm được
        - lat, lng: Tọa độ của điểm
        - edge: Tuple (u, v) của cạnh cần kết nối nếu node_id là node mới, None nếu là node hiện có
    """
    if not graph or not nodes:
        # Nếu graph hoặc nodes rỗng, tìm node gần nhất
        nearest_node = find_nearest_node(nodes, lat, lng, max_distance_m=float('inf'))
        return nearest_node, lat, lng, None
    
    best_dist = float('inf')
    best_lat = None
    best_lng = None
    best_edge = None
    best_t = 0.0
    
    # Tính cos(lat) một lần để tối ưu
    cos_lat = abs(math.cos(math.radians(lat)))
    
    # Duyệt qua tất cả các cạnh trong đồ thị
    visited_edges = set()
    for u, neighbors in graph.items():
        if u not in nodes:
            continue
        lat1, lng1 = nodes[u]
        
        # Ước lượng khoảng cách từ điểm đến node u (để skip các cạnh quá xa)
        lat_diff = abs(lat - lat1) * 111000
        lng_diff = abs(lng - lng1) * 111000 * cos_lat
        approx_dist_to_u = (lat_diff**2 + lng_diff**2)**0.5
        
        # Nếu node u quá xa, skip luôn (tiết kiệm thời gian)
        if approx_dist_to_u > max_distance_m * 2:
            continue
        
        for v, weight in neighbors:
            if v not in nodes:
                continue
            
            # Tránh xử lý cạnh 2 lần (đồ thị vô hướng)
            edge_key = (min(u, v), max(u, v))
            if edge_key in visited_edges:
                continue
            visited_edges.add(edge_key)
            
            lat2, lng2 = nodes[v]
            
            # Tính khoảng cách từ điểm đến cạnh này
            dist, proj_lat, proj_lng = point_to_line_distance(lat, lng, lat1, lng1, lat2, lng2)
            
            if dist < best_dist:
                best_dist = dist
                best_lat = proj_lat
                best_lng = proj_lng
                best_edge = (u, v)
                
                # Tính hệ số t để biết điểm chiếu ở đâu trên cạnh
                dx = lng2 - lng1
                dy = lat2 - lat1
                if abs(dx) < 1e-9 and abs(dy) < 1e-9:
                    best_t = 0.0
                else:
                    px = proj_lng - lng1
                    py = proj_lat - lat1
                    best_t = (px * dx + py * dy) / (dx * dx + dy * dy)
                    best_t = max(0.0, min(1.0, best_t))
    
    # Nếu tìm được điểm trên cạnh trong phạm vi cho phép
    if best_dist <= max_distance_m and best_edge is not None:
        u, v = best_edge
        
        # Nếu điểm chiếu trùng với node đầu hoặc cuối, trả về node đó
        if best_t < 1e-6:  # Gần node đầu
            return u, nodes[u][0], nodes[u][1], None
        elif best_t > 1.0 - 1e-6:  # Gần node cuối
            return v, nodes[v][0], nodes[v][1], None
        else:
            # Tạo node ID tạm thời (số âm để phân biệt với node OSM)
            # Sử dụng hash để tạo ID duy nhất
            temp_node_id = -abs(hash((best_lat, best_lng)) % (10**9))
            return temp_node_id, best_lat, best_lng, best_edge
    
    # Nếu không tìm được điểm trên cạnh trong phạm vi, fallback về tìm node gần nhất
    # Tăng max_distance để tìm node gần nhất (không giới hạn quá chặt)
    nearest_node = find_nearest_node(nodes, lat, lng, max_distance_m=10000.0)
    if nearest_node is None:
        # Nếu vẫn không tìm được, thử không giới hạn khoảng cách
        nearest_node = find_nearest_node(nodes, lat, lng, max_distance_m=float('inf'))
    return nearest_node, lat, lng, None


def add_temp_node_to_graph(graph: Dict[int, List[Tuple[int, float]]], 
                           nodes: Dict[int, tuple], temp_node_id: int, 
                           temp_lat: float, temp_lng: float, edge_nodes: Tuple[int, int]):
    """
    Thêm node tạm thời vào đồ thị và kết nối với 2 node của cạnh.
    Xử lý trường hợp cạnh đã bị chia nhỏ bởi node tạm thời khác.
    
    Args:
        graph: Đồ thị dạng adjacency list (sẽ được cập nhật)
        nodes: Dictionary chứa tọa độ các node (sẽ được cập nhật)
        temp_node_id: ID của node tạm thời (số âm)
        temp_lat, temp_lng: Tọa độ của node tạm thời
        edge_nodes: Tuple (u, v) của cạnh cần kết nối
    """
    u, v = edge_nodes
    
    # Kiểm tra xem cạnh (u, v) còn tồn tại không
    u_has_v = any(neighbor == v for neighbor, _ in graph.get(u, []))
    v_has_u = any(neighbor == u for neighbor, _ in graph.get(v, []))
    
    # Thêm node tạm vào nodes dictionary
    nodes[temp_node_id] = (temp_lat, temp_lng)
    
    # Khởi tạo danh sách neighbors cho node tạm
    graph[temp_node_id] = []
    
    # Tính khoảng cách từ node tạm đến 2 node của cạnh
    lat_u, lng_u = nodes[u]
    lat_v, lng_v = nodes[v]
    
    dist_to_u = haversine_distance(temp_lat, temp_lng, lat_u, lng_u)
    dist_to_v = haversine_distance(temp_lat, temp_lng, lat_v, lng_v)
    
    # Nếu cạnh (u, v) còn tồn tại, thay thế bằng 2 cạnh mới
    if u_has_v and v_has_u:
        # Xóa cạnh cũ giữa u và v
        graph[u] = [(neighbor, weight) for neighbor, weight in graph[u] if neighbor != v]
        graph[v] = [(neighbor, weight) for neighbor, weight in graph[v] if neighbor != u]
        
        # Thêm cạnh mới từ u và v đến node tạm
        graph[u].append((temp_node_id, dist_to_u))
        graph[v].append((temp_node_id, dist_to_v))
        graph[temp_node_id].append((u, dist_to_u))
        graph[temp_node_id].append((v, dist_to_v))
    else:
        # Cạnh đã bị chia nhỏ, tìm node trung gian gần nhất
        # Tìm node trung gian trên đường từ u đến v
        best_intermediate = None
        best_dist_to_temp = float('inf')
        
        # Tìm trong neighbors của u
        for neighbor, weight in graph.get(u, []):
            if neighbor < 0:  # Node tạm thời
                neighbor_lat, neighbor_lng = nodes[neighbor]
                # Kiểm tra xem node này có nằm trên đường từ u đến v không
                dist_to_temp = haversine_distance(temp_lat, temp_lng, neighbor_lat, neighbor_lng)
                if dist_to_temp < best_dist_to_temp:
                    best_dist_to_temp = dist_to_temp
                    best_intermediate = neighbor
        
        # Nếu tìm thấy node trung gian, kết nối với nó thay vì u và v trực tiếp
        if best_intermediate is not None:
            intermediate_lat, intermediate_lng = nodes[best_intermediate]
            dist_to_intermediate = haversine_distance(temp_lat, temp_lng, intermediate_lat, intermediate_lng)
            
            # Kết nối node tạm với node trung gian
            graph[temp_node_id].append((best_intermediate, dist_to_intermediate))
            graph[best_intermediate].append((temp_node_id, dist_to_intermediate))
        else:
            # Fallback: kết nối với cả u và v
            graph[u].append((temp_node_id, dist_to_u))
            graph[v].append((temp_node_id, dist_to_v))
            graph[temp_node_id].append((u, dist_to_u))
            graph[temp_node_id].append((v, dist_to_v))


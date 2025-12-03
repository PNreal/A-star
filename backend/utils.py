"""
Các hàm tiện ích cho tính toán khoảng cách và đường đi.
"""
import math
from typing import Dict, List


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách thực tế giữa 2 điểm trên Trái Đất bằng công thức Haversine.
    Trả về khoảng cách tính bằng mét.
    """
    R = 6371000  # Bán kính Trái Đất (mét)
    
    # Chuyển đổi độ sang radian
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Công thức Haversine
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def calculate_path_distance(path: List[int], nodes: Dict[int, tuple]) -> float:
    """
    Tính tổng độ dài đường đi (mét) từ danh sách các node.
    """
    if len(path) < 2:
        return 0.0
    
    total_distance = 0.0
    for i in range(len(path) - 1):
        node1 = path[i]
        node2 = path[i + 1]
        lat1, lon1 = nodes[node1]
        lat2, lon2 = nodes[node2]
        total_distance += haversine_distance(lat1, lon1, lat2, lon2)
    
    return total_distance


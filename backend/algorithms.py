"""
Các thuật toán tìm đường ngắn nhất trên đồ thị.
"""
import heapq
from collections import deque
from typing import Dict, List, Tuple

from utils import haversine_distance


def reconstruct_path(prev: Dict[int, int], start: int, end: int) -> List[int]:
    """
    Tái tạo đường đi từ dictionary parent.
    
    Args:
        prev: Dictionary chứa parent của mỗi node
        start: Node bắt đầu
        end: Node kết thúc
        
    Returns:
        List[int]: Danh sách các node từ start đến end, hoặc [] nếu không tìm được
    """
    path = []
    current = end
    while current is not None:
        path.append(current)
        current = prev.get(current)
    path.reverse()
    if path[0] == start:
        return path
    return []


def dijkstra(graph: Dict[int, List[Tuple[int, float]]], nodes: Dict[int, tuple], 
             start_node: int, end_node: int, return_stats: bool = False):
    """
    Thuật toán Dijkstra với khả năng trả về thống kê.
    
    Args:
        graph: Đồ thị dạng adjacency list
        nodes: Dictionary chứa tọa độ các node
        start_node: Node bắt đầu
        end_node: Node kết thúc
        return_stats: Có trả về thống kê không
        
    Returns:
        (path, stats) nếu return_stats=True, else chỉ path
    """
    # Kiểm tra start_node và end_node có trong graph không
    if start_node not in graph or end_node not in graph:
        if return_stats:
            return [], {"nodes_explored": 0}
        return []
    
    dist = {node: float('inf') for node in graph}
    prev = {node: None for node in graph}
    dist[start_node] = 0
    pq = [(0, start_node)]
    nodes_explored = 0
    visited = set()

    while pq:
        d, u = heapq.heappop(pq)
        
        if u == end_node:
            break
            
        if u in visited:
            continue
            
        visited.add(u)
        nodes_explored += 1
        
        if u not in graph:
            continue
            
        for v, w in graph[u]:
            if v in visited:
                continue
            alt = dist[u] + w
            if alt < dist[v]:
                dist[v] = alt
                prev[v] = u
                heapq.heappush(pq, (alt, v))

    path = reconstruct_path(prev, start_node, end_node)
    if return_stats:
        return path, {"nodes_explored": nodes_explored}
    return path


def astar(graph: Dict[int, List[Tuple[int, float]]], nodes: Dict[int, tuple], 
          start_node: int, end_node: int, return_stats: bool = False):
    """
    Thuật toán A* với khả năng trả về thống kê.
    Sử dụng Haversine distance làm heuristic.
    
    Args:
        graph: Đồ thị dạng adjacency list
        nodes: Dictionary chứa tọa độ các node
        start_node: Node bắt đầu
        end_node: Node kết thúc
        return_stats: Có trả về thống kê không
        
    Returns:
        (path, stats) nếu return_stats=True, else chỉ path
    """
    # Kiểm tra start_node và end_node có trong graph không
    if start_node not in graph or end_node not in graph:
        if return_stats:
            return [], {"nodes_explored": 0}
        return []
    
    def heuristic(a: int, b: int) -> float:
        """Heuristic cho A* sử dụng Haversine để ước lượng khoảng cách"""
        if a not in nodes or b not in nodes:
            return float('inf')
        lat1, lon1 = nodes[a]
        lat2, lon2 = nodes[b]
        return haversine_distance(lat1, lon1, lat2, lon2)

    open_set = [(0, start_node)]
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
            if return_stats:
                return path, {"nodes_explored": nodes_explored}
            return path
        
        if current in closed_set:
            continue
        
        closed_set.add(current)
        nodes_explored += 1
        
        if current not in graph:
            continue
            
        for neighbor, weight in graph[current]:
            if neighbor in closed_set:
                continue
                
            tentative_g = g_score[current] + weight
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, end_node)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    if return_stats:
        return [], {"nodes_explored": nodes_explored}
    return []


def bfs(graph: Dict[int, List[Tuple[int, float]]], nodes: Dict[int, tuple], 
        start_node: int, end_node: int, return_stats: bool = False):
    """
    Thuật toán BFS (Breadth-First Search) với khả năng trả về thống kê.
    
    Args:
        graph: Đồ thị dạng adjacency list
        nodes: Dictionary chứa tọa độ các node
        start_node: Node bắt đầu
        end_node: Node kết thúc
        return_stats: Có trả về thống kê không
        
    Returns:
        (path, stats) nếu return_stats=True, else chỉ path
    """
    # Kiểm tra start_node và end_node có trong graph không
    if start_node not in graph or end_node not in graph:
        if return_stats:
            return [], {"nodes_explored": 0}
        return []
    
    queue = deque([start_node])
    visited = {start_node}
    parent = {start_node: None}
    nodes_explored = 0
    
    while queue:
        u = queue.popleft()
        nodes_explored += 1
        
        if u == end_node:
            path = reconstruct_path(parent, start_node, end_node)
            if return_stats:
                return path, {"nodes_explored": nodes_explored}
            return path
        
        if u not in graph:
            continue
            
        for v, _ in graph[u]:
            if v not in visited:
                visited.add(v)
                parent[v] = u
                queue.append(v)
    
    if return_stats:
        return [], {"nodes_explored": nodes_explored}
    return []


def dfs(graph: Dict[int, List[Tuple[int, float]]], nodes: Dict[int, tuple], 
        start_node: int, end_node: int, return_stats: bool = False):
    """
    Thuật toán DFS (Depth-First Search) với khả năng trả về thống kê.
    
    Args:
        graph: Đồ thị dạng adjacency list
        nodes: Dictionary chứa tọa độ các node
        start_node: Node bắt đầu
        end_node: Node kết thúc
        return_stats: Có trả về thống kê không
        
    Returns:
        (path, stats) nếu return_stats=True, else chỉ path
    """
    # Kiểm tra start_node và end_node có trong graph không
    if start_node not in graph or end_node not in graph:
        if return_stats:
            return [], {"nodes_explored": 0}
        return []
    
    stack = [start_node]
    visited = set()
    parent = {start_node: None}
    nodes_explored = 0
    
    while stack:
        u = stack.pop()
        
        if u == end_node:
            path = reconstruct_path(parent, start_node, end_node)
            if return_stats:
                return path, {"nodes_explored": nodes_explored}
            return path
            
        if u in visited:
            continue
            
        visited.add(u)
        nodes_explored += 1
        
        if u not in graph:
            continue
            
        for v, _ in graph[u]:
            if v not in visited:
                parent[v] = u
                stack.append(v)
    
    if return_stats:
        return [], {"nodes_explored": nodes_explored}
    return []


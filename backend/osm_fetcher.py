"""
Module để lấy dữ liệu OpenStreetMap từ Overpass API.
"""
import requests

from models import BBox


def fetch_osm_data(bbox: BBox) -> dict:
    """
    Gọi Overpass API để lấy dữ liệu OSM trong bounding box.
    
    Args:
        bbox: Bounding box chứa tọa độ vùng cần lấy dữ liệu
        
    Returns:
        dict: Dữ liệu OSM dạng JSON từ Overpass API
        
    Raises:
        requests.exceptions.RequestException: Nếu có lỗi khi gọi API
    """
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:25];
    (
      way["highway"]({bbox.south},{bbox.west},{bbox.north},{bbox.east});
      node(w);
    );
    out body;
    """
    response = requests.post(overpass_url, data=overpass_query, timeout=30)
    response.raise_for_status()
    return response.json()


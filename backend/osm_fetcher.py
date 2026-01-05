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
    # Danh sách các Overpass API servers (fallback nếu server chính bị lỗi)
    overpass_urls = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]
    
    overpass_query = f"""
    [out:json][timeout:25];
    (
      way["highway"]({bbox.south},{bbox.west},{bbox.north},{bbox.east});
      node(w);
    );
    out body;
    """
    
    last_error = None
    for url in overpass_urls:
        try:
            print(f"[DEBUG] Trying Overpass API: {url}")
            response = requests.post(url, data=overpass_query, timeout=30)
            response.raise_for_status()
            data = response.json()
            print(f"[DEBUG] Success! Got {len(data.get('elements', []))} elements")
            return data
        except requests.exceptions.RequestException as e:
            print(f"[DEBUG] Failed with {url}: {str(e)}")
            last_error = e
            continue
    
    # Nếu tất cả servers đều fail
    raise last_error or Exception("Không thể kết nối đến Overpass API")


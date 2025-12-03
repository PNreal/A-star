from pydantic import BaseModel


class Point(BaseModel):
    lat: float
    lng: float


class BBox(BaseModel):
    north: float
    south: float
    east: float
    west: float


class PathRequest(BaseModel):
    start: Point
    end: Point
    bbox: BBox
    algorithm: str = "dijkstra"


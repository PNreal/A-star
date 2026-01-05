import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import GridVisualizer from './GridVisualizer';
import AlgorithmInfo from './AlgorithmInfo';
import DraggableResizablePanel from './DraggableResizablePanel';

// --- Fix lỗi hiển thị icon mặc định của Leaflet trong Vite ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});
// -------------------------------------------------------------

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapView() {
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State mới cho chức năng tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');

  // State mới để lưu thuật toán được chọn (mặc định là Dijkstra)
  const [algorithm, setAlgorithm] = useState('dijkstra');
  
  // State cho tính năng so sánh
  const [comparisonResults, setComparisonResults] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  
  const mapRef = useRef(null);
  
  // Màu sắc cho từng thuật toán
  const algorithmColors = {
    dijkstra: '#007bff',  // Xanh dương
    astar: '#28a745',      // Xanh lá
    bfs: '#ffc107',        // Vàng
    dfs: '#dc3545'         // Đỏ
  };

  const handleMapClick = (latlng) => {
    if (!startPoint) {
      setStartPoint(latlng);
    } else if (!endPoint) {
      setEndPoint(latlng);
    } else {
      console.log("Đã chọn đủ điểm start và end. Vui lòng Reset để chọn lại.");
    }
  };

  // Hàm xử lý tìm kiếm địa điểm qua API Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Gọi API Nominatim của OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];
        
        // Di chuyển bản đồ đến vị trí tìm được
        if (mapRef.current) {
          mapRef.current.setView(newCenter, 16);
          // Hoặc dùng flyTo cho mượt: mapRef.current.flyTo(newCenter, 16);
        }
      } else {
        alert('Không tìm thấy địa điểm này!');
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
      alert("Lỗi khi kết nối đến dịch vụ tìm kiếm.");
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoute = async () => {
    if (!startPoint || !endPoint || !mapRef.current) return;

    setLoading(true);
    // Xóa kết quả so sánh khi tìm đường đơn lẻ
    setComparisonResults(null);
    setShowComparison(false);

    const bounds = mapRef.current.getBounds();
    const bbox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    try {
      const response = await fetch('http://localhost:3000/api/find-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startPoint,
          end: endPoint,
          bbox: bbox,
          algorithm: algorithm // Gửi thêm loại thuật toán lên backend
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.detail || 'Không thể tìm thấy đường đi';
        console.error("Backend error:", errorMsg);
        throw new Error(errorMsg);
      }
      
      if (data && data.path) {
        setPath(data.path);
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra khi tìm đường!");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStartPoint(null);
    setEndPoint(null);
    setPath([]);
    setComparisonResults(null);
    setShowComparison(false);
  };

  const handleCompareAlgorithms = async () => {
    if (!startPoint || !endPoint || !mapRef.current) return;

    setLoading(true);
    setShowComparison(true);

    const bounds = mapRef.current.getBounds();
    const bbox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    try {
      const response = await fetch('http://localhost:3000/api/compare-algorithms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startPoint,
          end: endPoint,
          bbox: bbox
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể so sánh các thuật toán');
      }

      const data = await response.json();
      setComparisonResults(data);
      
      // Xóa đường đi cũ
      setPath([]);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra khi so sánh các thuật toán!");
      setShowComparison(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="controls">
        {/* Khu vực tìm kiếm */}
        <div className="search-container">
          <input 
            type="text" 
            className="search-input"
            placeholder="Tìm địa điểm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="btn-search"
            onClick={handleSearch} 
            disabled={loading}
          >
            Tìm
          </button>
        </div>

        {/* Dropdown chọn thuật toán */}
        <select 
          className="algorithm-select"
          value={algorithm} 
          onChange={(e) => setAlgorithm(e.target.value)}
          disabled={loading}
        >
          <option value="dijkstra">Dijkstra</option>
          <option value="astar">A* (A-Star)</option>
          <option value="bfs">BFS (Breadth-First Search)</option>
          <option value="dfs">DFS (Depth-First Search)</option>
        </select>

        <button 
          className="btn-start" 
          onClick={handleFindRoute}
          disabled={!startPoint || !endPoint || loading}
        >
          {loading ? 'Đang tìm...' : 'Tìm đường'}
        </button>

        <button 
          className="btn-compare" 
          onClick={handleCompareAlgorithms}
          disabled={!startPoint || !endPoint || loading}
        >
          {loading ? 'Đang so sánh...' : 'So sánh'}
        </button>
        
        <button className="btn-reset" onClick={handleReset} disabled={loading}>
          Reset
        </button>

        <div className="status-text">
          {!startPoint && "Chọn điểm Start"}
          {startPoint && !endPoint && "Chọn điểm End"}
          {startPoint && endPoint && !path.length && !comparisonResults && `Sẵn sàng chạy ${algorithm.toUpperCase()}`}
          {comparisonResults && `Đã so sánh ${comparisonResults.summary.successful_algorithms} thuật toán`}
        </div>
      </div>

      <MapContainer 
        center={[21.000061, 105.845361]} 
        zoom={16} 
        className="map-container"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ClickHandler onMapClick={handleMapClick} />

        {startPoint && (
          <Marker position={startPoint}>
            <Popup>Start</Popup>
          </Marker>
        )}

        {endPoint && (
          <Marker position={endPoint}>
            <Popup>End</Popup>
          </Marker>
        )}

        {/* Hiển thị đường đi từ thuật toán đơn lẻ (chỉ khi không có so sánh) */}
        {path.length > 0 && !comparisonResults && (
          <Polyline 
            positions={path} 
            color={algorithmColors[algorithm] || "blue"} 
            weight={5} 
            opacity={0.7} 
          />
        )}

        {/* Hiển thị đường đi từ so sánh (chỉ khi có kết quả so sánh) */}
        {comparisonResults && comparisonResults.results && 
          Object.entries(comparisonResults.results).map(([algoName, result]) => {
            if (result.success && result.path && result.path.length > 0) {
              return (
                <Polyline 
                  key={algoName}
                  positions={result.path} 
                  color={algorithmColors[algoName] || "#666"} 
                  weight={4} 
                  opacity={0.6}
                />
              );
            }
            return null;
          })
        }
      </MapContainer>

      {/* Panel hiển thị kết quả so sánh */}
      {showComparison && comparisonResults && (
        <DraggableResizablePanel
          title="Kết quả so sánh các thuật toán"
          onClose={() => setShowComparison(false)}
        >
          {comparisonResults.summary && (
            <div className="summary-section">
              <div className="summary-item">
                <span className="summary-label">Nhanh nhất:</span>
                <span className="summary-value">{comparisonResults.summary.fastest?.toUpperCase() || 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Hiệu quả nhất:</span>
                <span className="summary-value">{comparisonResults.summary.most_efficient?.toUpperCase() || 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Đường ngắn nhất:</span>
                <span className="summary-value">{comparisonResults.summary.shortest_path?.toUpperCase() || 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Thuật toán</th>
                  <th>Thời gian (ms)</th>
                  <th>Node đã duyệt</th>
                  <th>Độ dài (m)</th>
                  <th>Số node</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparisonResults.results || {}).map(([algoName, result]) => (
                  <tr key={algoName} className={result.success ? 'success' : 'error'}>
                    <td>
                      <span 
                        className="algorithm-badge" 
                        style={{ backgroundColor: algorithmColors[algoName] || '#666' }}
                      >
                        {algoName.toUpperCase()}
                      </span>
                    </td>
                    <td>{result.success ? result.execution_time_ms : '-'}</td>
                    <td>{result.success ? result.nodes_explored : '-'}</td>
                    <td>{result.success ? result.path_length_m : '-'}</td>
                    <td>{result.success ? result.path_nodes_count : '-'}</td>
                    <td>
                      {result.success ? (
                        <span className="status-success">Thành công</span>
                      ) : (
                        <span className="status-error">{result.error || 'Thất bại'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DraggableResizablePanel>
      )}
    </>
  );
}

function App() {
  const [currentView, setCurrentView] = useState('info'); // 'info', 'grid', or 'map'

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${currentView === 'info' ? 'active' : ''}`}
          onClick={() => setCurrentView('info')}
        >
          Thông Tin Thuật Toán
        </button>
        <button
          className={`tab-button ${currentView === 'grid' ? 'active' : ''}`}
          onClick={() => setCurrentView('grid')}
        >
          Đồ thị Lưới
        </button>
        <button
          className={`tab-button ${currentView === 'map' ? 'active' : ''}`}
          onClick={() => setCurrentView('map')}
        >
          Bản đồ OSM
        </button>
      </div>

      {/* Render current view */}
      {currentView === 'info' && <AlgorithmInfo />}
      {currentView === 'grid' && <GridVisualizer />}
      {currentView === 'map' && <MapView />}
    </div>
  );
}

export default App;
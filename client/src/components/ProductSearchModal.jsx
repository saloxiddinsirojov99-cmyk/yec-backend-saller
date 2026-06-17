import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import './ProductSearchModal.css';

export default function ProductSearchModal({ products, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const q = search.toLowerCase().trim();
    const filtered = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const designCode = (p.name || '').split(' ').pop()?.toLowerCase() || '';
      const description = (p.description || '').toLowerCase();
      const size = (p.size || '').toLowerCase();

      return name.includes(q) ||
             designCode.includes(q) ||
             description.includes(q) ||
             size.includes(q);
    });

    setResults(filtered.slice(0, 50)); // show max 50 results
    setSelectedIndex(-1);
  }, [search, products]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (product) => {
    onSelect(product);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('.product-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-search-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mahsulot qidirish</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nomi, gul kodi yoki o'lcham bo'yicha qidirish..."
            className="search-input"
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="results-count">
          {search ? `${results.length} ta mahsulot topildi` : 'Izlash uchun matn kiriting'}
        </div>

        <div className="results-list" ref={resultsRef}>
          {results.length === 0 && search ? (
            <div className="no-results">Mahsulot topilmadi</div>
          ) : (
            results.map((product, index) => {
              const designCode = product.name?.split(' ').pop() || '';
              const collection = product.name?.split(' ').slice(0, -1).join(' ') || product.name;
              return (
                <div
                  key={product.id}
                  className={`product-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="product-image-placeholder">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <div className="placeholder-icon">🖼️</div>
                    )}
                  </div>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-details">
                      <span className="product-collection">{collection}</span>
                      <span className="product-design-code">Gul kodi: {designCode}</span>
                    </div>
                    <div className="product-price">{product.price.toLocaleString()} so'm</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer">
          <span className="hint">
            ↑↓ tanlash, Enter - tasdiqlash, Esc - yopish
          </span>
        </div>
      </div>
    </div>
  );
}
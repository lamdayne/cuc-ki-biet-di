import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Move,
} from 'lucide-react';

export default function ImageCropModal({
  isOpen,
  imageFile,
  onClose,
  onConfirm,
  categoryName = 'Tên Danh Mục',
  isUploading = false,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState(3.2); // Banner ratio (e.g. 16:5 ~ 3.2)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });

  const viewportRef = useRef(null);
  const imageRef = useRef(null);

  // Load image object URL when file changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  // Viewport dimensions
  const getViewportDimensions = useCallback(() => {
    if (!viewportRef.current) return { width: 520, height: 520 / aspectRatio };
    const rect = viewportRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, [aspectRatio]);

  // Fit and Fill scale calculations
  const calculateScalePresets = useCallback(() => {
    const { width: vw, height: vh } = getViewportDimensions();
    const isRotated = rotation === 90 || rotation === 270;
    const iw = isRotated ? naturalSize.height : naturalSize.width;
    const ih = isRotated ? naturalSize.width : naturalSize.height;

    if (!iw || !ih || !vw || !vh) return { fit: 1, fill: 1 };

    const scaleX = vw / iw;
    const scaleY = vh / ih;

    const fit = Math.min(scaleX, scaleY);
    const fill = Math.max(scaleX, scaleY);

    return { fit, fill };
  }, [getViewportDimensions, naturalSize, rotation]);

  // Auto-fit initial scale once image loads
  useEffect(() => {
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      const { fit } = calculateScalePresets();
      setScale(fit > 0 ? fit : 1);
      setOffset({ x: 0, y: 0 });
    }
  }, [naturalSize, aspectRatio, calculateScalePresets]);

  // Handle Drag / Pan (Mouse)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Drag / Pan (Touch)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStartRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => {
      const next = prev * zoomFactor;
      return Math.min(Math.max(next, 0.1), 5);
    });
  };

  // Quick Action Buttons
  const handleFit = () => {
    const { fit } = calculateScalePresets();
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  };

  const handleFill = () => {
    const { fill } = calculateScalePresets();
    setScale(fill);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    const { fit } = calculateScalePresets();
    setScale(fit);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Export cropped canvas
  const handleCropAndConfirm = async () => {
    if (!imageRef.current || !naturalSize.width || !naturalSize.height) return;

    setIsProcessing(true);

    try {
      const { width: vw, height: vh } = getViewportDimensions();

      // Desired export resolution (Sharp, crisp banner 1200px width)
      const exportWidth = 1200;
      const exportHeight = Math.round(exportWidth / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Không thể khởi tạo bộ xử lý Canvas');

      // 1. Fill default warm bakery background for any empty border space
      ctx.fillStyle = '#EAD0B8';
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      // 2. High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 3. Coordinate conversion ratio from viewport to export canvas
      const ratio = exportWidth / vw;

      ctx.save();
      // Move to center of canvas + scaled offset
      ctx.translate(
        exportWidth / 2 + offset.x * ratio,
        exportHeight / 2 + offset.y * ratio
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * ratio, scale * ratio);

      // Draw image centered at (0, 0)
      ctx.drawImage(
        imageRef.current,
        -naturalSize.width / 2,
        -naturalSize.height / 2,
        naturalSize.width,
        naturalSize.height
      );
      ctx.restore();

      // Convert to Blob and File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            alert('Lỗi tạo ảnh sau khi cắt');
            return;
          }

          const fileName = `banner-cropped-${Date.now()}.jpg`;
          const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
          setIsProcessing(false);
          onConfirm(croppedFile);
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Crop error:', err);
      setIsProcessing(false);
      alert('Có lỗi xảy ra khi cắt ảnh: ' + err.message);
    }
  };

  if (!isOpen || !imageFile) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-dialog crop-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', padding: '24px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>
              CẮT & ĐIỀU CHỈNH ẢNH BANNER
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Kéo di chuyển ảnh, lăn chuột hoặc dùng thanh trượt để phóng to / thu nhỏ.
            </p>
          </div>
          <button
            type="button"
            className="btn-remove-item"
            onClick={onClose}
            title="Đóng"
            disabled={isProcessing || isUploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Tỷ lệ khung:
            </span>
            <button
              type="button"
              className={`crop-ratio-btn ${aspectRatio === 3.2 ? 'active' : ''}`}
              onClick={() => setAspectRatio(3.2)}
            >
              Banner Chuẩn (3.2:1)
            </button>
            <button
              type="button"
              className={`crop-ratio-btn ${aspectRatio === 16 / 9 ? 'active' : ''}`}
              onClick={() => setAspectRatio(16 / 9)}
            >
              16:9
            </button>
            <button
              type="button"
              className={`crop-ratio-btn ${aspectRatio === 2.5 ? 'active' : ''}`}
              onClick={() => setAspectRatio(2.5)}
            >
              Rộng (2.5:1)
            </button>
          </div>

          {/* Toggle Title Overlay Preview */}
          <button
            type="button"
            onClick={() => setShowPreviewOverlay(!showPreviewOverlay)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: showPreviewOverlay ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '8px',
              backgroundColor: showPreviewOverlay ? 'var(--color-primary-light)' : 'transparent',
            }}
            title="Xem trước vị trí chữ tên danh mục hiển thị trên web"
          >
            {showPreviewOverlay ? <Eye size={15} /> : <EyeOff size={15} />}
            Xem trước lớp chữ
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${aspectRatio}`,
            maxHeight: '340px',
            backgroundColor: '#1E140F',
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            border: '2px dashed var(--color-primary)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Image Being Cropped */}
          {imageSrc && (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                maxWidth: 'none',
                maxHeight: 'none',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              }}
            />
          )}

          {/* Rule-of-thirds Grid Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              border: '1px solid rgba(255,255,255,0.25)',
              zIndex: 3,
            }}
          >
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.2)' }} />
            <div />
          </div>

          {/* Optional Category Title Overlay Preview (matches website look) */}
          {showPreviewOverlay && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(0deg, rgba(74, 44, 26, 0.72) 0%, rgba(74, 44, 26, 0.1) 70%)',
                zIndex: 4,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '16px 20px',
              }}
            >
              <h2
                style={{
                  color: '#FFFFFF',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  margin: 0,
                }}
              >
                {categoryName || 'Tên Danh Mục'}
              </h2>
            </div>
          )}

          {/* Drag hint badge */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#FFF',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <Move size={12} /> Kéo để căn chỉnh
          </div>
        </div>

        {/* Zoom & Control Toolbar */}
        <div
          style={{
            marginTop: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--card-border)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(prev * 0.9, 0.05))}
              className="crop-tool-btn"
              title="Thu nhỏ"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min="0.05"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: 'var(--color-primary)',
              }}
            />

            <button
              type="button"
              onClick={() => setScale((prev) => Math.min(prev * 1.1, 4))}
              className="crop-tool-btn"
              title="Phóng to"
            >
              <ZoomIn size={16} />
            </button>

            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                minWidth: '45px',
                textAlign: 'right',
                color: 'var(--color-primary)',
              }}
            >
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Fast Preset Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              borderTop: '1px solid rgba(122, 82, 56, 0.1)',
              paddingTop: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="crop-tool-btn"
                onClick={handleFit}
                title="Thu nhỏ để thấy toàn bộ ảnh"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                <Minimize2 size={14} /> Thu vừa khung
              </button>
              <button
                type="button"
                className="crop-tool-btn"
                onClick={handleFill}
                title="Phóng to lấp đầy khung ảnh"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                <Maximize2 size={14} /> Lấp đầy khung
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="crop-tool-btn"
                onClick={handleRotate}
                title="Xoay 90 độ"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              >
                <RotateCw size={14} /> Xoay
              </button>
              <button
                type="button"
                className="crop-tool-btn"
                onClick={handleReset}
                title="Đặt lại về vị trí giữa"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              >
                <RefreshCw size={14} /> Đặt lại
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions" style={{ marginTop: '18px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isProcessing || isUploading}
          >
            HỦY
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCropAndConfirm}
            disabled={isProcessing || isUploading}
          >
            {isProcessing || isUploading ? (
              'ĐANG XỬ LÝ...'
            ) : (
              <>
                <Check size={18} /> CẮT & TẢI LÊN
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

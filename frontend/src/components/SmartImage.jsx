import React, { useState } from 'react';
import { Image as ImageIcon, AlertCircle, ZoomIn } from 'lucide-react';

export default function SmartImage({
  src,
  fallbackSrc,
  alt = 'AGRITRUST Visual Asset',
  className = '',
  style = {},
  aspectRatio = '16/9',
  allowZoom = false,
  badge = null,
  caption = null
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  return (
    <>
      <div 
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspectRatio,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#F1F5F9',
          border: '1px solid var(--border-subtle)',
          cursor: allowZoom ? 'pointer' : 'default',
          ...style
        }}
        className={`smart-image-container ${className}`}
        onClick={() => {
          if (allowZoom && !hasError) setShowLightbox(true);
        }}
      >
        {/* Placeholder skeleton before load */}
        {!isLoaded && !hasError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonPulse 1.5s infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8'
          }}>
            <ImageIcon size={20} className="animate-pulse" />
          </div>
        )}

        {/* Fallback rendering if image completely fails */}
        {hasError ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            padding: '16px',
            textAlign: 'center',
            fontSize: '12px'
          }}>
            <ImageIcon size={28} color="#94A3B8" style={{ marginBottom: '6px' }} />
            <span style={{ fontWeight: '600', color: '#475569' }}>{alt}</span>
            <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Visual asset ready</span>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              opacity: isLoaded ? 1 : 0
            }}
          />
        )}

        {/* Optional Badge Overlay */}
        {badge && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 2
          }}>
            {badge}
          </div>
        )}

        {/* Zoom Hint Icon */}
        {allowZoom && isLoaded && !hasError && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(15, 23, 42, 0.75)',
            color: '#FFFFFF',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(4px)',
            opacity: 0.9
          }}>
            <ZoomIn size={12} />
            <span>Enlarge</span>
          </div>
        )}

        {/* Optional Caption */}
        {caption && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.85))',
            color: '#FFFFFF',
            padding: '16px 12px 6px 12px',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {caption}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(6px)'
          }}
          onClick={() => setShowLightbox(false)}
        >
          <div 
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-modal)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={currentSrc} 
              alt={alt} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                objectFit: 'contain',
                display: 'block' 
              }} 
            />
            <div style={{
              padding: '12px 16px',
              background: '#F8FAFC',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{alt}</div>
                {caption && <div style={{ fontSize: '11px', color: '#64748B' }}>{caption}</div>}
              </div>
              <button 
                type="button" 
                onClick={() => setShowLightbox(false)}
                className="btn btn-secondary btn-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

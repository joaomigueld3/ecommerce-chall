'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';

export default function ProductImage({ product, variant = 'card' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = product?.imageUrl && product.imageUrl !== failedUrl ? product.imageUrl : null;
  const initials = (product?.category || 'OS').slice(0, 2).toUpperCase();

  const wrapperClass = variant === 'detail'
    ? 'product-media product-media-lg'
    : variant === 'thumb'
      ? 'product-media product-media-thumb'
      : 'product-media';

  if (!src) {
    return (
      <div className={wrapperClass} aria-hidden="true">
        <span className="product-media-fallback">{initials}</span>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <img
        src={src}
        alt={product?.productName || 'Product image'}
        loading="lazy"
        className="product-media-img"
        onError={() => setFailedUrl(src)}
      />
    </div>
  );
}

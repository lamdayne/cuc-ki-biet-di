import React from 'react';
import ProductCard from './ProductCard';

export default function CategorySection({
  category,
  cartItems = {},
  onAddToCart,
  onUpdateQuantity,
}) {
  const hasBannerImage = Boolean(category.image_url && category.image_url.trim() !== '');

  return (
    <section className="category-section" id={`category-${category.slug}`}>
      <div className="category-banner-container">
        {hasBannerImage ? (
          <>
            <img
              src={category.image_url}
              alt={category.name}
              className="category-banner-img"
              loading="lazy"
            />
            <div className="category-banner-overlay" />
            <h2 className="category-banner-title">{category.name}</h2>
          </>
        ) : (
          <div className="category-banner-placeholder">
            <span style={{ fontSize: '2rem' }}>🍪</span>
            <h2>{category.name}</h2>
          </div>
        )}
      </div>

      <div className="products-grid">
        {(category.products || []).map((product) => {
          const qty = cartItems[product.id]?.quantity || 0;
          return (
            <ProductCard
              key={product.id}
              product={product}
              quantity={qty}
              onAdd={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          );
        })}
      </div>
    </section>
  );
}

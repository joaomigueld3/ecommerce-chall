'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useStore } from '@/features/store/StoreContext';
import {
  createProductQuestion,
  createProductReview,
  getProductById,
  getProductQuestions,
  getProductReviews,
  getRelatedProducts,
  markReviewHelpful,
} from '@/features/products/api';
import { addWishlistItem } from '@/features/wishlist/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import ProductImage from '@/components/ui/ProductImage';
import StarRating from '@/components/ui/StarRating';

function calcDiscountPercent(price, originalPrice) {
  const p = Number(price);
  const orig = Number(originalPrice);
  if (!orig || orig <= p) return 0;
  return Math.round(((orig - p) / orig) * 100);
}

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const { token, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { storeName, regionConfig, formatMoney, t } = useStore();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    summary: { ratingAvg: 0, ratingCount: 0, histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState(null);

  const [postalCode, setPostalCode] = useState('');
  const [shippingQuote, setShippingQuote] = useState(null);

  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  const [questionText, setQuestionText] = useState('');
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState(null);
  const [questionError, setQuestionError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [prod, revRes, qRes, relRes] = await Promise.all([
          getProductById(token, productId),
          getProductReviews(token, productId).catch(() => ({
            reviews: [],
            summary: { ratingAvg: 0, ratingCount: 0, histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
          })),
          getProductQuestions(token, productId).catch(() => ({ questions: [] })),
          getRelatedProducts(token, productId, 4).catch(() => ({ products: [] })),
        ]);
        if (ignore) return;
        setProduct(prod);
        setSelectedImageUrl(prod?.images?.[0]?.url || prod?.imageUrl || null);
        setSelectedVariantId(prod?.variants?.[0]?.variantId ?? null);
        setReviewsData(revRes);
        setQuestions(Array.isArray(qRes?.questions) ? qRes.questions : []);
        setRelated(Array.isArray(relRes?.products) ? relRes.products : []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 404 || err.status === 400) {
          setNotFound(true);
          return;
        }
        setError(err.message || 'Failed to load product.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, productId]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const list = Array.isArray(product.images) ? [...product.images] : [];
    if (product.imageUrl && !list.some((img) => img.url === product.imageUrl)) {
      list.unshift({ imageId: 'primary', url: product.imageUrl, altText: product.productName });
    }
    return list;
  }, [product]);

  if (loading) return <Loading message="Loading product..." />;
  if (notFound) {
    return (
      <section className="card">
        <h1>Product not found</h1>
        <EmptyState
          message={`No product found with id "${productId}".`}
          actionHref="/products"
          actionLabel="Back to products"
        />
      </section>
    );
  }
  if (error) return <ErrorMessage message={error} />;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const activeVariant = variants.find((v) => v.variantId === selectedVariantId) || null;
  const activePrice = activeVariant?.priceOverride ? Number(activeVariant.priceOverride) : Number(product.price);
  const activeStock = activeVariant ? Number(activeVariant.quantityInStock) : Number(product.quantityInStock);
  const activeSku = activeVariant?.sku || product.sku || `#${product.productId}`;
  const outOfStock = activeStock < 1;
  const discountPct = calcDiscountPercent(activePrice, product.originalPrice);
  const installmentValue = activePrice / 12;
  const specsEntries = product.specs && typeof product.specs === 'object' ? Object.entries(product.specs) : [];

  function resolveQty() {
    const parsed = Math.max(1, Math.floor(Number(quantity) || 1));
    return Math.min(parsed, Math.max(1, activeStock || 1));
  }

  function buildCartItem() {
    return {
      ...product,
      price: activePrice,
      productName: activeVariant ? `${product.productName} (${activeVariant.name})` : product.productName,
    };
  }

  function handleAdd() {
    const qty = resolveQty();
    addItem(buildCartItem(), qty);
    setAddedMsg(t.addedUnits(qty));
  }

  function handleBuyNow() {
    const qty = resolveQty();
    addItem(buildCartItem(), qty);
    router.push('/checkout');
  }

  async function handleSaveToWishlist() {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.productId}`)}`);
      return;
    }
    try {
      const res = await addWishlistItem(token, product.productId);
      setAddedMsg(res?.message || 'Saved to your wishlist.');
    } catch (err) {
      setAddedMsg(err.message || 'Could not save to wishlist.');
    }
  }

  function handleEstimateShipping(event) {
    event.preventDefault();
    const cleaned = postalCode.trim();
    if (!cleaned) return;
    const isFree = activePrice >= regionConfig.freeShippingThreshold;
    setShippingQuote({
      postalCode: cleaned,
      standardLabel: isFree ? 'FREE Standard Delivery (3–5 business days)' : `Standard: ${formatMoney(14.9)} (3–5 business days)`,
      expressLabel: `Express: ${formatMoney(29.9)} (1–2 business days)`,
    });
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewError(null);
    setReviewFeedback(null);
    setReviewSubmitting(true);
    try {
      await createProductReview(token, product.productId, reviewForm);
      setReviewForm({ rating: 5, title: '', comment: '' });
      setReviewFeedback('Thank you! Your review has been published.');
      const refreshed = await getProductReviews(token, product.productId);
      setReviewsData(refreshed);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleHelpfulVote(reviewId) {
    try {
      const res = await markReviewHelpful(token, product.productId, reviewId);
      setReviewsData((prev) => ({
        ...prev,
        reviews: prev.reviews.map((r) => (r.reviewId === reviewId ? res.review : r)),
      }));
    } catch {
      // ignore vote error
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    setQuestionError(null);
    setQuestionFeedback(null);
    setQuestionSubmitting(true);
    try {
      const res = await createProductQuestion(token, product.productId, { question: questionText });
      setQuestions((prev) => [res.question, ...prev]);
      setQuestionText('');
      setQuestionFeedback('Your question has been posted.');
    } catch (err) {
      setQuestionError(err.message || 'Failed to submit question.');
    } finally {
      setQuestionSubmitting(false);
    }
  }

  const displayProduct = { ...product, imageUrl: selectedImageUrl || product.imageUrl };

  return (
    <section className="stack-lg">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">{t.home}</Link>
        <span>/</span>
        <Link href="/products">{t.allProducts}</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/products?category=${encodeURIComponent(product.category)}`}>
              {product.category}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="muted">{product.productName}</span>
      </nav>

      <div className="pdp-3col">
        {/* Column 1: Interactive Gallery */}
        <div className="card pdp-gallery">
          <ProductImage product={displayProduct} variant="detail" />
          {gallery.length > 1 && (
            <div className="pdp-thumbs" role="group" aria-label="Product gallery">
              {gallery.map((img) => (
                <button
                  key={img.imageId || img.url}
                  type="button"
                  className={`pdp-thumb-btn ${selectedImageUrl === img.url ? 'pdp-thumb-active' : ''}`}
                  onClick={() => setSelectedImageUrl(img.url)}
                >
                  <ProductImage product={{ ...product, imageUrl: img.url }} variant="thumb" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Product Information, Pricing, Variants & Technical Specs */}
        <div className="card pdp-info">
          <div className="actions-row">
            {product.brand?.name && <span className="badge">{product.brand.name}</span>}
            {product.category && <span className="badge">{product.category}</span>}
            {product.isDealOfDay && <span className="amz-deal-tag">Deal of the Day</span>}
            {product.featured && <span className="badge">Featured</span>}
          </div>

          <h1>{product.productName}</h1>

          <div className="actions-row">
            <StarRating
              rating={reviewsData.summary?.ratingAvg || product.ratingAvg}
              count={reviewsData.summary?.ratingCount ?? product.ratingCount ?? 0}
              size="md"
            />
            <span className="muted">SKU: {activeSku}</span>
          </div>

          <div className="pdp-price-block">
            {discountPct > 0 && (
              <div className="actions-row">
                <span className="price-strike">{formatMoney(product.originalPrice)}</span>
                <span className="discount-pill">-{discountPct}% OFF</span>
              </div>
            )}
            <p className="price price-xl">{formatMoney(activePrice)}</p>
            <p className="muted">
              or up to 12x of <strong>{formatMoney(installmentValue)}</strong> (simulated)
            </p>
          </div>

          {variants.length > 0 && (
            <div className="stack">
              <strong>Select option:</strong>
              <div className="chip-row">
                {variants.map((variant) => (
                  <button
                    key={variant.variantId}
                    type="button"
                    className={`chip ${activeVariant?.variantId === variant.variantId ? 'chip-active' : ''}`}
                    onClick={() => setSelectedVariantId(variant.variantId)}
                  >
                    {variant.name}
                    {variant.priceOverride ? ` (${formatMoney(variant.priceOverride)})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pdp-description">
            <h2>{t.aboutThisItem}</h2>
            <p className="muted">{product.description || t.noDescription}</p>
          </div>

          {specsEntries.length > 0 && (
            <div className="stack">
              <h2>Technical Specifications</h2>
              <table className="table">
                <tbody>
                  {specsEntries.map(([key, val]) => (
                    <tr key={key}>
                      <th>{key}</th>
                      <td>{String(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Column 3: Buy Box */}
        <aside className="card pdp-buybox" aria-label="Purchase options">
          <p className="price price-xl">{formatMoney(activePrice)}</p>
          <p className={outOfStock ? 'stock-out' : 'stock-ok'}>
            {outOfStock ? t.outOfStock : t.inStockAvailable(activeStock)}
          </p>
          <p className="muted">{t.soldByOfficial(storeName)}</p>

          <form onSubmit={handleEstimateShipping} className="shipping-box">
            <label htmlFor="pdp-postal">
              Estimate shipping ({regionConfig.postalCodeLabel})
              <div className="actions-row">
                <input
                  id="pdp-postal"
                  type="text"
                  placeholder={regionConfig.postalCodeLabel}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary">
                  Check
                </button>
              </div>
            </label>
            {shippingQuote && (
              <div className="shipping-quote">
                <p><strong>{shippingQuote.standardLabel}</strong></p>
                <p className="muted">{shippingQuote.expressLabel}</p>
              </div>
            )}
          </form>

          {addedMsg && <p className="alert alert-success">{addedMsg}</p>}

          {!outOfStock && (
            <div className="stack">
              <label htmlFor="pdp-quantity" className="form-inline-label">
                <strong>{t.quantityLabel}</strong>
                <input
                  id="pdp-quantity"
                  type="number"
                  min={1}
                  max={activeStock}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-label="Quantity"
                />
              </label>

              <button type="button" className="btn amz-btn-primary btn-full" onClick={handleAdd}>
                {t.addToCart}
              </button>
              <button type="button" className="btn amz-btn-buy btn-full" onClick={handleBuyNow}>
                {t.buyNow}
              </button>
              <button type="button" className="btn btn-secondary btn-full" onClick={handleSaveToWishlist}>
                ♡ Save to Wishlist
              </button>
              <Link href="/cart" className="btn btn-secondary btn-full">
                {t.goToCart}
              </Link>
            </div>
          )}

          <p className="muted">
            Accepted ({regionConfig.code}): {regionConfig.paymentMethods.join(', ')}
          </p>
          <Link href="/products" className="link-accent">
            {t.backToCatalog}
          </Link>
        </aside>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="stack">
          <h2>Customers also viewed</h2>
          <div className="grid">
            {related.map((item) => (
              <article key={item.productId} className="card amz-product-card">
                <Link href={`/products/${item.productId}`}>
                  <ProductImage product={item} />
                </Link>
                <span className="badge">{item.category}</span>
                <h3>
                  <Link href={`/products/${item.productId}`} className="link-strong">
                    {item.productName}
                  </Link>
                </h3>
                <p className="price price-lg">{formatMoney(item.price)}</p>
                <Link href={`/products/${item.productId}`} className="btn btn-secondary">
                  {t.details}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Verified Reviews + Star Histogram */}
      <section className="card stack">
        <h2>Customer Reviews</h2>
        <div className="reviews-layout">
          <div className="stack">
            <StarRating
              rating={reviewsData.summary?.ratingAvg}
              count={reviewsData.summary?.ratingCount}
              size="lg"
            />
            <div className="histogram">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewsData.summary?.histogram?.[star] || 0;
                const total = reviewsData.summary?.ratingCount || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} className="histogram-row">
                    <span>{star}★</span>
                    <div className="histogram-track">
                      <div className="histogram-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="muted">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} className="form">
                <h3>Write a review</h3>
                {reviewFeedback && <p className="alert alert-success">{reviewFeedback}</p>}
                {reviewError && <p className="alert alert-error">{reviewError}</p>}
                <label htmlFor="rev-rating">
                  Rating
                  <select
                    id="rev-rating"
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm((c) => ({ ...c, rating: Number(e.target.value) }))}
                  >
                    <option value={5}>5 Stars — Excellent</option>
                    <option value={4}>4 Stars — Very Good</option>
                    <option value={3}>3 Stars — Average</option>
                    <option value={2}>2 Stars — Poor</option>
                    <option value={1}>1 Star — Terrible</option>
                  </select>
                </label>
                <label htmlFor="rev-title">
                  Headline
                  <input
                    id="rev-title"
                    type="text"
                    required
                    minLength={3}
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((c) => ({ ...c, title: e.target.value }))}
                  />
                </label>
                <label htmlFor="rev-comment">
                  Review
                  <textarea
                    id="rev-comment"
                    rows={3}
                    required
                    minLength={5}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((c) => ({ ...c, comment: e.target.value }))}
                  />
                </label>
                <button type="submit" className="btn amz-btn-primary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit review'}
                </button>
              </form>
            ) : (
              <p className="muted">
                <Link href={`/login?next=${encodeURIComponent(`/products/${product.productId}`)}`} className="link-accent">
                  Sign in
                </Link>{' '}
                to write a product review.
              </p>
            )}
          </div>

          <div className="stack">
            {reviewsData.reviews.length === 0 ? (
              <p className="muted">No reviews yet. Be the first to review this product!</p>
            ) : (
              reviewsData.reviews.map((rev) => (
                <article key={rev.reviewId} className="review-card">
                  <div className="actions-row">
                    <StarRating rating={rev.rating} />
                    <strong>{rev.title}</strong>
                    {rev.verifiedPurchase && <span className="verified-pill">Verified Purchase</span>}
                  </div>
                  <p className="muted">
                    By {rev.authorName} • {formatDate(rev.createdAt)}
                  </p>
                  <p>{rev.comment}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleHelpfulVote(rev.reviewId)}
                  >
                    Helpful ({rev.helpfulVotes || 0})
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Customer Questions & Answers */}
      <section className="card stack">
        <h2>Questions &amp; Answers</h2>
        {isAuthenticated ? (
          <form onSubmit={handleQuestionSubmit} className="actions-row">
            <input
              type="text"
              className="qa-input"
              placeholder="Have a question about this product? Ask here..."
              minLength={5}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
            <button type="submit" className="btn amz-btn-primary" disabled={questionSubmitting}>
              {questionSubmitting ? 'Posting...' : 'Ask question'}
            </button>
          </form>
        ) : (
          <p className="muted">
            <Link href={`/login?next=${encodeURIComponent(`/products/${product.productId}`)}`} className="link-accent">
              Sign in
            </Link>{' '}
            to ask a question.
          </p>
        )}
        {questionFeedback && <p className="alert alert-success">{questionFeedback}</p>}
        {questionError && <p className="alert alert-error">{questionError}</p>}

        {questions.length === 0 ? (
          <p className="muted">No questions asked yet.</p>
        ) : (
          <div className="stack">
            {questions.map((q) => (
              <article key={q.questionId} className="review-card">
                <p><strong>Q: {q.question}</strong></p>
                <p className="muted">Asked by {q.authorName} • {formatDate(q.createdAt)}</p>
                {q.answer ? (
                  <p className="qa-answer">
                    <strong>A:</strong> {q.answer}{' '}
                    <span className="muted">({q.answeredByName || storeName})</span>
                  </p>
                ) : (
                  <p className="muted">Awaiting store response...</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

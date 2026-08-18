import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchProductById, fetchProductReviews, submitReview, deleteReview } from '../services/productService';
import { getErrorMessage } from '../services/api';
import { formatPrice, finalPrice, formatDate } from '../utils/format';
import Spinner from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import RatingStars from '../components/common/RatingStars';
import ProductCard from '../components/products/ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, reviewRes] = await Promise.all([fetchProductById(id), fetchProductReviews(id)]);
      setProduct(prodRes.data.product);
      setRelated(prodRes.data.related);
      setReviews(reviewRes.data.reviews);
      setActiveImage(0);
      setQuantity(1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner full size="lg" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!product) return null;

  const price = finalPrice(product.price, product.discount);
  const outOfStock = product.stock <= 0;

  const handleAddToCart = async () => {
    if (!user) return navigate('/login');
    setAddMsg('');
    const res = await addItem(product._id, quantity);
    setAddMsg(res.success ? 'Added to cart!' : res.message);
  };

  const handleWishlist = () => {
    if (!user) return navigate('/login');
    toggleWishlist(product._id);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setReviewError('');
    setSubmittingReview(true);
    try {
      await submitReview(product._id, reviewForm);
      setReviewForm({ rating: 5, comment: '' });
      await load();
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(product._id, reviewId);
      await load();
    } catch (err) {
      setReviewError(getErrorMessage(err));
    }
  };

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length
  }));

  return (
    <div className="container-app py-6">
      <nav className="text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> /{' '}
        <Link to={`/products?category=${product.category?._id}`} className="hover:text-primary">{product.category?.name}</Link> /{' '}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="card p-4 mb-3 h-80 md:h-96 flex items-center justify-center bg-gray-50">
            <img src={product.images[activeImage]} alt={product.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex gap-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`h-16 w-16 rounded border-2 overflow-hidden ${idx === activeImage ? 'border-primary' : 'border-gray-200'}`}
              >
                <img src={img} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>

          {product.rating > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <RatingStars rating={product.rating} showBadge count={product.numReviews} />
              <span className="text-xs text-gray-500">{product.numReviews} ratings</span>
            </div>
          )}

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">{formatPrice(price)}</span>
            {product.discount > 0 && (
              <>
                <span className="text-base text-gray-400 line-through">{formatPrice(product.price)}</span>
                <span className="text-success font-semibold text-sm">{product.discount}% off</span>
              </>
            )}
          </div>

          <p className={`text-sm font-medium mb-4 ${outOfStock ? 'text-danger' : 'text-success'}`}>
            {outOfStock ? 'Out of Stock' : product.stock <= 5 ? `Only ${product.stock} left in stock!` : 'In Stock'}
          </p>

          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{product.description}</p>

          {!outOfStock && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-2 hover:bg-muted" aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="px-4 text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="p-2 hover:bg-muted"
                  aria-label="Increase quantity"
                  disabled={quantity >= product.stock}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <button onClick={handleAddToCart} disabled={outOfStock} className="btn-accent flex-1 flex items-center justify-center gap-2">
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button
              onClick={handleWishlist}
              className={`btn-outline flex items-center justify-center gap-2 px-4 ${isInWishlist(product._id) ? 'text-danger border-danger' : ''}`}
            >
              <Heart size={18} fill={isInWishlist(product._id) ? '#ff6161' : 'none'} />
            </button>
          </div>
          {addMsg && <p className="text-sm text-success">{addMsg}</p>}

          {product.specifications?.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Specifications</h3>
              <table className="text-sm w-full">
                <tbody>
                  {product.specifications.map((spec, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 w-1/3">{spec.key}</td>
                      <td className="py-1.5 text-gray-700">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-10 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Rating Distribution</h3>
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs mb-1.5">
                <span className="w-8">{d.star}★</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full"
                    style={{ width: reviews.length ? `${(d.count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-right text-gray-500">{d.count}</span>
              </div>
            ))}
          </div>

          {user && (
            <div className="card p-4 mt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Write a Review</h3>
              {reviewError && <p className="text-danger text-xs mb-2">{reviewError}</p>}
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <label className="label-text">Your Rating</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                    className="input-field text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-text">Your Review</label>
                  <textarea
                    required
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    className="input-field text-sm"
                    rows={3}
                    placeholder="Share your experience..."
                  />
                </div>
                <button type="submit" disabled={submittingReview} className="btn-primary w-full text-sm">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-3">Customer Reviews ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r._id} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <RatingStars rating={r.rating} size={13} />
                      <span className="text-sm font-medium text-gray-800">{r.userName}</span>
                    </div>
                    {user?._id === r.user && (
                      <button onClick={() => handleDeleteReview(r._id)} className="text-gray-400 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{r.comment}</p>
                  <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Related Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;

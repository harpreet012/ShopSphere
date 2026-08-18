import { Link } from 'react-router-dom'; 
import { Heart } from 'lucide-react'; 
import RatingStars from '../common/RatingStars'; 
import { formatPrice, finalPrice } from '../../utils/format'; 
import { useAuth } from '../../context/AuthContext'; 
import { useWishlist } from '../../context/WishlistContext'; 
import { useNavigate } from 'react-router-dom'; 
 
const ProductCard = ({ product }) => { 
  const { user } = useAuth(); 
  const { isInWishlist, toggleWishlist } = useWishlist(); 
  const navigate = useNavigate(); 
  const price = finalPrice(product.price, product.discount); 
  const outOfStock = product.stock <= 0; 
 
  const handleWishlist = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    if (!user) { 
      navigate('/login'); 
      return; 
    } 
    toggleWishlist(product._id); 
  }; 
 
  return ( 
    <Link to={`/products/${product._id}`} className="card group relative flex flex-col p-3 h-full"> 
      <button 
        onClick={handleWishlist} 
        aria-label="Toggle wishlist" 
        className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1.5 shadow hover:scale-110 transition-transform" 
      > 
        <Heart 
          size={16} 
          className={isInWishlist?.(product._id) ? 'text-danger' : 'text-gray-400'} 
          fill={isInWishlist?.(product._id) ? '#ff6161' : 'none'} 
        /> 
      </button> 
 
      <div className="relative bg-gray-50 rounded overflow-hidden h-40 mb-3 flex items-center justify-center"> 
        <img 
          src={product.images?.[0] || '/product-placeholder.svg'} 
          alt={product.name} 
          className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300" 
          loading="lazy" 
          onError={(e) => { 
            e.currentTarget.onerror = null; 
            e.currentTarget.src = '/product-placeholder.svg'; 
          }} 
        /> 
        {outOfStock && ( 
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-semibold text-gray-600"> 
            Out of Stock 
          </span> 
        )} 
        {product.discount > 0 && !outOfStock && ( 
          <span className="absolute top-2 left-2 bg-success text-white text-[10px] font-bold px-1.5 py-0.5 rounded"> 
            {product.discount}% OFF 
          </span> 
        )} 
      </div> 
 
      <h3 className="text-sm text-gray-800 font-medium line-clamp-2 mb-1 min-h-[2.5rem]">{product.name}</h3> 
      <p className="text-xs text-gray-500 mb-1.5">{product.brand}</p> 
 
      {product.rating > 0 && ( 
        <div className="mb-1.5"> 
          <RatingStars rating={product.rating} showBadge count={product.numReviews} /> 
        </div> 
      )} 
 
      <div className="mt-auto flex items-baseline gap-2"> 
        <span className="text-base font-bold text-gray-900">{formatPrice(price)}</span> 
        {product.discount > 0 && ( 
          <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span> 
        )} 
      </div> 
    </Link> 
  ); 
}; 
 
export default ProductCard;
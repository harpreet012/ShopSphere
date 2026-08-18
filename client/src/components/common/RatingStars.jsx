import { Star } from 'lucide-react';

const RatingStars = ({ rating = 0, size = 14, showBadge = false, count }) => {
  if (showBadge) {
    return (
      <span className="inline-flex items-center gap-1 bg-success text-white text-xs font-medium px-1.5 py-0.5 rounded">
        {rating > 0 ? rating.toFixed(1) : 'New'} <Star size={10} fill="white" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'text-accent' : 'text-gray-300'}
          fill={star <= Math.round(rating) ? '#FF9F00' : 'none'}
        />
      ))}
      {count !== undefined && <span className="text-xs text-gray-500 ml-1">({count})</span>}
    </span>
  );
};

export default RatingStars;

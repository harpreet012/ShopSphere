import { CheckCircle, Circle } from 'lucide-react';
import { formatDateTime } from '../../utils/format';

const ALL_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

const OrderTracker = ({ order }) => {
  if (order.orderStatus === 'Cancelled') {
    return (
      <div className="bg-red-50 text-danger text-sm font-medium px-4 py-3 rounded">
        This order was cancelled.
      </div>
    );
  }

  const currentIdx = ALL_STATUSES.indexOf(order.orderStatus);

  return (
    <div className="flex flex-col">
      {ALL_STATUSES.map((status, idx) => {
        const done = idx <= currentIdx;
        const historyEntry = order.statusHistory?.find((h) => h.status === status);
        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              {done ? <CheckCircle size={20} className="text-success" /> : <Circle size={20} className="text-gray-300" />}
              {idx < ALL_STATUSES.length - 1 && <div className={`w-0.5 flex-1 min-h-[24px] ${idx < currentIdx ? 'bg-success' : 'bg-gray-200'}`} />}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>{status}</p>
              {historyEntry && <p className="text-xs text-gray-400">{formatDateTime(historyEntry.timestamp)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTracker;

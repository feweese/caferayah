import React from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

type OrderDeliveryMethod = 'DELIVERY' | 'PICKUP';
type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';

interface OrderStatusWorkflowProps {
  currentStatus: OrderStatus;
  deliveryMethod: OrderDeliveryMethod;
}

export function OrderStatusWorkflow({ currentStatus, deliveryMethod }: OrderStatusWorkflowProps) {
  // Define the workflow based on delivery method
  const workflowSteps = deliveryMethod === 'DELIVERY' 
    ? ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED']
    : ['RECEIVED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];
  
  // Find the index of the current status in the workflow
  const currentIndex = workflowSteps.indexOf(currentStatus);
  
  return (
    <div className="my-6">
      <h3 className="text-sm font-medium mb-3">Order Status Workflow</h3>
      <div className="flex items-center flex-wrap">
        {workflowSteps.map((status, index) => {
          // Determine if this step is current, completed, or upcoming
          const isCurrent = status === currentStatus;
          const isCompleted = currentIndex > index;
          const isUpcoming = currentIndex < index;
          
          // Don't show upcoming steps if order is cancelled
          if (isUpcoming && currentStatus === 'CANCELLED') {
            return null;
          }
          
          return (
            <React.Fragment key={status}>
              {/* Status step */}
              <div 
                className={`
                  px-3 py-2 rounded-md text-sm font-medium flex items-center
                  ${isCurrent ? 'bg-blue-100 text-blue-800 border border-blue-300' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-800' : ''}
                  ${isUpcoming && !isCurrent ? 'bg-gray-100 text-gray-500' : ''}
                `}
              >
                {isCompleted && <Check className="w-4 h-4 mr-1" />}
                {formatStatusLabel(status)}
              </div>
              
              {/* Arrow between steps */}
              {index < workflowSteps.length - 1 && (
                <ArrowRight 
                  className={`
                    mx-2 w-4 h-4
                    ${isCompleted ? 'text-green-500' : 'text-gray-300'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
        
        {/* Show cancelled status separately if that's the current status */}
        {currentStatus === 'CANCELLED' && (
          <div className="ml-4 flex items-center">
            <X className="w-4 h-4 text-red-500 mr-1" />
            <span className="px-3 py-2 rounded-md text-sm font-medium bg-red-100 text-red-800">
              Cancelled
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>Orders must progress through each status in sequence. Cancellation is possible at any stage.</p>
      </div>
    </div>
  );
}

// Helper function to format status labels for display
function formatStatusLabel(status: string): string {
  switch (status) {
    case 'RECEIVED':
      return 'Received';
    case 'PREPARING':
      return 'Preparing';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'READY_FOR_PICKUP':
      return 'Ready for Pickup';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
  }
} 
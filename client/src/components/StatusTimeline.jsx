import React from 'react';
import { Check, XCircle, Clock, ChefHat, PackageCheck, HeartHandshake } from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận', desc: 'Đơn đã gửi, chờ tiệm duyệt', icon: Clock },
  { key: 'confirmed', label: 'Đã xác nhận', desc: 'Tiệm đã nhận đơn', icon: Check },
  { key: 'baking', label: 'Đang làm bánh', desc: 'Bếp đang nướng bánh', icon: ChefHat },
  { key: 'ready', label: 'Sẵn sàng nhận bánh', desc: 'Bánh đã đóng gói xong', icon: PackageCheck },
  { key: 'done', label: 'Hoàn thành', desc: 'Đã giao tới bạn', icon: HeartHandshake },
];

export default function StatusTimeline({ status = 'pending' }) {
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="timeline-cancelled-card">
        <div className="cancelled-badge">
          <XCircle size={24} />
          <span>Đơn hàng đã bị hủy</span>
        </div>
        <p className="cancelled-desc">
          Đơn hàng này hiện đã được hủy trên hệ thống. Nếu cần hỗ trợ đặt lại, bạn vui lòng liên hệ tiệm qua trang mạng xã hội nhé!
        </p>
      </div>
    );
  }

  const activeIndex = Math.max(
    0,
    TIMELINE_STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="timeline-card-wrapper">
      <div className="timeline-header">
        <span className="timeline-header-title">
          <Clock size={16} /> Tiến độ đơn hàng
        </span>
        <span className="timeline-header-badge">
          {TIMELINE_STEPS[activeIndex]?.label || 'Đang xử lý'}
        </span>
      </div>

      <div className="timeline-stepper">
        {TIMELINE_STEPS.map((stepItem, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isFuture = index > activeIndex;
          const hasNext = index < TIMELINE_STEPS.length - 1;
          const isConnectorCompleted = index < activeIndex;
          const StepIcon = stepItem.icon;

          return (
            <div
              key={stepItem.key}
              className={`timeline-col ${isCompleted ? 'is-completed' : ''} ${
                isCurrent ? 'is-current' : ''
              } ${isFuture ? 'is-future' : ''}`}
            >
              {/* Connector line to the next node (center to center) */}
              {hasNext && (
                <div
                  className={`timeline-connector ${
                    isConnectorCompleted ? 'connector-filled' : ''
                  }`}
                />
              )}

              {/* Step Node */}
              <div className="timeline-node">
                {isCompleted ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  <StepIcon size={20} strokeWidth={isCurrent ? 2.5 : 2} />
                )}
              </div>

              {/* Step Text Info */}
              <div className="timeline-info">
                <div className="timeline-title">{stepItem.label}</div>
                {isCurrent ? (
                  <div className="timeline-badge-now">Đang xử lý</div>
                ) : (
                  <div className="timeline-desc">{stepItem.desc}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

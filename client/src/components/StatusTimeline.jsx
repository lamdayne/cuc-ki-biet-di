import React from 'react';
import { Check, XCircle, Clock, ChefHat, PackageCheck, HeartHandshake } from 'lucide-react';
import { ORDER_STATUS_MAP } from '../utils/formatters';

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận', icon: Clock },
  { key: 'confirmed', label: 'Đã xác nhận', icon: Check },
  { key: 'baking', label: 'Đang làm bánh', icon: ChefHat },
  { key: 'ready', label: 'Sẵn sàng nhận bánh', icon: PackageCheck },
  { key: 'done', label: 'Hoàn thành', icon: HeartHandshake },
];

export default function StatusTimeline({ status = 'pending' }) {
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <div className="cancelled-badge">
          <XCircle size={22} />
          <span>Đơn hàng đã bị hủy</span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '10px', fontSize: '0.92rem' }}>
          Đơn hàng này đã được hủy trên hệ thống. Nếu có thắc mắc, bạn vui lòng liên hệ tiệm qua mạng xã hội nhé.
        </p>
      </div>
    );
  }

  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.key === status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const progressPercent = (activeIndex / (TIMELINE_STEPS.length - 1)) * 100;

  return (
    <div style={{ margin: '36px 0 24px 0' }}>
      <div className="timeline-container">
        <div className="timeline-line-bg" />
        <div
          className="timeline-line-progress"
          style={{ width: `calc(${progressPercent}% * 0.85)` }}
        />

        {TIMELINE_STEPS.map((stepItem, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const StepIcon = stepItem.icon;

          let stepClass = '';
          if (isCompleted) stepClass = 'completed';
          if (isCurrent) stepClass = 'current';

          return (
            <div key={stepItem.key} className={`timeline-step ${stepClass}`}>
              <div className="step-node">
                {isCompleted ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <StepIcon size={18} />
                )}
              </div>
              <span className="step-label">{stepItem.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

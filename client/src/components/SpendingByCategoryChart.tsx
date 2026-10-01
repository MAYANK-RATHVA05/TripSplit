import React, { useState } from 'react';
import { formatCurrencyAmount } from '../lib/currencies.js';
import { Utensils, Car, Hotel, Compass, Dumbbell, ShoppingCart, ShoppingBag, Film, Zap, MoreHorizontal } from 'lucide-react';

export interface CategorySpendingItem {
  category: string;
  amountDecimal: string;
  amountNumber: number;
  percentage: number;
  count: number;
}

interface Props {
  data: CategorySpendingItem[];
  totalSpendDecimal: string;
  baseCurrency: string;
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Drink': '#F59E0B',
  'Transportation': '#3B82F6',
  'Accommodation': '#8B5CF6',
  'Sightseeing': '#EC4899',
  'Activities': '#10B981',
  'Groceries': '#14B8A6',
  'Shopping': '#F97316',
  'Entertainment': '#6366F1',
  'Utilities': '#64748B',
  'Other': '#94A3B8'
};

export function getCategoryIcon(cat: string, size = 16) {
  switch (cat) {
    case 'Food & Drink': return <Utensils size={size} />;
    case 'Transportation': return <Car size={size} />;
    case 'Accommodation': return <Hotel size={size} />;
    case 'Sightseeing': return <Compass size={size} />;
    case 'Activities': return <Dumbbell size={size} />;
    case 'Groceries': return <ShoppingCart size={size} />;
    case 'Shopping': return <ShoppingBag size={size} />;
    case 'Entertainment': return <Film size={size} />;
    case 'Utilities': return <Zap size={size} />;
    default: return <MoreHorizontal size={size} />;
  }
}

export const SpendingByCategoryChart: React.FC<Props> = ({
  data,
  totalSpendDecimal,
  baseCurrency,
  onSelectCategory,
  selectedCategory
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-muted">No categorized expenses yet.</p>
      </div>
    );
  }

  // Calculate SVG donut segments
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = data.map((item, idx) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    const color = CATEGORY_COLORS[item.category] || '#64748B';

    return {
      ...item,
      color,
      strokeDasharray,
      strokeDashoffset,
      idx
    };
  });

  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 className="font-bold text-lg">Spending by Category</h3>
        <p className="text-sm text-muted">Category breakdown in {baseCurrency}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        {/* SVG Donut Chart */}
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--bg-subtle)"
              strokeWidth={strokeWidth}
            />
            {segments.map(seg => (
              <circle
                key={seg.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={hoveredIdx === seg.idx ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== seg.category ? 0.35 : 1
                }}
                onMouseEnter={() => setHoveredIdx(seg.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectCategory && onSelectCategory(seg.category)}
              />
            ))}
          </svg>

          {/* Center Text */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              padding: '0.5rem'
            }}
          >
            {activeItem ? (
              <>
                <span className="text-xs font-semibold" style={{ color: CATEGORY_COLORS[activeItem.category] }}>
                  {activeItem.category}
                </span>
                <span className="text-sm font-bold tabular">
                  {formatCurrencyAmount(activeItem.amountDecimal, baseCurrency)}
                </span>
                <span className="text-xs text-muted">{activeItem.percentage.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <span className="text-xs text-muted">Total Spent</span>
                <span className="text-sm font-bold tabular">
                  {formatCurrencyAmount(totalSpendDecimal, baseCurrency)}
                </span>
                <span className="text-xs text-dim">{data.length} categories</span>
              </>
            )}
          </div>
        </div>

        {/* Category Legend */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {data.map((item, idx) => {
            const color = CATEGORY_COLORS[item.category] || '#64748B';
            const isSelected = selectedCategory === item.category;

            return (
              <div
                key={item.category}
                onClick={() => onSelectCategory && onSelectCategory(isSelected ? 'ALL' : item.category)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : hoveredIdx === idx ? 'var(--bg-subtle)' : 'transparent',
                  cursor: onSelectCategory ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: `${color}15`,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {getCategoryIcon(item.category, 14)}
                  </div>
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="text-xs text-dim">({item.count})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="text-sm font-semibold tabular">
                    {formatCurrencyAmount(item.amountDecimal, baseCurrency)}
                  </span>
                  <span className="text-xs text-muted tabular" style={{ minWidth: 42, textAlign: 'right' }}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

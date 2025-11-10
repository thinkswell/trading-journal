import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isPositive, icon }) => {
  const valueColor = isPositive === undefined ? 'text-white' : isPositive ? 'text-[#28A745]' : 'text-[#DC3545]';
  const glowColor = isPositive === undefined ? '' : isPositive ? 'hover:shadow-[#28A745]/5' : 'hover:shadow-[#DC3545]/5';
  
  return (
    <div className={`glass-card p-6 rounded-xl shadow-sm flex flex-col justify-between 
                    hover:scale-[1.02] hover:shadow-md ${glowColor} 
                    transition-all duration-300 cursor-default group`}>
      <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-3 group-hover:text-[#E0E0E0] transition-colors">
        <span className="text-[#A0A0A0] group-hover:text-[#6A5ACD] transition-colors">{icon}</span>
        {title}
      </h3>
      <p className={`text-4xl font-extrabold ${valueColor} leading-tight tracking-tight`}>{value}</p>
    </div>
  );
};

export default StatCard;
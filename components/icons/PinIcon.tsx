import React from 'react';
import { FiAnchor } from 'react-icons/fi';

interface PinIconProps {
  className?: string;
}

export const PinIcon: React.FC<PinIconProps> = ({ className }) => {
  const iconClassName = className || "w-5 h-5";
  // @ts-ignore - react-icons className prop works at runtime
  return <FiAnchor className={iconClassName} />;
};


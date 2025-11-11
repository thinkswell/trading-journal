import React from 'react';
import { FiExternalLink } from 'react-icons/fi';

interface ExternalLinkIconProps {
  className?: string;
}

export const ExternalLinkIcon: React.FC<ExternalLinkIconProps> = ({ className }) => {
  const iconClassName = className || "w-5 h-5";
  // @ts-ignore - react-icons className prop works at runtime
  return <FiExternalLink className={iconClassName} />;
};


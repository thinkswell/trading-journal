import React from 'react';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface ToolsPageProps {
  navigateTo: (view: string) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ navigateTo }) => {
  const tools = [
    {
      id: 'quantity-calculator',
      name: 'Quantity Calculator',
      description: 'Calculate trade allocation and risk based on capital, entry price, and stop loss',
      icon: <CalculatorIcon />
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Tools</h1>
        <p className="text-[#A0A0A0]">Select a tool to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => navigateTo(`tools/${tool.id}`)}
            className="glass-card p-6 rounded-xl shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-[rgba(106,90,205,0.3)] border border-[rgba(255,255,255,0.1)] group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="text-[#6A5ACD] group-hover:text-[#8b5cf6] transition-colors">
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#E0E0E0] transition-colors">
                {tool.name}
              </h3>
            </div>
            <p className="text-sm text-[#A0A0A0] group-hover:text-[#E0E0E0] transition-colors">
              {tool.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;


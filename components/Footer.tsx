import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="hidden md:block fixed bottom-0 right-0 px-4 py-1 z-30">
      <p className="text-xs text-[#A0A0A0] font-poppins" style={{ fontFamily: 'Poppins, sans-serif' }}>
        Prompted with ❤️ by{' '}
        <a
          href="https://www.linkedin.com/in/-krishnavishwakarma"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6A5ACD] hover:text-[#8b5cf6] hover:underline transition-colors duration-200"
        >
          Krishna
        </a>
      </p>
    </footer>
  );
};

export default Footer;


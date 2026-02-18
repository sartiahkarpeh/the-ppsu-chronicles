'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookText, Menu, X } from 'lucide-react';
import { HeaderContent } from './Header';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/stories', label: 'Stories' },
  { href: '/media', label: 'Media' },
  { href: '/events', label: 'Events' },
  { href: '/student-voice', label: 'Student Voice' },
  { href: '/diaries', label: 'Diaries' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <BookText className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-text-primary">PPSU Chronicles</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-text-primary hover:text-primary transition-colors font-medium">
                {link.label}
              </Link>
            ))}
            <Link href="#" className="bg-primary text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors text-sm font-semibold">
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] md:hidden" onClick={() => setIsOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-80 max-w-[85%] bg-white shadow-xl md:hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center space-x-2">
                <BookText className="w-7 h-7 text-primary" />
                <span className="text-lg font-bold text-text-primary">PPSU Chronicles</span>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Close menu">
                <X size={24} />
              </button>
            </div>
            <div className="px-4 py-3 border-b">
              <HeaderContent />
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="block text-text-primary hover:text-primary transition-colors py-2 px-4 rounded-md font-medium">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t">
              <Link href="#" className="block w-full text-center bg-primary text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors mt-2 font-semibold">
                Login
              </Link>
            </div>
          </aside>
        </>
      )}
    </nav>
  );
}


